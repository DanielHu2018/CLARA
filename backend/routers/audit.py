"""CLARA — Audit Trail Router"""
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter
router = APIRouter()

_SAMPLE_AUDIT = [
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=2)).isoformat(),  "event_type": "SHOCK_GENERATED",    "component": "NFTE",            "description": "Shock matrix generated for Taiwan supply chain event", "confidence": 0.73, "sr_11_7_compliant": True},
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=8)).isoformat(),  "event_type": "REGIME_CLASSIFIED",  "component": "Regime Engine",   "description": "Regime classified as Tightening Cycle (conf: 74%)",    "confidence": 0.74, "sr_11_7_compliant": True},
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(), "event_type": "VAR_COMPUTED",       "component": "Risk Engine",     "description": "1-Day VaR 95% computed: $2.14M",                       "confidence": 0.91, "sr_11_7_compliant": True},
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=22)).isoformat(), "event_type": "HEDGE_PROPOSED",     "component": "Hedge Engine",    "description": "SPY Put Spread proposed — effectiveness 68%",          "confidence": 0.81, "sr_11_7_compliant": True},
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=35)).isoformat(), "event_type": "ANALOG_RETRIEVED",   "component": "Analog Engine",   "description": "Top analog: COVID-19 Mar 2020 (similarity: 87%)",      "confidence": 0.87, "sr_11_7_compliant": True},
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=48)).isoformat(), "event_type": "MONTE_CARLO_RUN",    "component": "Simulation",      "description": "10,000 path Monte Carlo completed in 1.8s",            "confidence": 0.95, "sr_11_7_compliant": True},
    {"id": str(uuid.uuid4()), "timestamp": (datetime.utcnow() - timedelta(minutes=61)).isoformat(), "event_type": "EVENT_INGESTED",     "component": "Event Layer",     "description": "Taiwan geopolitical event ingested — relevance: 0.87", "confidence": 0.87, "sr_11_7_compliant": True},
]

@router.get("/entries")
async def get_audit_entries():
    return _SAMPLE_AUDIT

@router.get("/compliance")
async def get_compliance_status():
    return {
        "sr_11_7": "Compliant",
        "last_model_validation": "2025-01-15",
        "next_validation_due": "2025-04-15",
        "audit_coverage_pct": 100,
        "reproducible_outputs": True,
        "explainability_score": 0.94,
    }
