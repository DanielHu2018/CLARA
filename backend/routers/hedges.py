"""CLARA — Hedge Engine Router"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/proposals")
async def get_hedge_proposals():
    return [
        {"id": "h1", "instrument": "SPY Put Spread 480/460", "type": "Put Spread", "symbol": "SPY", "notional": 2_500_000, "cost": 18_750, "cost_pct": 0.75, "effectiveness_pct": 68, "residual_tail": 0.32, "priority": "Critical", "rationale": "Broad market tail hedge for geopolitical risk"},
        {"id": "h2", "instrument": "QQQ Put 410",            "type": "Put Option", "symbol": "QQQ", "notional": 1_800_000, "cost": 22_500, "cost_pct": 1.25, "effectiveness_pct": 74, "residual_tail": 0.26, "priority": "High",     "rationale": "Tech-specific downside via OTM puts"},
        {"id": "h3", "instrument": "VIX Call 35",            "type": "Vol Option", "symbol": "VIX", "notional": 500_000,   "cost": 8_500,  "cost_pct": 1.70, "effectiveness_pct": 81, "residual_tail": 0.19, "priority": "High",     "rationale": "Convexity hedge for vol spike regime"},
        {"id": "h4", "instrument": "ES Futures Short",        "type": "Future",    "symbol": "ES",  "notional": 3_000_000, "cost": 4_200,  "cost_pct": 0.14, "effectiveness_pct": 55, "residual_tail": 0.45, "priority": "Medium",   "rationale": "Delta hedge via index futures"},
        {"id": "h5", "instrument": "HYG Put 75",             "type": "Put Option", "symbol": "HYG", "notional": 900_000,   "cost": 11_250, "cost_pct": 1.25, "effectiveness_pct": 62, "residual_tail": 0.38, "priority": "Medium",   "rationale": "Credit spread widening protection"},
        {"id": "h6", "instrument": "GLD Long",               "type": "ETF",        "symbol": "GLD", "notional": 600_000,   "cost": 2_400,  "cost_pct": 0.40, "effectiveness_pct": 45, "residual_tail": 0.55, "priority": "Medium",   "rationale": "Safe-haven diversifier in crisis regime"},
    ]
