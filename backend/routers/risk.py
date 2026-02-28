"""CLARA — Risk Engine Router (stubs — expand with full quant library)"""
import random
from fastapi import APIRouter
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/var-history", summary="Intraday VaR history for charting")
async def var_history():
    now = datetime.utcnow()
    base_var = 2_150_000
    history = []
    for i in range(48, 0, -1):
        t = now - timedelta(minutes=i * 30)
        base_var *= (1 + random.gauss(0, 0.018))
        history.append({
            "time":   t.strftime("%H:%M"),
            "var_95": round(base_var, 0),
            "var_99": round(base_var * 1.42, 0),
            "es":     round(base_var * 1.27, 0),
            "limit":  2_800_000,
        })
    return history

@router.get("/shock-matrix", summary="Factor shock scenarios")
async def shock_matrix():
    factors = [
        {"factor": "US Equity Beta",       "base": -0.8,  "adverse": -4.2,  "severe": -8.5,  "confidence": 78, "analog": "COVID-19 Mar 2020"},
        {"factor": "Taiwan Semiconductor", "base": -2.1,  "adverse": -7.3,  "severe": -14.8, "confidence": 65, "analog": "2022 China Tensions"},
        {"factor": "Interest Rate +100bp", "base": -1.2,  "adverse": -3.8,  "severe": -6.9,  "confidence": 82, "analog": "Fed Taper 2013"},
        {"factor": "USD Strength +5%",     "base": -0.4,  "adverse": -1.8,  "severe": -3.2,  "confidence": 71, "analog": "DXY Rally 2015"},
        {"factor": "Oil +40%",             "base": +0.3,  "adverse": +1.1,  "severe": +2.4,  "confidence": 69, "analog": "Gulf War 1990"},
        {"factor": "Credit Spread +200bp", "base": -1.5,  "adverse": -5.1,  "severe": -9.3,  "confidence": 74, "analog": "GFC 2008"},
        {"factor": "VIX Spike to 45",      "base": -3.2,  "adverse": -9.8,  "severe": -18.4, "confidence": 58, "analog": "Volmageddon 2018"},
    ]
    return factors

@router.get("/regime", summary="Current market regime")
async def get_regime():
    return {
        "regime": "Tightening Cycle",
        "confidence": 0.74,
        "shock_multiplier": 1.35,
        "indicators": {
            "vix": 22.4,
            "vix_percentile": 68,
            "move_index": 118.2,
            "move_percentile": 74,
            "credit_spread_ig": 112,
            "credit_spread_hy": 385,
            "liquidity_score": 62,
            "correlation_clustering": 0.71,
        }
    }
