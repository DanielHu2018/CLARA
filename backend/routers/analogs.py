"""CLARA — Historical Analogs Router"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/top")
async def top_analogs():
    return [
        {"event": "COVID-19 Market Crash", "date": "Mar 2020", "semantic_score": 0.87, "structural_score": 0.79, "market_score": 0.91, "equity_shock": -34.0, "credit_shock": +380, "vol_shock": +48.2, "duration_weeks": 5},
        {"event": "Fed Taper Tantrum",     "date": "Jun 2013", "semantic_score": 0.72, "structural_score": 0.81, "market_score": 0.68, "equity_shock": -7.5,  "credit_shock": +95,  "vol_shock": +11.3, "duration_weeks": 8},
        {"event": "2018 Rate Hike Cycle",  "date": "Q4 2018",  "semantic_score": 0.69, "structural_score": 0.77, "market_score": 0.73, "equity_shock": -19.8, "credit_shock": +145, "vol_shock": +18.7, "duration_weeks": 12},
        {"event": "China Trade War",       "date": "May 2019", "semantic_score": 0.81, "structural_score": 0.74, "market_score": 0.69, "equity_shock": -6.8,  "credit_shock": +62,  "vol_shock": +8.4,  "duration_weeks": 6},
        {"event": "Volmageddon",           "date": "Feb 2018", "semantic_score": 0.58, "structural_score": 0.62, "market_score": 0.84, "equity_shock": -10.2, "credit_shock": +88,  "vol_shock": +35.6, "duration_weeks": 3},
    ]
