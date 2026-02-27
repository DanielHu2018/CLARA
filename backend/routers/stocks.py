"""
CLARA — Stock Data Router
GET /api/stocks/quote/{symbol}
GET /api/stocks/quotes          (batch)
GET /api/stocks/history/{symbol}
GET /api/stocks/overview/{symbol}
GET /api/stocks/search
GET /api/stocks/news
GET /api/stocks/status          (data source status)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List

from models.schemas import StockQuote, PriceBar, StockQuoteRequest
from services import stock_data as sd
from services.alpha_vantage import get_rate_status

router = APIRouter()


@router.get("/quote/{symbol}", response_model=dict, summary="Live quote for a single symbol")
async def get_quote(symbol: str):
    """Fetch a real-time stock quote. Falls back through: Alpha Vantage → Yahoo Finance → Simulated."""
    result = await sd.get_quote(symbol.upper())
    if not result:
        raise HTTPException(status_code=404, detail=f"Quote not found for {symbol}")
    return result


@router.post("/quotes", response_model=dict, summary="Batch quotes for multiple symbols")
async def get_quotes_batch(request: StockQuoteRequest):
    """Fetch quotes for up to 50 symbols concurrently."""
    symbols = [s.upper() for s in request.symbols]
    return await sd.get_quotes_batch(symbols)


@router.get("/quotes", response_model=dict, summary="Batch quotes via query param")
async def get_quotes_query(symbols: str = Query(..., description="Comma-separated tickers e.g. AAPL,MSFT,NVDA")):
    """Fetch quotes for multiple symbols (GET convenience endpoint)."""
    symbol_list = [s.strip().upper() for s in symbols.split(",")][:50]
    return await sd.get_quotes_batch(symbol_list)


@router.get("/history/{symbol}", response_model=List[dict], summary="Price history bars")
async def get_history(
    symbol: str,
    days: int = Query(90, ge=1, le=365, description="Number of calendar days"),
):
    """Fetch daily OHLCV price history for charting."""
    bars = await sd.get_history(symbol.upper(), days)
    if not bars:
        raise HTTPException(status_code=404, detail=f"History not found for {symbol}")
    return bars


@router.get("/overview/{symbol}", response_model=dict, summary="Company fundamentals")
async def get_overview(symbol: str):
    """Fetch company overview: P/E, beta, 52w high/low, analyst target, sector, etc."""
    result = await sd.get_company_overview(symbol.upper())
    if not result:
        raise HTTPException(status_code=404, detail=f"Overview not found for {symbol}")
    return result


@router.get("/search", response_model=List[dict], summary="Symbol search / autocomplete")
async def search(q: str = Query(..., min_length=1, description="Search keywords")):
    """Search for stock symbols by name or ticker."""
    return await sd.search_symbol(q)


@router.get("/news", response_model=List[dict], summary="News + sentiment")
async def get_news(
    tickers: str = Query(..., description="Comma-separated tickers e.g. AAPL,NVDA"),
    limit: int = Query(10, ge=1, le=50),
):
    """Fetch news articles with AI sentiment scores via Alpha Vantage."""
    ticker_list = [t.strip().upper() for t in tickers.split(",")][:10]
    return await sd.get_news(ticker_list)


@router.get("/status", response_model=dict, summary="Data source status")
async def get_status():
    """Returns status of all stock data sources and Alpha Vantage rate limits."""
    return {
        "sources": sd.get_data_source_status(),
        "alpha_vantage_rate": get_rate_status(),
        "available_symbols": list(sd.COMPANY_META.keys()),
    }
