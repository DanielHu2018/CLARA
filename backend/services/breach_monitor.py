"""
Clara — Breach Monitoring System
Real-time detection and tracking of risk limit breaches.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
import hashlib

from models.schemas import (
    BreachThreshold,
    BreachEvent,
    BreachMonitorConfig,
    BreachHistory,
    PortfolioSummary
)

logger = logging.getLogger(__name__)


class BreachMonitor:
    """
    Monitors portfolio risk metrics against configured thresholds.
    
    Tracks:
    - VaR breaches (95%, 99%)
    - ES breaches
    - Position concentration limits
    - Drawdown limits
    """
    
    def __init__(self):
        # In-memory storage (in production, use database)
        self._configs: Dict[str, BreachMonitorConfig] = {}
        self._breach_history: Dict[str, List[BreachEvent]] = {}
        self._last_check: Dict[str, datetime] = {}
    
    def configure_monitoring(
        self,
        portfolio_id: str,
        thresholds: List[BreachThreshold],
        notification_enabled: bool = True,
        notification_emails: List[str] = None
    ) -> BreachMonitorConfig:
        """
        Configure breach monitoring for a portfolio.
        
        Args:
            portfolio_id: Portfolio identifier
            thresholds: List of breach thresholds
            notification_enabled: Enable email notifications
            notification_emails: List of email addresses for notifications
            
        Returns:
            BreachMonitorConfig
        """
        config = BreachMonitorConfig(
            portfolio_id=portfolio_id,
            thresholds=thresholds,
            notification_enabled=notification_enabled,
            notification_emails=notification_emails or []
        )
        
        self._configs[portfolio_id] = config
        
        if portfolio_id not in self._breach_history:
            self._breach_history[portfolio_id] = []
        
        logger.info(f"Configured breach monitoring for portfolio {portfolio_id} with {len(thresholds)} thresholds")
        
        return config
    
    def get_config(self, portfolio_id: str) -> Optional[BreachMonitorConfig]:
        """Get breach monitoring configuration for a portfolio"""
        return self._configs.get(portfolio_id)
    
    def update_threshold(
        self,
        portfolio_id: str,
        metric: str,
        new_threshold: float,
        enabled: bool = True
    ):
        """Update a specific threshold"""
        config = self._configs.get(portfolio_id)
        if not config:
            raise ValueError(f"No configuration found for portfolio {portfolio_id}")
        
        # Find and update threshold
        for threshold in config.thresholds:
            if threshold.metric == metric:
                threshold.threshold = new_threshold
                threshold.enabled = enabled
                logger.info(f"Updated {metric} threshold to {new_threshold} for portfolio {portfolio_id}")
                return
        
        # If not found, add new threshold
        config.thresholds.append(BreachThreshold(
            metric=metric,
            threshold=new_threshold,
            enabled=enabled
        ))
        logger.info(f"Added new {metric} threshold: {new_threshold} for portfolio {portfolio_id}")
    
    async def check_breaches(
        self,
        portfolio_id: str,
        portfolio_summary: PortfolioSummary
    ) -> List[BreachEvent]:
        """
        Check for breaches against configured thresholds.
        
        Args:
            portfolio_id: Portfolio identifier
            portfolio_summary: Current portfolio summary with risk metrics
            
        Returns:
            List of BreachEvent objects (empty if no breaches)
        """
        config = self._configs.get(portfolio_id)
        if not config:
            logger.warning(f"No breach monitoring configured for portfolio {portfolio_id}")
            return []
        
        breaches = []
        current_time = datetime.utcnow()
        
        # Extract metrics from portfolio summary
        metrics = self._extract_metrics(portfolio_summary)
        
        # Check each threshold
        for threshold in config.thresholds:
            if not threshold.enabled:
                continue
            
            metric_value = metrics.get(threshold.metric)
            if metric_value is None:
                logger.warning(f"Metric {threshold.metric} not found in portfolio summary")
                continue
            
            # Check if threshold is breached
            if metric_value > threshold.threshold:
                severity = self._calculate_severity(metric_value, threshold.threshold)
                
                # Create breach event
                breach_id = hashlib.md5(
                    f"{portfolio_id}_{threshold.metric}_{current_time.isoformat()}".encode()
                ).hexdigest()[:16]
                
                breach = BreachEvent(
                    breach_id=breach_id,
                    portfolio_id=portfolio_id,
                    timestamp=current_time,
                    metric=threshold.metric,
                    threshold=threshold.threshold,
                    actual_value=metric_value,
                    severity=severity,
                    acknowledged=False
                )
                
                breaches.append(breach)
                
                # Add to history
                self._breach_history[portfolio_id].append(breach)
                
                logger.warning(
                    f"BREACH DETECTED: {threshold.metric} = {metric_value:.2f} "
                    f"exceeds threshold {threshold.threshold:.2f} for portfolio {portfolio_id}"
                )
        
        # Update last check time
        self._last_check[portfolio_id] = current_time
        
        # Send notifications if enabled
        if breaches and config.notification_enabled:
            await self._send_breach_notifications(config, breaches)
        
        return breaches
    
    def _extract_metrics(self, portfolio_summary: PortfolioSummary) -> Dict[str, float]:
        """Extract risk metrics from portfolio summary"""
        metrics = {}
        
        # VaR metrics
        if hasattr(portfolio_summary, 'var_1d_95'):
            metrics['var_95'] = portfolio_summary.var_1d_95
        if hasattr(portfolio_summary, 'var_1d_99'):
            metrics['var_99'] = portfolio_summary.var_1d_99
        if hasattr(portfolio_summary, 'var_10d_95'):
            metrics['var_10d_95'] = portfolio_summary.var_10d_95
        if hasattr(portfolio_summary, 'var_10d_99'):
            metrics['var_10d_99'] = portfolio_summary.var_10d_99
        
        # ES metrics
        if hasattr(portfolio_summary, 'expected_shortfall_95'):
            metrics['es_95'] = portfolio_summary.expected_shortfall_95
        if hasattr(portfolio_summary, 'expected_shortfall_99'):
            metrics['es_99'] = portfolio_summary.expected_shortfall_99
        
        # Portfolio metrics
        if hasattr(portfolio_summary, 'total_value'):
            metrics['total_value'] = portfolio_summary.total_value
        if hasattr(portfolio_summary, 'total_unrealized_pnl'):
            metrics['unrealized_pnl'] = abs(portfolio_summary.total_unrealized_pnl)
        
        # Drawdown
        if hasattr(portfolio_summary, 'total_gain_loss_pct'):
            if portfolio_summary.total_gain_loss_pct < 0:
                metrics['drawdown'] = abs(portfolio_summary.total_gain_loss_pct)
        
        return metrics
    
    def _calculate_severity(self, actual_value: float, threshold: float) -> str:
        """
        Calculate breach severity based on how much threshold is exceeded.
        
        Returns: 'low', 'medium', 'high', or 'critical'
        """
        excess_pct = ((actual_value - threshold) / threshold) * 100
        
        if excess_pct < 10:
            return 'low'
        elif excess_pct < 25:
            return 'medium'
        elif excess_pct < 50:
            return 'high'
        else:
            return 'critical'
    
    async def _send_breach_notifications(
        self,
        config: BreachMonitorConfig,
        breaches: List[BreachEvent]
    ):
        """Send email notifications for breaches"""
        # TODO: Integrate with email service
        logger.info(
            f"Would send breach notifications to {len(config.notification_emails)} recipients "
            f"for {len(breaches)} breaches"
        )
        # In production, call email service here
    
    def get_breach_history(
        self,
        portfolio_id: str,
        days: int = 30,
        metric: Optional[str] = None
    ) -> BreachHistory:
        """
        Get breach history for a portfolio.
        
        Args:
            portfolio_id: Portfolio identifier
            days: Number of days to look back
            metric: Optional metric filter
            
        Returns:
            BreachHistory object
        """
        all_breaches = self._breach_history.get(portfolio_id, [])
        
        # Filter by date
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_breaches = [
            b for b in all_breaches
            if b.timestamp >= cutoff_date
        ]
        
        # Filter by metric if specified
        if metric:
            recent_breaches = [
                b for b in recent_breaches
                if b.metric == metric
            ]
        
        # Calculate date range
        if recent_breaches:
            min_date = min(b.timestamp.date() for b in recent_breaches)
            max_date = max(b.timestamp.date() for b in recent_breaches)
        else:
            min_date = max_date = date.today()
        
        return BreachHistory(
            portfolio_id=portfolio_id,
            total_breaches=len(recent_breaches),
            breaches=sorted(recent_breaches, key=lambda x: x.timestamp, reverse=True),
            date_range={"start": min_date, "end": max_date}
        )
    
    def acknowledge_breach(self, portfolio_id: str, breach_id: str):
        """Mark a breach as acknowledged"""
        breaches = self._breach_history.get(portfolio_id, [])
        for breach in breaches:
            if breach.breach_id == breach_id:
                breach.acknowledged = True
                logger.info(f"Acknowledged breach {breach_id} for portfolio {portfolio_id}")
                return
        
        logger.warning(f"Breach {breach_id} not found for portfolio {portfolio_id}")
    
    def get_current_breaches(self, portfolio_id: str) -> List[BreachEvent]:
        """Get unacknowledged breaches from the last 24 hours"""
        all_breaches = self._breach_history.get(portfolio_id, [])
        cutoff = datetime.utcnow() - timedelta(hours=24)
        
        current = [
            b for b in all_breaches
            if b.timestamp >= cutoff and not b.acknowledged
        ]
        
        return sorted(current, key=lambda x: x.timestamp, reverse=True)
    
    def clear_history(self, portfolio_id: str):
        """Clear breach history for a portfolio (admin function)"""
        if portfolio_id in self._breach_history:
            count = len(self._breach_history[portfolio_id])
            self._breach_history[portfolio_id] = []
            logger.info(f"Cleared {count} breach events for portfolio {portfolio_id}")


# Global monitor instance
breach_monitor = BreachMonitor()
