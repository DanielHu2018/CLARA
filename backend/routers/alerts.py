"""
CLARA — Alert Agent Router

GET    /api/alerts/config
PUT    /api/alerts/config
GET    /api/alerts/in-app
DELETE /api/alerts/in-app/{id}/acknowledge
DELETE /api/alerts/in-app
GET    /api/alerts/logs
POST   /api/alerts/test
DELETE /api/alerts/cooldown/{symbol}/{alert_type}
GET    /api/alerts/status
"""

from fastapi import APIRouter, HTTPException, Path
from typing import List

from models.schemas import (
    AlertConfig, InAppAlert, AlertLogEntry, AlertType,
    SendTestAlertRequest, UpdateAlertConfigRequest
)
from services.alert_agent import alert_agent

router = APIRouter()


@router.get("/config", response_model=AlertConfig, summary="Get current alert configuration")
async def get_config():
    return alert_agent.config


@router.put("/config", response_model=AlertConfig, summary="Update alert configuration")
async def update_config(req: UpdateAlertConfigRequest):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    return alert_agent.update_config(updates)


@router.get("/in-app", response_model=List[dict], summary="List all in-app alerts")
async def list_in_app_alerts(unacknowledged_only: bool = False):
    alerts = alert_agent.in_app_alerts
    if unacknowledged_only:
        alerts = [a for a in alerts if not a.acknowledged]
    return [a.dict() for a in alerts]


@router.post("/in-app/{alert_id}/acknowledge", response_model=dict, summary="Acknowledge an alert")
async def acknowledge_alert(alert_id: str = Path(...)):
    success = alert_agent.acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"acknowledged": alert_id}


@router.delete("/in-app", response_model=dict, summary="Clear all in-app alerts")
async def clear_alerts():
    alert_agent.clear_all_alerts()
    return {"cleared": True}


@router.get("/logs", response_model=List[dict], summary="Email alert logs")
async def get_email_logs():
    return [log.dict() for log in alert_agent.email_logs]


@router.post("/test", response_model=dict, summary="Send a test alert")
async def send_test_alert(req: SendTestAlertRequest):
    """Manually fire a test alert for any held symbol."""
    result = await alert_agent.send_test_alert(req.symbol, req.alert_type)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Symbol {req.symbol} not found in monitored portfolio. Add it first."
        )
    return {"sent": True, "alert": result.dict()}


@router.delete("/cooldown/{symbol}/{alert_type}", response_model=dict, summary="Reset alert cooldown")
async def reset_cooldown(symbol: str, alert_type: AlertType):
    """Reset the 4-hour cooldown for a specific symbol + alert type combination."""
    alert_agent.reset_cooldown(symbol.upper(), alert_type)
    return {"reset": True, "symbol": symbol.upper(), "alert_type": alert_type}


@router.get("/status", response_model=dict, summary="Alert agent status")
async def get_status():
    return {
        "status":             alert_agent.status,
        "enabled":            alert_agent.config.enabled,
        "user_email":         alert_agent.config.user_email,
        "monitored_symbols":  [h["symbol"] for h in alert_agent.holdings],
        "unacknowledged":     sum(1 for a in alert_agent.in_app_alerts if not a.acknowledged),
        "alerts_today":       alert_agent.alerts_today,
        "uptime_seconds":     alert_agent.uptime_seconds,
        "check_interval_sec": alert_agent.config.check_interval_seconds,
    }
