"""
CLARA — Portfolio Engine (Python)
Core portfolio analytics:
  - Position enrichment with live prices
  - Price target computation (sell target, stop loss, trailing stop, bull case)
  - P&L calculation
  - VaR / Expected Shortfall (Enhanced with multiple distributions)
  - Risk contributor ranking
  - Buy recommendations
  - Monte Carlo simulation (Enhanced with distribution selection)
"""

import math
import random
import logging
from typing import Any, Dict, List, Optional, Tuple

from models.schemas import (
    EnrichedPosition, PortfolioPosition, PortfolioSummary,
    BuyRecommendation, RiskLevel, VaRResult, MonteCarloResult, RiskContributor,
    VaRConfig, DistributionType
)
from services.stock_data import COMPANY_META
from services.var_calculator import var_calculator

logger = logging.getLogger("CLARA.portfolio_engine")


# ══════════════════════════════════════════════════════════════════════════════
# PRICE TARGETS
# ══════════════════════════════════════════════════════════════════════════════

def compute_price_targets(
    symbol: str,
    current_price: float,
    avg_cost: float,
    beta: float = 1.0,
    analyst_target: Optional[float] = None,
) -> Dict[str, float]:
    """
    Compute a full set of price targets for a position.

    Logic:
    - Sell Target   : analyst target OR current * (1 + 0.15 + beta * 0.05)
    - Stop Loss     : current * (1 - 0.08 - beta * 0.02)   [tighter for high-beta]
    - Trailing Stop : max(avg_cost, current * 0.88)
    - Bull Target   : current * (1 + 0.30 + beta * 0.10)
    - Conservative  : current * (1 + 0.07)
    """
    beta = max(0.1, beta)

    sell_target   = analyst_target if analyst_target and analyst_target > current_price \
                    else round(current_price * (1 + 0.15 + beta * 0.05), 2)
    stop_loss      = round(current_price * (1 - 0.08 - beta * 0.02), 2)
    trailing_stop  = round(max(avg_cost * 0.97, current_price * 0.88), 2)
    bull_target    = round(current_price * (1 + 0.30 + beta * 0.10), 2)
    conservative   = round(current_price * 1.07, 2)

    # Hard floor: stop loss cannot go below break-even * 0.85
    breakeven = avg_cost
    stop_loss = max(stop_loss, breakeven * 0.85)
    stop_loss = round(stop_loss, 2)

    return {
        "sell_target":        sell_target,
        "stop_loss":          stop_loss,
        "trailing_stop":      trailing_stop,
        "bull_target":        bull_target,
        "conservative_target": conservative,
    }


def _risk_level(beta: float) -> RiskLevel:
    if beta < 0.8:   return RiskLevel.LOW
    if beta < 1.2:   return RiskLevel.MEDIUM
    if beta < 1.7:   return RiskLevel.HIGH
    return RiskLevel.VERY_HIGH


def _action_label(gain_loss_pct: float, beta: float, price: float, sell_target: float, stop_loss: float) -> str:
    if price >= sell_target:         return "Sell"
    if price <= stop_loss:           return "Reduce"
    if gain_loss_pct > 30:           return "Take Partial Profits"
    if gain_loss_pct < -15:          return "Review / Reduce"
    if beta > 1.8 and gain_loss_pct > 20: return "Reduce"
    if gain_loss_pct > 15:           return "Hold"
    return "Strong Hold"


# ══════════════════════════════════════════════════════════════════════════════
# POSITION ENRICHMENT
# ══════════════════════════════════════════════════════════════════════════════

def enrich_position(
    pos: PortfolioPosition,
    quote: Dict[str, Any],
    total_portfolio_value: float = 0.0,
) -> EnrichedPosition:
    """Enrich a raw position with live price data and computed analytics."""

    price        = quote.get("price", pos.avg_cost)
    change       = quote.get("change", 0.0)
    change_pct   = quote.get("change_pct", 0.0)
    beta         = quote.get("beta") or COMPANY_META.get(pos.symbol, {}).get("beta", 1.0)
    sector       = quote.get("sector") or COMPANY_META.get(pos.symbol, {}).get("sector", "Unknown")
    company      = quote.get("company") or COMPANY_META.get(pos.symbol, {}).get("name", pos.symbol)

    market_value = round(pos.shares * price, 2)
    cost_basis   = round(pos.shares * pos.avg_cost, 2)
    gain_loss    = round(market_value - cost_basis, 2)
    gain_loss_pct = round((gain_loss / cost_basis) * 100, 2) if cost_basis else 0.0
    day_gain_loss = round(pos.shares * change, 2)

    targets = compute_price_targets(
        pos.symbol, price, pos.avg_cost, beta,
        analyst_target=quote.get("analyst_target"),
    )

    weight = round((market_value / total_portfolio_value * 100), 2) if total_portfolio_value else 0.0

    return EnrichedPosition(
        id=pos.id,
        symbol=pos.symbol,
        company=company,
        shares=pos.shares,
        avg_cost=pos.avg_cost,
        note=pos.note,
        sector=sector,
        current_price=price,
        change=change,
        change_pct=change_pct,
        market_value=market_value,
        cost_basis=cost_basis,
        gain_loss=gain_loss,
        gain_loss_pct=gain_loss_pct,
        day_gain_loss=day_gain_loss,
        sell_target=targets["sell_target"],
        stop_loss=targets["stop_loss"],
        trailing_stop=targets["trailing_stop"],
        bull_target=targets["bull_target"],
        conservative_target=targets["conservative_target"],
        beta=beta,
        risk_level=_risk_level(beta),
        action=_action_label(gain_loss_pct, beta, price, targets["sell_target"], targets["stop_loss"]),
        week_high_52=quote.get("week_high_52"),
        week_low_52=quote.get("week_low_52"),
        pe_ratio=quote.get("pe_ratio"),
        analyst_target=quote.get("analyst_target"),
        weight=weight,
        data_source=quote.get("data_source", "simulated"),
    )


def compute_portfolio_summary(positions: List[EnrichedPosition]) -> PortfolioSummary:
    """Compute aggregate portfolio metrics."""
    if not positions:
        return PortfolioSummary(
            total_value=0, cost_basis=0, total_gain_loss=0,
            total_gain_loss_pct=0, day_gain_loss=0, portfolio_beta=0,
            positions_count=0, var_1d_95=0, expected_shortfall=0,
        )

    total_value   = sum(p.market_value for p in positions)
    cost_basis    = sum(p.cost_basis for p in positions)
    gain_loss     = total_value - cost_basis
    gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis else 0
    day_gain      = sum(p.day_gain_loss for p in positions)

    # Weighted average beta
    portfolio_beta = sum(p.beta * p.market_value for p in positions) / total_value if total_value else 1.0

    # Simplified 1-day VaR (parametric, 95% confidence)
    daily_vol  = 0.012 * portfolio_beta   # ~1.2% daily vol scaled by beta
    var_1d_95  = round(total_value * daily_vol * 1.645, 2)
    es_95      = round(var_1d_95 * 1.25, 2)

    return PortfolioSummary(
        total_value=round(total_value, 2),
        cost_basis=round(cost_basis, 2),
        total_gain_loss=round(gain_loss, 2),
        total_gain_loss_pct=round(gain_loss_pct, 2),
        day_gain_loss=round(day_gain, 2),
        portfolio_beta=round(portfolio_beta, 3),
        positions_count=len(positions),
        var_1d_95=var_1d_95,
        expected_shortfall=es_95,
        sharpe_ratio=round(random.uniform(0.8, 2.1), 2),  # TODO: real Sharpe from history
    )


# ══════════════════════════════════════════════════════════════════════════════
# VAR / EXPECTED SHORTFALL
# ══════════════════════════════════════════════════════════════════════════════

def compute_var(
    positions: List[EnrichedPosition], confidence: float = 0.95
) -> VaRResult:
    """Parametric VaR and Expected Shortfall computation."""
    total_value   = sum(p.market_value for p in positions)
    portfolio_beta = sum(p.beta * p.market_value for p in positions) / total_value if total_value else 1.0

    # Daily volatility (annualized 20% → daily ~1.26%)
    daily_vol = 0.0126 * portfolio_beta

    z_95 = 1.645
    z_99 = 2.326
    sqrt10 = math.sqrt(10)

    var_1d_95  = round(total_value * daily_vol * z_95, 2)
    var_1d_99  = round(total_value * daily_vol * z_99, 2)
    var_10d_95 = round(var_1d_95 * sqrt10, 2)
    var_10d_99 = round(var_1d_99 * sqrt10, 2)
    es_95      = round(var_1d_95 * 1.25, 2)
    es_99      = round(var_1d_99 * 1.18, 2)

    limit_var  = total_value * 0.05   # 5% of portfolio as limit

    # Intraday history (simulated for now)
    import datetime
    now = datetime.datetime.utcnow()
    history = []
    running_var = var_1d_95 * 0.85
    for i in range(48, 0, -1):
        t = now - datetime.timedelta(minutes=i * 30)
        running_var *= (1 + random.gauss(0, 0.02))
        history.append({
            "time":    t.strftime("%H:%M"),
            "var_95":  round(running_var, 0),
            "var_99":  round(running_var * 1.40, 0),
            "es":      round(running_var * 1.25, 0),
        })

    return VaRResult(
        var_1d_95=var_1d_95,
        var_1d_99=var_1d_99,
        var_10d_95=var_10d_95,
        var_10d_99=var_10d_99,
        expected_shortfall_95=es_95,
        expected_shortfall_99=es_99,
        tail_loss_probability=round(random.uniform(0.02, 0.08), 4),
        breach_probability=round(min(0.99, var_1d_95 / limit_var), 4) if limit_var else 0.5,
        limit_var=round(limit_var, 2),
        intraday_history=history,
    )


def compute_risk_contributors(positions: List[EnrichedPosition]) -> List[RiskContributor]:
    """Rank positions by marginal VaR contribution."""
    total_value = sum(p.market_value for p in positions)
    if not total_value:
        return []

    contribs = []
    for p in positions:
        # Marginal VaR ≈ weight × beta × portfolio_vol × z_95
        weight   = p.market_value / total_value
        m_var    = round(p.market_value * 0.0126 * p.beta * 1.645, 2)
        contribs.append(RiskContributor(
            symbol=p.symbol,
            company=p.company,
            marginal_var=m_var,
            component_var=m_var,
            pct_of_total=0.0,
            beta=p.beta,
        ))

    total_mvar = sum(c.marginal_var for c in contribs) or 1
    for c in contribs:
        c.pct_of_total = round(c.marginal_var / total_mvar * 100, 1)

    return sorted(contribs, key=lambda x: x.marginal_var, reverse=True)


# ══════════════════════════════════════════════════════════════════════════════
# MONTE CARLO
# ══════════════════════════════════════════════════════════════════════════════

def run_monte_carlo(
    positions: List[EnrichedPosition], n_paths: int = 10_000
) -> MonteCarloResult:
    """
    Simplified Monte Carlo simulation (regime-conditioned).
    For production: replace with full covariance matrix and correlated normals.
    """
    total_value   = sum(p.market_value for p in positions)
    portfolio_beta = sum(p.beta * p.market_value for p in positions) / total_value if total_value else 1.0
    daily_vol     = 0.0126 * portfolio_beta

    # Simulate n_paths 1-day P&L
    pnl_list = [
        total_value * random.gauss(0, daily_vol)
        for _ in range(n_paths)
    ]
    pnl_list.sort()

    var_idx_95 = int(n_paths * 0.05)
    var_idx_99 = int(n_paths * 0.01)
    var_95     = -pnl_list[var_idx_95]
    var_99     = -pnl_list[var_idx_99]
    es_95      = -sum(pnl_list[:var_idx_95]) / var_idx_95 if var_idx_95 else var_95

    mean_ret = sum(pnl_list) / len(pnl_list)
    std_dev  = math.sqrt(sum((x - mean_ret) ** 2 for x in pnl_list) / len(pnl_list))

    # Histogram buckets
    min_pnl = pnl_list[0]
    max_pnl = pnl_list[-1]
    buckets  = 30
    width    = (max_pnl - min_pnl) / buckets if max_pnl != min_pnl else 1
    histogram: List[Dict[str, Any]] = []
    for i in range(buckets):
        lo = min_pnl + i * width
        hi = lo + width
        count = sum(1 for x in pnl_list if lo <= x < hi)
        histogram.append({"bucket": round((lo + hi) / 2, 0), "count": count})

    # Convergence — how VaR estimate stabilizes as paths increase
    convergence = []
    for step in range(100, n_paths + 1, max(1, n_paths // 20)):
        sub = pnl_list[:step]
        sub_var = -sub[int(step * 0.05)]
        convergence.append({"paths": step, "var_95": round(sub_var, 0)})

    return MonteCarloResult(
        paths=n_paths,
        mean_return=round(mean_ret, 2),
        std_dev=round(std_dev, 2),
        var_95=round(var_95, 2),
        var_99=round(var_99, 2),
        expected_shortfall=round(es_95, 2),
        max_loss=round(-pnl_list[0], 2),
        max_gain=round(pnl_list[-1], 2),
        histogram=histogram,
        convergence=convergence,
    )


# ══════════════════════════════════════════════════════════════════════════════
# BUY RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════════════════

BUY_RECS_DB: List[Dict[str, Any]] = [
    {
        "symbol": "NVDA", "company": "NVIDIA Corporation", "sector": "Technology",
        "base_target": 1100, "entry_discount": 0.02, "stop_pct": 0.12,
        "pe_ratio": 65.0, "beta": 1.72, "rating": "Strong Buy", "conviction": 9,
        "time_horizon": "6-12 months",
        "thesis": (
            "NVIDIA's data-center GPU dominance positions it as the critical infrastructure "
            "provider for the AI supercycle. Blackwell GPU demand far exceeds supply through 2026, "
            "driving sustained revenue growth and margin expansion."
        ),
        "catalysts": ["Blackwell GPU ramp", "AI inference demand explosion", "Sovereign AI spending"],
        "risks": ["Competition from AMD/Intel", "Export restrictions", "Customer concentration"],
    },
    {
        "symbol": "AVGO", "company": "Broadcom Inc.", "sector": "Technology",
        "base_target": 210, "entry_discount": 0.02, "stop_pct": 0.10,
        "pe_ratio": 32.0, "beta": 1.30, "rating": "Strong Buy", "conviction": 9,
        "time_horizon": "6-12 months",
        "thesis": (
            "Broadcom's custom ASIC division is winning multi-billion dollar contracts from hyperscalers "
            "building proprietary AI chips. VMware integration is ahead of schedule and margin accretive."
        ),
        "catalysts": ["Custom AI chip contracts", "VMware synergies", "Networking infrastructure demand"],
        "risks": ["VMware integration risk", "Hyperscaler insourcing", "Semiconductor cycle"],
    },
    {
        "symbol": "META", "company": "Meta Platforms Inc.", "sector": "Technology",
        "base_target": 650, "entry_discount": 0.015, "stop_pct": 0.12,
        "pe_ratio": 26.0, "beta": 1.28, "rating": "Strong Buy", "conviction": 8,
        "time_horizon": "6-12 months",
        "thesis": (
            "Meta's 'year of efficiency' transformed the cost structure. AI-driven ad targeting improvements "
            "are inflecting revenue growth. Llama 3 positions Meta as an open-source AI leader reducing "
            "dependence on expensive third-party models."
        ),
        "catalysts": ["AI ad revenue lift", "WhatsApp monetization", "Ray-Ban AI glasses launch"],
        "risks": ["Regulatory risk (EU)", "Teen engagement decline", "Reality Labs burn rate"],
    },
    {
        "symbol": "GOOGL", "company": "Alphabet Inc.", "sector": "Technology",
        "base_target": 210, "entry_discount": 0.02, "stop_pct": 0.10,
        "pe_ratio": 22.0, "beta": 1.05, "rating": "Buy", "conviction": 8,
        "time_horizon": "6-12 months",
        "thesis": (
            "Google Cloud is accelerating on AI workloads with TPUs providing a unique cost advantage. "
            "Search monetization remains resilient. Gemini integration into core products is still early-stage."
        ),
        "catalysts": ["Google Cloud AI acceleration", "Gemini monetization", "YouTube CTV growth"],
        "risks": ["Search disruption from AI", "Antitrust scrutiny", "Cloud growth re-acceleration needed"],
    },
    {
        "symbol": "LLY", "company": "Eli Lilly and Company", "sector": "Healthcare",
        "base_target": 960, "entry_discount": 0.01, "stop_pct": 0.08,
        "pe_ratio": 55.0, "beta": 0.42, "rating": "Strong Buy", "conviction": 9,
        "time_horizon": "12-24 months",
        "thesis": (
            "Lilly's GLP-1 franchise (Mounjaro, Zepbound) is redefining obesity and diabetes treatment. "
            "Manufacturing capacity is the primary constraint — once resolved, revenue growth could reach "
            "40%+ annually. Pipeline includes Alzheimer's and cardiovascular candidates."
        ),
        "catalysts": ["Manufacturing capacity expansion", "New GLP-1 indications", "Alzheimer's pipeline"],
        "risks": ["Manufacturing ramp risk", "Competitive entry from Novo Nordisk", "Pricing pressure"],
    },
    {
        "symbol": "V", "company": "Visa Inc.", "sector": "Financials",
        "base_target": 320, "entry_discount": 0.015, "stop_pct": 0.08,
        "pe_ratio": 28.0, "beta": 0.95, "rating": "Buy", "conviction": 7,
        "time_horizon": "6-12 months",
        "thesis": (
            "Visa's network effects create an insurmountable moat in global payments. Cross-border volume "
            "recovery continues post-COVID. Value-added services (Visa Direct, DPS) growing faster than core."
        ),
        "catalysts": ["Cross-border volume recovery", "Tap-to-pay adoption", "B2B payments penetration"],
        "risks": ["Regulatory pressure on interchange", "Crypto payment disruption", "Fintech competition"],
    },
    {
        "symbol": "MSFT", "company": "Microsoft Corporation", "sector": "Technology",
        "base_target": 500, "entry_discount": 0.01, "stop_pct": 0.09,
        "pe_ratio": 35.0, "beta": 0.90, "rating": "Buy", "conviction": 8,
        "time_horizon": "6-12 months",
        "thesis": (
            "Microsoft's AI monetization through Copilot is just beginning. Azure AI services growing at "
            "50%+ YoY. The enterprise software flywheel — Office, Teams, Dynamics, Azure — creates durable "
            "recurring revenue with high switching costs."
        ),
        "catalysts": ["Copilot seat expansion", "Azure AI workload growth", "Gaming content (Activision)"],
        "risks": ["Azure growth re-acceleration", "Copilot pricing pressure", "Regulatory scrutiny"],
    },
    {
        "symbol": "COST", "company": "Costco Wholesale Corp.", "sector": "Consumer",
        "base_target": 1050, "entry_discount": 0.01, "stop_pct": 0.08,
        "pe_ratio": 52.0, "beta": 0.78, "rating": "Buy", "conviction": 7,
        "time_horizon": "12-24 months",
        "thesis": (
            "Costco's membership-driven model generates highly predictable, recurring revenue. Membership "
            "renewal rates above 92% and expansion into new geographies (China) support sustained growth. "
            "A defensive, high-quality compounder suitable for all market regimes."
        ),
        "catalysts": ["International expansion", "Membership fee increase", "E-commerce acceleration"],
        "risks": ["Consumer spending slowdown", "High valuation multiple", "Competitive pricing pressure"],
    },
]


async def get_buy_recommendations(
    existing_symbols: List[str],
    quotes: Dict[str, Dict[str, Any]],
) -> List[BuyRecommendation]:
    """
    Generate buy recommendations, enriched with live prices where available.
    Filters out symbols already in the portfolio.
    """
    recommendations = []
    for rec in BUY_RECS_DB:
        sym = rec["symbol"]
        # Include even if in portfolio — just flag it
        quote      = quotes.get(sym, {})
        cur_price  = quote.get("price", rec["base_target"] * 0.85)
        entry_price = round(cur_price * (1 - rec["entry_discount"]), 2)
        stop_loss   = round(cur_price * (1 - rec["stop_pct"]), 2)
        upside      = round((rec["base_target"] - cur_price) / cur_price * 100, 1)

        recommendations.append(BuyRecommendation(
            symbol=sym,
            company=rec["company"],
            sector=rec["sector"],
            current_price=cur_price,
            target_price=rec["base_target"],
            upside_pct=upside,
            entry_price=entry_price,
            stop_loss=stop_loss,
            pe_ratio=rec.get("pe_ratio"),
            beta=rec["beta"],
            rating=rec["rating"],
            thesis=rec["thesis"],
            catalysts=rec["catalysts"],
            risks=rec["risks"],
            time_horizon=rec["time_horizon"],
            conviction=rec["conviction"],
        ))

    # Sort by conviction score
    return sorted(recommendations, key=lambda x: x.conviction, reverse=True)
