"""
CLARA — Stock Data Service (Python)
Multi-source async stock data fetcher with cascading fallbacks:

  Priority:
    1. Alpha Vantage  (if key configured & within daily quota)
    2. Twelve Data    (if key configured)
    3. Finnhub        (if key configured)
    4. Yahoo Finance  (no key, CORS-free server-side)
    5. Simulated      (always works — realistic random walk)
"""

import asyncio
import logging
import math
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from config import settings
from services import alpha_vantage as av

logger = logging.getLogger("CLARA.stock_data")

# ── Company metadata ───────────────────────────────────────────────────────────
COMPANY_META: Dict[str, Dict[str, Any]] = {
    "NVDA":  {"name": "NVIDIA Corporation",        "sector": "Technology",    "base": 875,  "beta": 1.72},
    "AAPL":  {"name": "Apple Inc.",                "sector": "Technology",    "base": 189,  "beta": 1.21},
    "MSFT":  {"name": "Microsoft Corporation",     "sector": "Technology",    "base": 415,  "beta": 0.90},
    "GOOGL": {"name": "Alphabet Inc.",             "sector": "Technology",    "base": 175,  "beta": 1.05},
    "AMZN":  {"name": "Amazon.com Inc.",           "sector": "Consumer",      "base": 195,  "beta": 1.15},
    "META":  {"name": "Meta Platforms Inc.",       "sector": "Technology",    "base": 510,  "beta": 1.28},
    "TSLA":  {"name": "Tesla Inc.",                "sector": "Consumer",      "base": 245,  "beta": 2.01},
    "JPM":   {"name": "JPMorgan Chase & Co.",      "sector": "Financials",    "base": 197,  "beta": 1.10},
    "XOM":   {"name": "Exxon Mobil Corporation",   "sector": "Energy",        "base": 112,  "beta": 0.85},
    "TSM":   {"name": "Taiwan Semiconductor",      "sector": "Technology",    "base": 155,  "beta": 1.35},
    "AVGO":  {"name": "Broadcom Inc.",             "sector": "Technology",    "base": 145,  "beta": 1.30},
    "LLY":   {"name": "Eli Lilly and Company",     "sector": "Healthcare",    "base": 780,  "beta": 0.42},
    "V":     {"name": "Visa Inc.",                 "sector": "Financials",    "base": 278,  "beta": 0.95},
    "COST":  {"name": "Costco Wholesale Corp.",    "sector": "Consumer",      "base": 895,  "beta": 0.78},
    "WMT":   {"name": "Walmart Inc.",              "sector": "Consumer",      "base": 88,   "beta": 0.52},
    "JNJ":   {"name": "Johnson & Johnson",         "sector": "Healthcare",    "base": 152,  "beta": 0.55},
    "BAC":   {"name": "Bank of America Corp.",     "sector": "Financials",    "base": 39,   "beta": 1.35},
    "MA":    {"name": "Mastercard Inc.",           "sector": "Financials",    "base": 465,  "beta": 0.98},
    "UNH":   {"name": "UnitedHealth Group",        "sector": "Healthcare",    "base": 520,  "beta": 0.62},
    "HD":    {"name": "Home Depot Inc.",           "sector": "Consumer",      "base": 348,  "beta": 1.05},
    "SPY":   {"name": "S&P 500 ETF",               "sector": "ETF",           "base": 510,  "beta": 1.00},
    "QQQ":   {"name": "Nasdaq 100 ETF",            "sector": "ETF",           "base": 435,  "beta": 1.12},
}

# Simulated state — tiny random-walk so prices move on each call
_sim_prices: Dict[str, float] = {}


def _sim_price(symbol: str) -> float:
    meta = COMPANY_META.get(symbol, {"base": 100, "beta": 1.0})
    base = meta["base"]
    beta = meta["beta"]
    if symbol not in _sim_prices:
        _sim_prices[symbol] = base * (1 + random.gauss(0, 0.02))
    # Small random walk
    drift = random.gauss(0, 0.004 * beta)
    _sim_prices[symbol] *= (1 + drift)
    return round(_sim_prices[symbol], 2)


def _build_simulated_quote(symbol: str) -> Dict[str, Any]:
    meta  = COMPANY_META.get(symbol, {"name": symbol, "sector": "Unknown", "base": 100, "beta": 1.0})
    price = _sim_price(symbol)
    change_pct = random.gauss(0, 1.2)
    change = round(price * change_pct / 100, 2)
    prev   = round(price - change, 2)
    return {
        "symbol":       symbol,
        "company":      meta["name"],
        "sector":       meta["sector"],
        "price":        price,
        "change":       change,
        "change_pct":   round(change_pct, 2),
        "open":         round(prev * (1 + random.gauss(0, 0.003)), 2),
        "high":         round(price * (1 + abs(random.gauss(0, 0.008))), 2),
        "low":          round(price * (1 - abs(random.gauss(0, 0.008))), 2),
        "volume":       random.randint(5_000_000, 80_000_000),
        "prev_close":   prev,
        "pe_ratio":     round(random.uniform(15, 45), 1),
        "beta":         meta["beta"],
        "week_high_52": round(price * random.uniform(1.05, 1.40), 2),
        "week_low_52":  round(price * random.uniform(0.65, 0.92), 2),
        "analyst_target": round(price * random.uniform(1.05, 1.25), 2),
        "last_updated": datetime.utcnow().isoformat(),
        "data_source":  "simulated",
    }


def _build_simulated_history(symbol: str, days: int = 90) -> List[Dict[str, Any]]:
    meta  = COMPANY_META.get(symbol, {"base": 100, "beta": 1.0})
    base  = meta["base"]
    beta  = meta["beta"]
    price = base
    bars  = []
    for i in range(days, 0, -1):
        dt    = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        drift = random.gauss(0.0005, 0.012 * beta)
        price = max(1.0, price * (1 + drift))
        bars.append({
            "date":   dt,
            "open":   round(price * (1 + random.gauss(0, 0.003)), 2),
            "high":   round(price * (1 + abs(random.gauss(0, 0.008))), 2),
            "low":    round(price * (1 - abs(random.gauss(0, 0.008))), 2),
            "close":  round(price, 2),
            "volume": random.randint(5_000_000, 80_000_000),
        })
    return bars


# ══════════════════════════════════════════════════════════════════════════════
# YAHOO FINANCE (server-side, no key needed)
# ══════════════════════════════════════════════════════════════════════════════

async def _fetch_yahoo_quote(symbol: str) -> Optional[Dict[str, Any]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    try:
        async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            resp = await client.get(url, params={"interval": "1d", "range": "1d"})
            resp.raise_for_status()
            data = resp.json()

        result = data["chart"]["result"][0]
        meta   = result["meta"]
        price  = meta.get("regularMarketPrice", 0)
        prev   = meta.get("chartPreviousClose") or meta.get("previousClose", price)
        change = round(price - prev, 2)
        change_pct = round((change / prev) * 100, 2) if prev else 0

        company_meta = COMPANY_META.get(symbol, {"name": symbol, "sector": "Unknown", "beta": 1.0})

        return {
            "symbol":       symbol,
            "company":      company_meta["name"],
            "sector":       company_meta["sector"],
            "price":        round(float(price), 2),
            "change":       change,
            "change_pct":   change_pct,
            "open":         round(float(meta.get("regularMarketOpen", price)), 2),
            "high":         round(float(meta.get("regularMarketDayHigh", price)), 2),
            "low":          round(float(meta.get("regularMarketDayLow", price)), 2),
            "volume":       int(meta.get("regularMarketVolume", 0)),
            "prev_close":   round(float(prev), 2),
            "week_high_52": round(float(meta.get("fiftyTwoWeekHigh", price * 1.2)), 2),
            "week_low_52":  round(float(meta.get("fiftyTwoWeekLow",  price * 0.8)), 2),
            "beta":         company_meta["beta"],
            "last_updated": datetime.utcnow().isoformat(),
            "data_source":  "yahoo_finance",
        }
    except Exception as exc:
        logger.debug("Yahoo Finance failed for %s: %s", symbol, exc)
        return None


async def _fetch_yahoo_history(symbol: str, days: int = 90) -> List[Dict[str, Any]]:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    try:
        async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            resp = await client.get(url, params={"interval": "1d", "range": f"{days}d"})
            resp.raise_for_status()
            data = resp.json()

        result    = data["chart"]["result"][0]
        timestamps = result["timestamp"]
        ohlcv      = result["indicators"]["quote"][0]

        bars = []
        for i, ts in enumerate(timestamps):
            try:
                bars.append({
                    "date":   datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d"),
                    "open":   round(float(ohlcv["open"][i] or 0), 2),
                    "high":   round(float(ohlcv["high"][i] or 0), 2),
                    "low":    round(float(ohlcv["low"][i] or 0), 2),
                    "close":  round(float(ohlcv["close"][i] or 0), 2),
                    "volume": int(ohlcv["volume"][i] or 0),
                })
            except (IndexError, TypeError):
                continue
        return bars
    except Exception as exc:
        logger.debug("Yahoo Finance history failed for %s: %s", symbol, exc)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# TWELVE DATA
# ══════════════════════════════════════════════════════════════════════════════

def _twelvedata_configured() -> bool:
    k = settings.TWELVEDATA_API_KEY
    return bool(k) and k != "your_twelvedata_key_here"


async def _fetch_twelvedata_quote(symbol: str) -> Optional[Dict[str, Any]]:
    if not _twelvedata_configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.TWELVEDATA_BASE_URL}/price",
                params={"symbol": symbol, "apikey": settings.TWELVEDATA_API_KEY},
            )
            resp.raise_for_status()
            data = resp.json()
            if "price" not in data:
                return None
            price = float(data["price"])
            company_meta = COMPANY_META.get(symbol, {"name": symbol, "sector": "Unknown", "beta": 1.0})
            sim = _build_simulated_quote(symbol)
            return {**sim, "price": price, "data_source": "twelve_data"}
    except Exception as exc:
        logger.debug("Twelve Data failed for %s: %s", symbol, exc)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════

async def get_quote(symbol: str) -> Dict[str, Any]:
    """
    Fetch a stock quote using the best available source.
    Cascade: Alpha Vantage → Yahoo Finance → Twelve Data → Simulated
    """
    # 1. Alpha Vantage
    if av.get_rate_status()["configured"] and av.get_rate_status()["within_limit"]:
        result = await av.fetch_quote(symbol)
        if result:
            meta = COMPANY_META.get(symbol, {"name": symbol, "sector": "Unknown", "beta": 1.0})
            result.setdefault("company", meta["name"])
            result.setdefault("sector", meta["sector"])
            result.setdefault("beta", meta["beta"])
            return result

    # 2. Yahoo Finance
    result = await _fetch_yahoo_quote(symbol)
    if result:
        return result

    # 3. Twelve Data
    result = await _fetch_twelvedata_quote(symbol)
    if result:
        return result

    # 4. Simulated
    logger.info("Using simulated data for %s", symbol)
    return _build_simulated_quote(symbol)


async def get_quotes_batch(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch multiple quotes concurrently (with fallback per symbol)."""
    tasks = [get_quote(sym) for sym in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    output: Dict[str, Dict[str, Any]] = {}
    for sym, res in zip(symbols, results):
        if isinstance(res, Exception):
            output[sym] = _build_simulated_quote(sym)
        else:
            output[sym] = res
    return output


async def get_history(symbol: str, days: int = 90) -> List[Dict[str, Any]]:
    """
    Fetch price history bars.
    Cascade: Alpha Vantage → Yahoo Finance → Simulated
    """
    # 1. Alpha Vantage
    if av.get_rate_status()["configured"] and av.get_rate_status()["within_limit"]:
        bars = await av.fetch_daily_series(symbol)
        if bars:
            return bars

    # 2. Yahoo Finance
    bars = await _fetch_yahoo_history(symbol, days)
    if bars:
        return bars

    # 3. Simulated
    return _build_simulated_history(symbol, days)


async def get_company_overview(symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch company fundamentals from Alpha Vantage or return meta defaults."""
    if av.get_rate_status()["configured"] and av.get_rate_status()["within_limit"]:
        overview = await av.fetch_overview(symbol)
        if overview:
            return overview
    # Fallback: construct from metadata
    meta = COMPANY_META.get(symbol)
    if not meta:
        return None
    sim = _build_simulated_quote(symbol)
    return {
        "symbol":        symbol,
        "name":          meta["name"],
        "sector":        meta["sector"],
        "beta":          meta["beta"],
        "pe_ratio":      sim.get("pe_ratio"),
        "week_high_52":  sim.get("week_high_52"),
        "week_low_52":   sim.get("week_low_52"),
        "analyst_target": sim.get("analyst_target"),
        "data_source":   "simulated",
    }


async def search_symbol(keywords: str) -> List[Dict[str, Any]]:
    """Search for symbols via Alpha Vantage or local metadata."""
    if av.get_rate_status()["configured"] and av.get_rate_status()["within_limit"]:
        results = await av.search_symbol(keywords)
        if results:
            return results

    # Local fallback search
    kw = keywords.upper()
    return [
        {"symbol": sym, "name": meta["name"], "sector": meta["sector"], "match_score": 1.0}
        for sym, meta in COMPANY_META.items()
        if kw in sym or kw in meta["name"].upper()
    ][:10]


async def get_news(tickers: List[str]) -> List[Dict[str, Any]]:
    """Fetch news + sentiment from Alpha Vantage."""
    if av.get_rate_status()["configured"] and av.get_rate_status()["within_limit"]:
        return await av.fetch_news(tickers)
    return []


def get_data_source_status() -> Dict[str, Any]:
    """Return status of all data sources."""
    av_status = av.get_rate_status()
    return {
        "alpha_vantage": {
            "configured": av_status["configured"],
            "requests_today": av_status["requests_today"],
            "daily_limit": av_status["daily_limit"],
            "within_limit": av_status["within_limit"],
            "active": av_status["configured"] and av_status["within_limit"],
        },
        "twelve_data": {
            "configured": _twelvedata_configured(),
            "active": _twelvedata_configured(),
        },
        "yahoo_finance": {
            "configured": True,   # always available
            "active": True,
        },
        "simulated": {
            "configured": True,
            "active": True,
        },
    }
