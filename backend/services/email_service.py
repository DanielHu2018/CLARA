"""
CLARA — Email Alert Service (Python / Server-Side)
Sends alert emails using SendGrid (primary) or SMTP (fallback).

Priority:
  1. SendGrid API   (if SENDGRID_API_KEY configured)
  2. SMTP           (if SMTP_USERNAME + SMTP_PASSWORD configured)
  3. Log only       (no email sent, just logged)

Templates are rendered as HTML with a professional dark-themed design.
"""

import logging
import smtplib
import uuid
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional, Tuple

from config import settings
from models.schemas import AlertLogEntry, AlertType

logger = logging.getLogger("CLARA.email")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sendgrid_configured() -> bool:
    k = settings.SENDGRID_API_KEY
    return bool(k) and k != "your_sendgrid_key_here"


def _smtp_configured() -> bool:
    return (
        bool(settings.SMTP_USERNAME)
        and bool(settings.SMTP_PASSWORD)
        and settings.SMTP_USERNAME != "your_email@gmail.com"
    )


def _alert_subject(alert_type: AlertType, symbol: str) -> str:
    labels = {
        AlertType.SELL_TARGET_HIT:   f"🎯 CLARA Alert: {symbol} Reached Sell Target",
        AlertType.STOP_LOSS_HIT:     f"🛑 CLARA CRITICAL: {symbol} Stop Loss Triggered",
        AlertType.TRAILING_STOP_HIT: f"⚠️ CLARA Alert: {symbol} Trailing Stop Hit",
        AlertType.BULL_TARGET_HIT:   f"🚀 CLARA Alert: {symbol} Bull Target Reached",
        AlertType.DAILY_SUMMARY:     f"📊 CLARA Daily Portfolio Summary",
    }
    return labels.get(alert_type, f"CLARA Alert: {symbol}")


def _alert_color(alert_type: AlertType) -> str:
    colors = {
        AlertType.SELL_TARGET_HIT:   "#f59e0b",
        AlertType.STOP_LOSS_HIT:     "#ef4444",
        AlertType.TRAILING_STOP_HIT: "#f97316",
        AlertType.BULL_TARGET_HIT:   "#10b981",
        AlertType.DAILY_SUMMARY:     "#3b82f6",
    }
    return colors.get(alert_type, "#6366f1")


def _build_html_email(
    alert_type: AlertType,
    symbol: str,
    company: str,
    trigger_price: float,
    current_price: float,
    avg_cost: float,
    shares: float,
    gain_loss: float,
    gain_loss_pct: float,
    portfolio_value: float,
    action_message: str,
) -> str:
    """Build a professional HTML email body."""

    color        = _alert_color(alert_type)
    gain_color   = "#10b981" if gain_loss >= 0 else "#ef4444"
    gain_sign    = "+" if gain_loss >= 0 else ""
    market_value = shares * current_price

    type_labels = {
        AlertType.SELL_TARGET_HIT:   "Sell Target Reached",
        AlertType.STOP_LOSS_HIT:     "Stop Loss Triggered",
        AlertType.TRAILING_STOP_HIT: "Trailing Stop Hit",
        AlertType.BULL_TARGET_HIT:   "Bull Target Reached",
        AlertType.DAILY_SUMMARY:     "Daily Summary",
    }
    type_label = type_labels.get(alert_type, "Price Alert")
    ts = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CLARA Alert</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

          <!-- Header -->
          <tr>
            <td style="background:{color};padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:2px;text-transform:uppercase;">CLARA — Clairvoyant Loss Avoidance & Risk Advisor</p>
                    <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">{type_label}</h1>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.15);border-radius:50%;width:48px;height:48px;display:inline-block;text-align:center;line-height:48px;font-size:24px;">📊</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stock Banner -->
          <tr>
            <td style="padding:24px 32px 0;background:#0f172a;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;padding:20px;border:1px solid {color}33;">
                <tr>
                  <td>
                    <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Position</p>
                    <h2 style="margin:4px 0;color:#f1f5f9;font-size:28px;font-weight:800;">{symbol}</h2>
                    <p style="margin:0;color:#64748b;font-size:14px;">{company}</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Current Price</p>
                    <h2 style="margin:4px 0;color:#f1f5f9;font-size:28px;font-weight:800;">${current_price:.2f}</h2>
                    <p style="margin:0;color:{color};font-size:13px;font-weight:600;">Trigger: ${trigger_price:.2f}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metrics Grid -->
          <tr>
            <td style="padding:16px 32px 0;background:#0f172a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155;">
                      <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Shares Held</p>
                      <p style="margin:4px 0 0;color:#f1f5f9;font-size:20px;font-weight:700;">{shares:,.4f}</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155;">
                      <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Avg Cost</p>
                      <p style="margin:4px 0 0;color:#f1f5f9;font-size:20px;font-weight:700;">${avg_cost:.2f}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-right:8px;padding-top:12px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155;">
                      <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Market Value</p>
                      <p style="margin:4px 0 0;color:#f1f5f9;font-size:20px;font-weight:700;">${market_value:,.2f}</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:8px;padding-top:12px;">
                    <div style="background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155;">
                      <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Unrealized P&L</p>
                      <p style="margin:4px 0 0;color:{gain_color};font-size:20px;font-weight:700;">{gain_sign}${gain_loss:,.2f} ({gain_sign}{gain_loss_pct:.1f}%)</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Box -->
          <tr>
            <td style="padding:16px 32px 0;background:#0f172a;">
              <div style="background:{color}1a;border-radius:10px;padding:20px;border:1px solid {color}44;">
                <p style="margin:0;color:{color};font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">CLARA Recommendation</p>
                <p style="margin:8px 0 0;color:#f1f5f9;font-size:15px;line-height:1.6;">{action_message}</p>
              </div>
            </td>
          </tr>

          <!-- Portfolio Value -->
          <tr>
            <td style="padding:16px 32px 0;background:#0f172a;">
              <div style="background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Total Portfolio Value</p>
                <p style="margin:4px 0 0;color:#f1f5f9;font-size:22px;font-weight:700;">${portfolio_value:,.2f}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#0f172a;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;">Generated by CLARA Alert Agent • {ts}</p>
              <p style="margin:8px 0 0;color:#475569;font-size:11px;">This is an automated alert. Not financial advice. Past performance is not indicative of future results.</p>
              <p style="margin:8px 0 0;">
                <a href="#" style="color:#6366f1;font-size:11px;text-decoration:none;">Manage Alert Settings</a>
                &nbsp;•&nbsp;
                <a href="#" style="color:#6366f1;font-size:11px;text-decoration:none;">View Portfolio Dashboard</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()


# ══════════════════════════════════════════════════════════════════════════════
# SEND VIA SENDGRID
# ══════════════════════════════════════════════════════════════════════════════

async def _send_sendgrid(
    to_email: str,
    subject: str,
    html_body: str,
) -> Tuple[bool, Optional[str]]:
    """Send email via SendGrid API."""
    try:
        import httpx
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {
                "email": settings.SENDGRID_FROM_EMAIL,
                "name":  settings.SENDGRID_FROM_NAME,
            },
            "subject": subject,
            "content": [{"type": "text/html", "value": html_body}],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code in (200, 202):
                logger.info("Email sent via SendGrid to %s", to_email)
                return True, None
            else:
                err = f"SendGrid HTTP {resp.status_code}: {resp.text[:200]}"
                logger.error(err)
                return False, err
    except Exception as exc:
        err = f"SendGrid exception: {exc}"
        logger.error(err)
        return False, err


# ══════════════════════════════════════════════════════════════════════════════
# SEND VIA SMTP
# ══════════════════════════════════════════════════════════════════════════════

def _send_smtp_sync(
    to_email: str,
    subject: str,
    html_body: str,
) -> Tuple[bool, Optional[str]]:
    """Send email via SMTP (synchronous — run in thread executor)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.SENDGRID_FROM_NAME} <{settings.SMTP_USERNAME}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        if settings.SMTP_USE_TLS:
            server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USERNAME, to_email, msg.as_string())
        server.quit()
        logger.info("Email sent via SMTP to %s", to_email)
        return True, None
    except Exception as exc:
        err = f"SMTP error: {exc}"
        logger.error(err)
        return False, err


import asyncio

async def _send_smtp(to_email: str, subject: str, html_body: str) -> Tuple[bool, Optional[str]]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _send_smtp_sync, to_email, subject, html_body)


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

async def send_alert_email(
    to_email: str,
    alert_type: AlertType,
    symbol: str,
    company: str,
    trigger_price: float,
    current_price: float,
    avg_cost: float,
    shares: float,
    gain_loss: float,
    gain_loss_pct: float,
    portfolio_value: float,
    action_message: str,
) -> AlertLogEntry:
    """
    Send an alert email using the best available provider.
    Returns an AlertLogEntry regardless of success/failure.
    """
    log_id   = str(uuid.uuid4())
    subject  = _alert_subject(alert_type, symbol)
    html     = _build_html_email(
        alert_type, symbol, company, trigger_price, current_price,
        avg_cost, shares, gain_loss, gain_loss_pct, portfolio_value, action_message,
    )

    sent          = False
    error_msg: Optional[str] = None
    provider_used = "none"

    if _sendgrid_configured():
        sent, error_msg = await _send_sendgrid(to_email, subject, html)
        provider_used = "sendgrid"

    if not sent and _smtp_configured():
        sent, error_msg = await _send_smtp(to_email, subject, html)
        provider_used = "smtp"

    if not sent:
        if not error_msg:
            error_msg = "No email provider configured. Add SENDGRID_API_KEY or SMTP credentials to .env"
        logger.warning("Email not sent for %s %s: %s", symbol, alert_type, error_msg)

    return AlertLogEntry(
        id=log_id,
        timestamp=datetime.utcnow(),
        alert_type=alert_type,
        symbol=symbol,
        to_email=to_email,
        trigger_price=trigger_price,
        current_price=current_price,
        sent=sent,
        error=error_msg,
        provider_used=provider_used,
    )
