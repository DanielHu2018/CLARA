"""
CLARA — Alpha Vantage Service (Python)
Full async implementation of the Alpha Vantage REST API.

Endpoints covered:
  - GLOBAL_QUOTE          → real-time quote
  - TIME_SERIES_DAILY     → daily OHLCV bars
  - TIME_SERIES_INTRADAY  → intraday bars (1/5/15/30/60 min)
  - OVERVIEW              → company fundamentals
  - SYMBOL_SEARCH         → ticker search
  - RSI                   → RSI indicator
  - MACD                  → MACD indicator
  - NEWS_SENTIMENT        → news + sentiment
"""

import asyncio
import logging
from datetime import date, datetime
from typing import Optional, Dict, List, Any

import httpx

from config import settings

logger = logging.getLogger("CLARA.alpha_vantage")

BASE_URL = settings.ALPHA_VANTAGE_BASE_URL
_rate_counter: Dict[str, int] = {}   # date_str → request count


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_configured() -> bool:
    key = settings.ALPHA_VANTAGE_API_KEY
    return bool(key) and key != "your_alpha_vantage_key_here"


def _get_rate_count() -> int:
    today = str(date.today())
    return _rate_counter.get(today, 0)


def _increment_rate() -> None:
    today = str(date.today())
    _rate_counter[today] = _rate_counter.get(today, 0) + 1


def _within_limit() -> bool:
    return _get_rate_count() < settings.ALPHA_VANTAGE_DAILY_LIMIT


def get_rate_status() -> Dict[str, Any]:
    count = _get_rate_count()
    return {
        "requests_today": count,
        "daily_limit": settings.ALPHA_VANTAGE_DAILY_LIMIT,
        "within_limit": count < settings.ALPHA_VANTAGE_DAILY_LIMIT,
        "configured": _is_configured(),
        "reset_at": "midnight UTC",
    }


async def _get(params: Dict[str, str], timeout: float = 12.0) -> Optional[Dict[str, Any]]:
    """Execute a GET request to Alpha Vantage."""
    if not _is_configured():
        logger.debug("Alpha Vantage not configured — skipping request")
        return None
    if not _within_limit():
        logger.warning("Alpha Vantage daily limit reached (%d/%d)", _get_rate_count(), settings.ALPHA_VANTAGE_DAILY_LIMIT)
        return None

    params["apikey"] = settings.ALPHA_VANTAGE_API_KEY

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            _increment_rate()

            if "Note" in data:
                logger.warning("Alpha Vantage rate limit note: %s", data["Note"])
                return None
            if "Information" in data:
                logger.warning("Alpha Vantage info: %s", data["Information"])
                return None

            return data
    except httpx.TimeoutException:
        logger.error("Alpha Vantage request timed out (params=%s)", params)
        return None
    except Exception as exc:
        logger.error("Alpha Vantage request failed: %s", exc)
        return None


# ══════════════════════════════════════════════════════════════════════════════
# GLOBAL QUOTE
# ══════════════════════════════════════════════════════════════════════════════

async def fetch_quote(symbol: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a real-time global quote for a single symbol.
    Returns a normalized dict or None on failure.
    """
    data = await _get({"function": "GLOBAL_QUOTE", "symbol": symbol})
    if not data:
        return None

    q = data.get("Global Quote", {})
    if not q or not q.get("05. price"):
        return None

    try:
        price       = float(q["05. price"])
        prev_close  = float(q["08. previous close"])
        change      = float(q["09. change"])
        change_pct  = float(q["10. change percent"].replace("%", ""))

        return {
            "symbol":       q["01. symbol"],
            "open":         float(q["02. open"]),
            "high":         float(q["03. high"]),
            "low":          float(q["04. low"]),
            "price":        price,
            "volume":       int(q["06. volume"]),
            "prev_close":   prev_close,
            "change":       change,
            "change_pct":   change_pct,
            "last_updated": q["07. latest trading day"],
            "data_source":  "alpha_vantage",
        }
    except (KeyError, ValueError) as exc:
        logger.error("Alpha Vantage quote parse error for %s: %s", symbol, exc)
        return None


async def fetch_quotes_batch(
    symbols: List[str], delay_seconds: float = 0.3
) -> Dict[str, Dict[str, Any]]:
    """
    Fetch quotes for multiple symbols sequentially (rate-limit safe).
    Returns dict of symbol → quote.
    """
    results: Dict[str, Dict[str, Any]] = {}
    for sym in symbols:
        q = await fetch_quote(sym)
        if q:
            results[sym] = q
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
    return results


# ══════════════════════════════════════════════════════════════════════════════
# TIME SERIES — DAILY
# ══════════════════════════════════════════════════════════════════════════════

async def fetch_daily_series(
    symbol: str, outputsize: str = "compact"
) -> List[Dict[str, Any]]:
    """
    Fetch daily OHLCV bars.
    outputsize: 'compact' = last 100 bars | 'full' = up to 20 years
    """
    data = await _get({
        "function":   "TIME_SERIES_DAILY",
        "symbol":     symbol,
        "outputsize": outputsize,
    }, timeout=20.0)
    if not data:
        return []

    series = data.get("Time Series (Daily)", {})
    if not series:
        return []

    bars = []
    for dt_str, bar in series.items():
        try:
            bars.append({
                "date":   dt_str,
                "open":   float(bar["1. open"]),
                "high":   float(bar["2. high"]),
                "low":    float(bar["3. low"]),
                "close":  float(bar["4. close"]),
                "volume": int(bar["5. volume"]),
            })
        except (KeyError, ValueError):
            continue

    # Sort oldest → newest, return last 90 bars
    bars.sort(key=lambda x: x["date"])
    return bars[-90:]


# ══════════════════════════════════════════════════════════════════════════════
# TIME SERIES — INTRADAY
# ══════════════════════════════════════════════════════════════════════════════

async def fetch_intraday(
    symbol: str, interval: str = "60min"
) -> List[Dict[str, Any]]:
    """
    Fetch intraday bars.
    interval: '1min' | '5min' | '15min' | '30min' | '60min'
    """
    data = await _get({
        "function": "TIME_SERIES_INTRADAY",
        "symbol":   symbol,
        "interval": interval,
    }, timeout=20.0)
    if not data:
        return []

    key = f"Time Series ({interval})"
    series = data.get(key, {})
    if not series:
        return []

    bars = []
    for dt_str, bar in series.items():
        try:
            bars.append({
                "date":   dt_str,
                "open":   float(bar["1. open"]),
                "high":   float(bar["2. high"]),
                "low":    float(bar["3. low"]),
                "close":  float(bar["4. close"]),
                "volume": int(bar["5. volume"]),
            })
        except (KeyError, ValueError):
            continue

    bars.sort(key=lambda x: x["date"])
    return bars


# ══════════════════════════════════════════════════════════════════════════════
# COMPANY OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════

async def fetch_overview(symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch company fundamentals / overview."""
    data = await _get({"function": "OVERVIEW", "symbol": symbol})
    if not data or not data.get("Symbol"):
        return None

    def _f(key: str, default: Any = None) -> Any:
        val = data.get(key, "")
        if val in ("None", "N/A", "-", ""):
            return default
        try:
            return float(val)
        except (TypeError, ValueError):
            return val or default

    return {
        "symbol":           data.get("Symbol"),
        "name":             data.get("Name"),
        "description":      data.get("Description"),
        "sector":           data.get("Sector"),
        "industry":         data.get("Industry"),
        "market_cap":       _f("MarketCapitalization"),
        "pe_ratio":         _f("PERatio"),
        "forward_pe":       _f("ForwardPE"),
        "week_high_52":     _f("52WeekHigh"),
        "week_low_52":      _f("52WeekLow"),
        "dividend_yield":   _f("DividendYield"),
        "eps":              _f("EPS"),
        "beta":             _f("Beta"),
        "analyst_target":   _f("AnalystTargetPrice"),
        "ex_dividend_date": data.get("ExDividendDate"),
        "price_to_book":    _f("PriceToBookRatio"),
        "profit_margin":    _f("ProfitMargin"),
        "revenue_ttm":      _f("RevenueTTM"),
        "gross_profit_ttm": _f("GrossProfitTTM"),
        "data_source":      "alpha_vantage",
    }


# ══════════════════════════════════════════════════════════════════════════════
# SYMBOL SEARCH
# ══════════════════════════════════════════════════════════════════════════════

async def search_symbol(keywords: str) -> List[Dict[str, Any]]:
    """Search for ticker symbols by keyword."""
    data = await _get({"function": "SYMBOL_SEARCH", "keywords": keywords})
    if not data:
        return []

    matches = data.get("bestMatches", [])
    return [
        {
            "symbol":     m.get("1. symbol"),
            "name":       m.get("2. name"),
            "type":       m.get("3. type"),
            "region":     m.get("4. region"),
            "currency":   m.get("8. currency"),
            "match_score": float(m.get("9. matchScore", 0)),
        }
        for m in matches
    ]


# ══════════════════════════════════════════════════════════════════════════════
# TECHNICAL INDICATORS
# ══════════════════════════════════════════════════════════════════════════════

async def fetch_rsi(
    symbol: str, interval: str = "daily", time_period: int = 14
) -> List[Dict[str, Any]]:
    """Fetch RSI technical indicator."""
    data = await _get({
        "function":    "RSI",
        "symbol":      symbol,
        "interval":    interval,
        "time_period": str(time_period),
        "series_type": "close",
    })
    if not data:
        return []

    series = data.get("Technical Analysis: RSI", {})
    results = [
        {"date": dt, "value": float(v["RSI"])}
        for dt, v in series.items()
    ]
    results.sort(key=lambda x: x["date"])
    return results[-30:]


async def fetch_macd(symbol: str) -> List[Dict[str, Any]]:
    """Fetch MACD technical indicator."""
    data = await _get({
        "function":    "MACD",
        "symbol":      symbol,
        "interval":    "daily",
        "series_type": "close",
    })
    if not data:
        return []

    series = data.get("Technical Analysis: MACD", {})
    results = [
        {
            "date":   dt,
            "macd":   float(v["MACD"]),
            "signal": float(v["MACD_Signal"]),
            "hist":   float(v["MACD_Hist"]),
        }
        for dt, v in series.items()
    ]
    results.sort(key=lambda x: x["date"])
    return results[-30:]


# ══════════════════════════════════════════════════════════════════════════════
# NEWS & SENTIMENT
# ══════════════════════════════════════════════════════════════════════════════

async def fetch_news(
    tickers: List[str], limit: int = 10
) -> List[Dict[str, Any]]:
    """Fetch news articles with sentiment scores for given tickers."""
    data = await _get({
        "function": "NEWS_SENTIMENT",
        "tickers":  ",".join(tickers),
        "limit":    str(limit),
    })
    if not data:
        return []

    feed = data.get("feed", [])
    results = []
    for item in feed:
        results.append({
            "title":                  item.get("title"),
            "url":                    item.get("url"),
            "time_published":         item.get("time_published"),
            "summary":                item.get("summary"),
            "source":                 item.get("source"),
            "overall_sentiment_score": float(item.get("overall_sentiment_score", 0)),
            "overall_sentiment_label": item.get("overall_sentiment_label"),
            "ticker_sentiment": [
                {
                    "ticker": ts.get("ticker"),
                    "score":  float(ts.get("ticker_sentiment_score", 0)),
                    "label":  ts.get("ticker_sentiment_label"),
                }
                for ts in item.get("ticker_sentiment", [])
            ],
        })
    return results
