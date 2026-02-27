"""
CLARA — AI Alert Agent (Python / Server-Side)
Background service that continuously monitors portfolio positions
against their computed price targets and fires email alerts.

Features:
  - Async polling loop (configurable interval)
  - 4-hour cooldown per symbol × alert type (no spam)
  - SendGrid + SMTP email delivery
  - Full audit log of every alert fired
  - Thread-safe position registry
"""

import asyncio
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from config import settings
from models.schemas import AlertConfig, AlertLogEntry, AlertType, InAppAlert, AlertSeverity
from services.email_service import send_alert_email
from services.stock_data import get_quotes_batch

logger = logging.getLogger("CLARA.alert_agent")


def _severity(alert_type: AlertType) -> AlertSeverity:
    return {
        AlertType.STOP_LOSS_HIT:     AlertSeverity.CRITICAL,
        AlertType.TRAILING_STOP_HIT: AlertSeverity.WARNING,
        AlertType.SELL_TARGET_HIT:   AlertSeverity.SUCCESS,
        AlertType.BULL_TARGET_HIT:   AlertSeverity.SUCCESS,
        AlertType.DAILY_SUMMARY:     AlertSeverity.INFO,
    }.get(alert_type, AlertSeverity.INFO)


def _message(alert_type: AlertType, symbol: str, price: float) -> str:
    p = f"${price:.2f}"
    return {
        AlertType.SELL_TARGET_HIT:   f"{symbol} reached its sell target at {p}. Consider taking profits.",
        AlertType.STOP_LOSS_HIT:     f"{symbol} breached stop loss at {p}. Review immediately.",
        AlertType.TRAILING_STOP_HIT: f"{symbol} hit trailing stop at {p}. Consider reducing exposure.",
        AlertType.BULL_TARGET_HIT:   f"{symbol} reached bull case target at {p}. Excellent — take profits?",
        AlertType.DAILY_SUMMARY:     "Daily portfolio summary generated.",
    }.get(alert_type, f"{symbol} price alert at {p}")


class AlertAgent:
    """
    Singleton background service that:
    1. Maintains a registry of monitored positions
    2. Polls live prices every N seconds
    3. Fires alerts when price targets are crossed
    4. Sends emails via the email service
    5. Enforces per-symbol cooldowns
    """

    def __init__(self) -> None:
        self.config: AlertConfig        = AlertConfig()
        self.holdings: List[Dict[str, Any]] = []
        self.in_app_alerts: List[InAppAlert] = []
        self.email_logs: List[AlertLogEntry]  = []

        # Cooldown registry: (symbol, alert_type) → datetime of last send
        self._cooldowns: Dict[tuple, datetime] = {}

        # Stats
        self._start_time: float = time.monotonic()
        self.alerts_today: int  = 0
        self._running: bool     = False
        self.status: str        = "idle"

    # ── Properties ───────────────────────────────────────────────────────────

    @property
    def uptime_seconds(self) -> float:
        return round(time.monotonic() - self._start_time, 1)

    # ── Configuration ─────────────────────────────────────────────────────────

    def update_config(self, updates: Dict[str, Any]) -> AlertConfig:
        for key, val in updates.items():
            if hasattr(self.config, key) and val is not None:
                setattr(self.config, key, val)
        logger.info("Alert config updated: %s", updates)
        return self.config

    def register_holdings(self, holdings: List[Dict[str, Any]]) -> None:
        """Register the current portfolio positions for monitoring."""
        self.holdings = holdings
        logger.debug("Alert agent registered %d positions", len(holdings))

    # ── Cooldown ──────────────────────────────────────────────────────────────

    def _can_send(self, symbol: str, alert_type: AlertType) -> bool:
        key      = (symbol, alert_type)
        last_sent = self._cooldowns.get(key)
        if last_sent is None:
            return True
        cooldown_hours = settings.ALERT_COOLDOWN_HOURS
        return datetime.utcnow() - last_sent > timedelta(hours=cooldown_hours)

    def _mark_sent(self, symbol: str, alert_type: AlertType) -> None:
        self._cooldowns[(symbol, alert_type)] = datetime.utcnow()

    def reset_cooldown(self, symbol: str, alert_type: AlertType) -> None:
        self._cooldowns.pop((symbol, alert_type), None)
        logger.info("Cooldown reset for %s %s", symbol, alert_type)

    # ── Fire Alert ────────────────────────────────────────────────────────────

    async def _fire_alert(
        self,
        alert_type: AlertType,
        holding: Dict[str, Any],
        trigger_price: float,
        total_portfolio_value: float,
    ) -> None:
        symbol  = holding["symbol"]
        company = holding.get("company", symbol)
        price   = holding.get("current_price", trigger_price)

        if not self._can_send(symbol, alert_type):
            return
        self._mark_sent(symbol, alert_type)

        # In-app notification
        alert = InAppAlert(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            alert_type=alert_type,
            symbol=symbol,
            company=company,
            message=_message(alert_type, symbol, trigger_price),
            trigger_price=trigger_price,
            current_price=price,
            severity=_severity(alert_type),
            acknowledged=False,
            email_sent=False,
        )
        self.in_app_alerts.insert(0, alert)
        self.in_app_alerts = self.in_app_alerts[:200]  # cap at 200
        self.alerts_today += 1
        logger.info("Alert fired: %s %s @ $%.2f", symbol, alert_type, trigger_price)

        # Email
        if self.config.enabled and self.config.user_email:
            log = await send_alert_email(
                to_email=self.config.user_email,
                alert_type=alert_type,
                symbol=symbol,
                company=company,
                trigger_price=trigger_price,
                current_price=price,
                avg_cost=holding.get("avg_cost", 0),
                shares=holding.get("shares", 0),
                gain_loss=holding.get("gain_loss", 0),
                gain_loss_pct=holding.get("gain_loss_pct", 0),
                portfolio_value=total_portfolio_value,
                action_message=_message(alert_type, symbol, trigger_price),
            )
            self.email_logs.insert(0, log)
            self.email_logs = self.email_logs[:500]

            # Update in-app alert with email status
            for a in self.in_app_alerts:
                if a.id == alert.id:
                    a.email_sent = log.sent
                    break

    # ── Check Loop ────────────────────────────────────────────────────────────

    async def _check_once(self) -> None:
        """Fetch live prices and check all holdings against targets."""
        if not self.holdings:
            return

        symbols = [h["symbol"] for h in self.holdings]
        try:
            quotes = await get_quotes_batch(symbols)
        except Exception as exc:
            logger.error("Alert agent price fetch failed: %s", exc)
            return

        total_value = sum(h.get("market_value", 0) for h in self.holdings)

        for holding in self.holdings:
            sym   = holding["symbol"]
            quote = quotes.get(sym, {})
            price = quote.get("price", holding.get("current_price", 0))

            # Update holding with fresh price
            holding["current_price"] = price

            # Check thresholds
            cfg = self.config
            if cfg.alert_on_sell_target and price >= holding.get("sell_target", float("inf")):
                await self._fire_alert(AlertType.SELL_TARGET_HIT, holding, holding["sell_target"], total_value)

            if cfg.alert_on_stop_loss and price <= holding.get("stop_loss", 0):
                await self._fire_alert(AlertType.STOP_LOSS_HIT, holding, holding["stop_loss"], total_value)

            if cfg.alert_on_trailing_stop and price <= holding.get("trailing_stop", 0):
                await self._fire_alert(AlertType.TRAILING_STOP_HIT, holding, holding["trailing_stop"], total_value)

            if cfg.alert_on_bull_target and price >= holding.get("bull_target", float("inf")):
                await self._fire_alert(AlertType.BULL_TARGET_HIT, holding, holding["bull_target"], total_value)

    # ── Background Loop ───────────────────────────────────────────────────────

    async def run_monitoring_loop(self) -> None:
        """Infinite polling loop — run as asyncio background task."""
        self._running = True
        self.status   = "running"
        logger.info("Alert agent started. Interval: %ds", settings.ALERT_CHECK_INTERVAL_SECONDS)

        while self._running:
            if self.config.enabled and self.holdings:
                self.status = "running"
                try:
                    await self._check_once()
                except Exception as exc:
                    logger.error("Alert check failed: %s", exc)
            else:
                self.status = "paused"

            await asyncio.sleep(self.config.check_interval_seconds or settings.ALERT_CHECK_INTERVAL_SECONDS)

    def stop(self) -> None:
        self._running = False
        self.status   = "stopped"

    # ── Alert Management ──────────────────────────────────────────────────────

    def acknowledge_alert(self, alert_id: str) -> bool:
        for a in self.in_app_alerts:
            if a.id == alert_id:
                a.acknowledged = True
                return True
        return False

    def clear_all_alerts(self) -> None:
        self.in_app_alerts.clear()

    async def send_test_alert(self, symbol: str, alert_type: AlertType) -> Optional[InAppAlert]:
        """Manually trigger a test alert for a given symbol."""
        holding = next((h for h in self.holdings if h["symbol"] == symbol), None)
        if not holding:
            return None
        total_value = sum(h.get("market_value", 0) for h in self.holdings)
        self.reset_cooldown(symbol, alert_type)
        await self._fire_alert(alert_type, holding, holding.get("sell_target", 100.0), total_value)
        return self.in_app_alerts[0] if self.in_app_alerts else None


# ── Singleton ──────────────────────────────────────────────────────────────────
alert_agent = AlertAgent()
