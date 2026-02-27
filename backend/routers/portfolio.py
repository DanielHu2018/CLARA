"""
CLARA — Portfolio Router
Full CRUD for portfolio positions + analytics endpoints.

GET    /api/portfolio/positions
POST   /api/portfolio/positions
PUT    /api/portfolio/positions/{id}
DELETE /api/portfolio/positions/{id}
DELETE /api/portfolio/positions       (clear all)

GET    /api/portfolio/summary
GET    /api/portfolio/enriched        (positions + live prices)
GET    /api/portfolio/var
GET    /api/portfolio/contributors
GET    /api/portfolio/monte-carlo
GET    /api/portfolio/buy-recommendations
GET    /api/portfolio/stress-test
POST   /api/portfolio/refresh-prices
"""

import uuid
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from models.schemas import (
    AddPositionRequest, UpdatePositionRequest, PortfolioPosition,
    EnrichedPosition, PortfolioSummary, VaRResult, RiskContributor,
    MonteCarloResult, BuyRecommendation
)
from services import stock_data as sd
from services.portfolio_engine import (
    enrich_position, compute_portfolio_summary, compute_var,
    compute_risk_contributors, run_monte_carlo, get_buy_recommendations
)
from services.alert_agent import alert_agent

logger = logging.getLogger("CLARA.portfolio")
router = APIRouter()

# ── In-memory position store (replace with DB in production) ──────────────────
_positions: Dict[str, PortfolioPosition] = {}


def _all_positions() -> List[PortfolioPosition]:
    return list(_positions.values())


# ══════════════════════════════════════════════════════════════════════════════
# CRUD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/positions", response_model=List[PortfolioPosition], summary="List all positions")
async def list_positions():
    return _all_positions()


@router.post("/positions", response_model=PortfolioPosition, summary="Add a new position")
async def add_position(req: AddPositionRequest):
    """
    Add a new position to the portfolio.
    If the symbol already exists, performs dollar-cost averaging (merges).
    """
    # Check for existing position with same symbol
    existing = next((p for p in _positions.values() if p.symbol == req.symbol), None)

    if existing:
        # Dollar-cost average merge
        old_cost_basis = existing.shares * existing.avg_cost
        new_cost_basis = req.shares * req.avg_cost
        total_shares   = existing.shares + req.shares
        new_avg_cost   = (old_cost_basis + new_cost_basis) / total_shares

        existing.shares   = round(total_shares, 6)
        existing.avg_cost = round(new_avg_cost, 4)
        if req.note:
            existing.note = req.note
        logger.info("DCA merged %s: %s shares @ $%.2f avg", req.symbol, total_shares, new_avg_cost)
        return existing

    # Fetch metadata for sector
    meta   = sd.COMPANY_META.get(req.symbol, {})
    pos_id = str(uuid.uuid4())
    pos    = PortfolioPosition(
        id=pos_id,
        symbol=req.symbol,
        company=meta.get("name", req.symbol),
        shares=req.shares,
        avg_cost=req.avg_cost,
        note=req.note,
        sector=meta.get("sector"),
    )
    _positions[pos_id] = pos
    logger.info("Added position: %s %s shares @ $%.2f", req.symbol, req.shares, req.avg_cost)
    return pos


@router.put("/positions/{position_id}", response_model=PortfolioPosition, summary="Update a position")
async def update_position(position_id: str, req: UpdatePositionRequest):
    if position_id not in _positions:
        raise HTTPException(status_code=404, detail="Position not found")
    pos = _positions[position_id]
    if req.shares is not None:
        pos.shares = req.shares
    if req.avg_cost is not None:
        pos.avg_cost = req.avg_cost
    if req.note is not None:
        pos.note = req.note
    return pos


@router.delete("/positions/{position_id}", response_model=dict, summary="Delete a position")
async def delete_position(position_id: str):
    if position_id not in _positions:
        raise HTTPException(status_code=404, detail="Position not found")
    sym = _positions[position_id].symbol
    del _positions[position_id]
    logger.info("Deleted position: %s", sym)
    return {"deleted": position_id, "symbol": sym}


@router.delete("/positions", response_model=dict, summary="Clear entire portfolio")
async def clear_portfolio():
    count = len(_positions)
    _positions.clear()
    logger.info("Portfolio cleared (%d positions removed)", count)
    return {"cleared": count}


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/enriched", response_model=List[dict], summary="Positions with live prices + analytics")
async def get_enriched_positions():
    """
    Returns all positions enriched with live prices, P&L, price targets, risk level.
    Automatically registers positions with the alert agent.
    """
    positions = _all_positions()
    if not positions:
        return []

    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)

    total_value = sum(
        (p.shares * quotes.get(p.symbol, {}).get("price", p.avg_cost))
        for p in positions
    )

    enriched = [
        enrich_position(p, quotes.get(p.symbol, {}), total_value)
        for p in positions
    ]

    # Register with alert agent for monitoring
    alert_agent.register_holdings([e.dict() for e in enriched])

    return [e.dict() for e in enriched]


@router.get("/summary", response_model=dict, summary="Portfolio summary KPIs")
async def get_summary():
    """Aggregate portfolio metrics: total value, P&L, beta, VaR."""
    positions = _all_positions()
    if not positions:
        return PortfolioSummary(
            total_value=0, cost_basis=0, total_gain_loss=0,
            total_gain_loss_pct=0, day_gain_loss=0, portfolio_beta=0,
            positions_count=0, var_1d_95=0, expected_shortfall=0,
        ).dict()

    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)
    total_value = sum(
        p.shares * quotes.get(p.symbol, {}).get("price", p.avg_cost)
        for p in positions
    )
    enriched = [enrich_position(p, quotes.get(p.symbol, {}), total_value) for p in positions]
    return compute_portfolio_summary(enriched).dict()


@router.get("/var", response_model=dict, summary="VaR and Expected Shortfall")
async def get_var():
    """Compute parametric VaR (95/99) and Expected Shortfall."""
    positions = _all_positions()
    if not positions:
        raise HTTPException(status_code=400, detail="No positions in portfolio")
    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)
    total_value = sum(
        p.shares * quotes.get(p.symbol, {}).get("price", p.avg_cost)
        for p in positions
    )
    enriched = [enrich_position(p, quotes.get(p.symbol, {}), total_value) for p in positions]
    return compute_var(enriched).dict()


@router.get("/contributors", response_model=List[dict], summary="Top marginal VaR contributors")
async def get_risk_contributors():
    """Rank positions by their marginal contribution to portfolio VaR."""
    positions = _all_positions()
    if not positions:
        return []
    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)
    total_value = sum(
        p.shares * quotes.get(p.symbol, {}).get("price", p.avg_cost)
        for p in positions
    )
    enriched  = [enrich_position(p, quotes.get(p.symbol, {}), total_value) for p in positions]
    contribs  = compute_risk_contributors(enriched)
    return [c.dict() for c in contribs]


@router.get("/monte-carlo", response_model=dict, summary="Monte Carlo simulation")
async def get_monte_carlo(paths: int = Query(10_000, ge=1_000, le=100_000)):
    """Run Monte Carlo simulation for portfolio P&L distribution."""
    positions = _all_positions()
    if not positions:
        raise HTTPException(status_code=400, detail="No positions in portfolio")
    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)
    total_value = sum(
        p.shares * quotes.get(p.symbol, {}).get("price", p.avg_cost)
        for p in positions
    )
    enriched = [enrich_position(p, quotes.get(p.symbol, {}), total_value) for p in positions]
    result   = run_monte_carlo(enriched, n_paths=paths)
    return result.dict()


@router.get("/buy-recommendations", response_model=List[dict], summary="AI buy recommendations")
async def get_buy_recommendations_endpoint():
    """AI-curated buy recommendations with price targets, thesis, and risk analysis."""
    existing = [p.symbol for p in _all_positions()]
    symbols  = ["NVDA", "AVGO", "META", "GOOGL", "LLY", "V", "MSFT", "COST"]
    quotes   = await sd.get_quotes_batch(symbols)
    recs     = await get_buy_recommendations(existing, quotes)
    return [r.dict() for r in recs]


@router.get("/stress-test", response_model=List[dict], summary="Scenario stress tests")
async def get_stress_test():
    """Run predefined stress scenarios against the portfolio."""
    positions = _all_positions()
    if not positions:
        return []

    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)
    total_value = sum(
        p.shares * quotes.get(p.symbol, {}).get("price", p.avg_cost)
        for p in positions
    )

    scenarios = [
        {"name": "Market Crash -20%",             "shock": -0.20},
        {"name": "Tech Selloff -30%",             "shock": -0.30},
        {"name": "Mild Correction -10%",          "shock": -0.10},
        {"name": "Fed Rate Shock -15%",           "shock": -0.15},
        {"name": "Geopolitical Crisis -25%",      "shock": -0.25},
        {"name": "Soft Landing Rally +15%",       "shock": +0.15},
        {"name": "AI Boom +40%",                  "shock": +0.40},
        {"name": "Stagflation Scenario -18%",     "shock": -0.18},
    ]

    results = []
    limit   = total_value * 0.10   # 10% drawdown limit

    for s in scenarios:
        impact_dollars = total_value * s["shock"]
        results.append({
            "scenario":       s["name"],
            "shock_pct":      s["shock"] * 100,
            "impact_dollars": round(impact_dollars, 2),
            "impact_pct":     round(s["shock"] * 100, 1),
            "var_change":     round(abs(impact_dollars) * 0.15, 2),
            "breach":         abs(impact_dollars) > limit,
            "post_value":     round(total_value + impact_dollars, 2),
        })

    return results


@router.post("/refresh-prices", response_model=dict, summary="Force refresh all position prices")
async def refresh_prices():
    """Manually trigger a live price refresh for all held symbols."""
    positions = _all_positions()
    if not positions:
        return {"refreshed": 0}
    symbols = list({p.symbol for p in positions})
    quotes  = await sd.get_quotes_batch(symbols)
    return {
        "refreshed": len(symbols),
        "symbols":   symbols,
        "sources":   {sym: q.get("data_source", "unknown") for sym, q in quotes.items()},
    }
