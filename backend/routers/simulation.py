"""CLARA — Simulation Router"""
from fastapi import APIRouter, Query
from services.portfolio_engine import run_monte_carlo
from models.schemas import EnrichedPosition, RiskLevel
router = APIRouter()

@router.get("/run")
async def run_simulation(paths: int = Query(10_000, ge=1000, le=100_000)):
    """Run a standalone Monte Carlo simulation (demo data if no portfolio)."""
    demo = [
        EnrichedPosition(
            id="demo", symbol="SPY", company="S&P 500 ETF", shares=100,
            avg_cost=480, current_price=510, change=2.5, change_pct=0.49,
            market_value=51_000, cost_basis=48_000, gain_loss=3_000,
            gain_loss_pct=6.25, day_gain_loss=250, sell_target=560,
            stop_loss=462, trailing_stop=470, bull_target=620,
            conservative_target=546, beta=1.0, risk_level=RiskLevel.MEDIUM,
            action="Hold", weight=100.0, data_source="simulated",
        )
    ]
    return run_monte_carlo(demo, n_paths=paths).dict()
