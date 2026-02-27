"""CLARA — Regime Engine Router"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/current")
async def current_regime():
    return {
        "regime": "Tightening Cycle",
        "confidence": 0.74,
        "description": "Fed tightening cycle with elevated credit spreads and moderate vol.",
        "shock_multiplier": 1.35,
        "recommended_actions": [
            "Reduce duration in fixed income",
            "Favour quality over growth",
            "Hedge tail risk via index puts",
            "Increase cash buffer to 8-10%",
        ],
        "historical_analogs": ["Fed Taper 2013", "2018 Rate Hike Cycle", "1994 Bond Massacre"],
    }

@router.get("/history")
async def regime_history():
    return [
        {"date": "2024-01", "regime": "Low Vol Expansion",    "confidence": 0.82},
        {"date": "2024-03", "regime": "Tightening Cycle",     "confidence": 0.69},
        {"date": "2024-06", "regime": "Tightening Cycle",     "confidence": 0.74},
        {"date": "2024-09", "regime": "Inflation Shock",      "confidence": 0.61},
        {"date": "2024-12", "regime": "Tightening Cycle",     "confidence": 0.78},
        {"date": "2025-01", "regime": "Tightening Cycle",     "confidence": 0.74},
    ]
