import { useState, useEffect, useCallback } from 'react';
import {
  isAlphaVantageConfigured,
  fetchAVQuote,
  getAVRateStatus,
  incrementAVRequestCount,
} from '@/services/alphaVantageService';
import { API_BASE_URL } from '@/config/api';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: string;
  sector?: string;
  lastUpdated: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface StockHistoryPoint {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export const STOCK_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'XOM', 'TSM'];
const INDEX_SYMBOLS = ['^GSPC', '^DJI', '^IXIC', '^VIX', '^TNX'];

export const INDEX_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^DJI': 'Dow Jones',
  '^IXIC': 'NASDAQ',
  '^VIX': 'VIX',
  '^TNX': '10Y Treasury',
};

export const STOCK_META: Record<string, { name: string; sector: string }> = {
  NVDA:  { name: 'NVIDIA Corp',      sector: 'Semiconductors' },
  AAPL:  { name: 'Apple Inc',         sector: 'Technology' },
  MSFT:  { name: 'Microsoft Corp',    sector: 'Technology' },
  GOOGL: { name: 'Alphabet Inc',      sector: 'Technology' },
  AMZN:  { name: 'Amazon.com Inc',    sector: 'Consumer' },
  META:  { name: 'Meta Platforms',    sector: 'Technology' },
  TSLA:  { name: 'Tesla Inc',         sector: 'Auto' },
  JPM:   { name: 'JPMorgan Chase',    sector: 'Financials' },
  XOM:   { name: 'Exxon Mobil',       sector: 'Energy' },
  TSM:   { name: 'TSMC',              sector: 'Semiconductors' },
};

// ── Source 1: Yahoo Finance via CORS proxy ────────────────────────────────────
async function fetchFromYahoo(symbols: string[]): Promise<Map<string, StockQuote | MarketIndex>> {
  const results = new Map<string, StockQuote | MarketIndex>();
  const symbolStr = symbols.join(',');
  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolStr}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,marketCap,shortName`
  )}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Yahoo API failed');
    const data = await response.json();

    if (data?.quoteResponse?.result) {
      for (const quote of data.quoteResponse.result) {
        const sym = quote.symbol;
        const now = new Date().toLocaleTimeString();

        if (sym.startsWith('^')) {
          results.set(sym, {
            symbol: sym,
            name: INDEX_NAMES[sym] || quote.shortName || sym,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            lastUpdated: now,
          });
        } else {
          const meta = STOCK_META[sym] || { name: quote.shortName || sym, sector: 'Unknown' };
          results.set(sym, {
            symbol: sym,
            name: meta.name,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            previousClose: quote.regularMarketPreviousClose || 0,
            open: quote.regularMarketOpen || 0,
            high: quote.regularMarketDayHigh || 0,
            low: quote.regularMarketDayLow || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap ? formatMarketCap(quote.marketCap) : undefined,
            sector: meta.sector,
            lastUpdated: now,
          });
        }
      }
    }
  } catch {
    // Fallback handled below
  }

  return results;
}

// ── Source 2: Alpha Vantage ───────────────────────────────────────────────────
// Fetches sequentially to respect rate limits.
// Only runs if VITE_ALPHA_VANTAGE_API_KEY is configured and within daily quota.
async function fetchFromAlphaVantage(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  if (!isAlphaVantageConfigured()) return results;

  const rateStatus = getAVRateStatus();
  if (!rateStatus.withinLimit) {
    console.warn('[Alpha Vantage] Daily quota (25 req) reached — skipping');
    return results;
  }

  const cleanSymbols = symbols.filter(s => !s.startsWith('^'));
  // Only fetch up to remaining quota
  const remaining = 25 - rateStatus.requestsToday;
  const toFetch = cleanSymbols.slice(0, Math.min(remaining, cleanSymbols.length));

  for (const sym of toFetch) {
    try {
      const q = await fetchAVQuote(sym);
      incrementAVRequestCount();

      if (q && q.price > 0) {
        const meta = STOCK_META[sym] || { name: sym, sector: 'Unknown' };
        results.set(sym, {
          symbol: sym,
          name: meta.name,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          previousClose: q.previousClose,
          open: q.open,
          high: q.high,
          low: q.low,
          volume: q.volume,
          sector: meta.sector,
          lastUpdated: new Date().toLocaleTimeString(),
        });
      }
      // Small delay to avoid hammering AV rate limits
      await new Promise(r => setTimeout(r, 250));
    } catch {
      // Skip this symbol
    }
  }

  return results;
}

// ── Source 3: Twelve Data ─────────────────────────────────────────────────────
async function fetchFromTwelveData(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  const cleanSymbols = symbols.filter(s => !s.startsWith('^'));
  if (cleanSymbols.length === 0) return results;

  const apiKey = import.meta.env.VITE_TWELVEDATA_API_KEY || 'demo';

  try {
    const symbolStr = cleanSymbols.join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${symbolStr}&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Twelve Data failed');
    const data = await response.json();

    const processQuote = (quote: Record<string, string | number>, sym: string) => {
      if (quote && quote.close) {
        const meta = STOCK_META[sym] || { name: String(quote.name || sym), sector: 'Unknown' };
        const price = parseFloat(String(quote.close));
        const prevClose = parseFloat(String(quote.previous_close || quote.close));
        const change = price - prevClose;
        const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

        results.set(sym, {
          symbol: sym,
          name: meta.name,
          price,
          change,
          changePercent: changePct,
          previousClose: prevClose,
          open: parseFloat(String(quote.open || 0)),
          high: parseFloat(String(quote.high || 0)),
          low: parseFloat(String(quote.low || 0)),
          volume: parseInt(String(quote.volume || 0)),
          sector: meta.sector,
          lastUpdated: new Date().toLocaleTimeString(),
        });
      }
    };

    if (cleanSymbols.length === 1) {
      processQuote(data, cleanSymbols[0]);
    } else if (data) {
      for (const sym of cleanSymbols) {
        if (data[sym]) processQuote(data[sym], sym);
      }
    }
  } catch {
    // Silently fail
  }

  return results;
}

// ── Source 4: Finnhub ─────────────────────────────────────────────────────────
async function fetchFromFinnhub(symbols: string[]): Promise<Map<string, Partial<StockQuote>>> {
  const results = new Map<string, Partial<StockQuote>>();
  const cleanSymbols = symbols.filter(s => !s.startsWith('^')).slice(0, 5);
  const apiKey = import.meta.env.VITE_FINNHUB_API_KEY || 'demo';

  try {
    const promises = cleanSymbols.map(async (sym) => {
      const url = `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.c > 0) {
        results.set(sym, {
          symbol: sym,
          price: data.c,
          change: data.d || 0,
          changePercent: data.dp || 0,
          previousClose: data.pc || 0,
          open: data.o || 0,
          high: data.h || 0,
          low: data.l || 0,
        });
      }
    });
    await Promise.allSettled(promises);
  } catch {
    // Silently fail
  }

  return results;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function generateFallbackData(): { stocks: StockQuote[]; indices: MarketIndex[] } {
  const baseDate = new Date().toLocaleTimeString();

  const stockBases: Record<string, number> = {
    NVDA: 135.40, AAPL: 198.50, MSFT: 442.20, GOOGL: 176.80,
    AMZN: 197.30, META: 510.90, TSLA: 248.40, JPM: 218.60,
    XOM: 108.90, TSM: 175.60,
  };

  const indexBases: Record<string, number> = {
    '^GSPC': 5435.20, '^DJI': 39872.50, '^IXIC': 17080.40, '^VIX': 16.80, '^TNX': 4.28,
  };

  const stocks: StockQuote[] = STOCK_SYMBOLS.map(sym => {
    const base = stockBases[sym] || 100;
    const changePct = (Math.random() - 0.48) * 4;
    const change = base * changePct / 100;
    const meta = STOCK_META[sym];
    return {
      symbol: sym,
      name: meta.name,
      price: +(base + change).toFixed(2),
      change: +change.toFixed(2),
      changePercent: +changePct.toFixed(2),
      previousClose: base,
      open: +(base + (Math.random() - 0.5) * 2).toFixed(2),
      high: +(base + Math.abs(change) + Math.random() * 2).toFixed(2),
      low: +(base - Math.abs(change) - Math.random() * 2).toFixed(2),
      volume: Math.floor(Math.random() * 50000000) + 10000000,
      sector: meta.sector,
      lastUpdated: baseDate,
    };
  });

  const indices: MarketIndex[] = INDEX_SYMBOLS.map(sym => {
    const base = indexBases[sym] || 1000;
    const isVix = sym === '^VIX';
    const changePct = isVix ? (Math.random() - 0.3) * 8 : (Math.random() - 0.48) * 2;
    const change = base * changePct / 100;
    return {
      symbol: sym,
      name: INDEX_NAMES[sym] || sym,
      price: +(base + change).toFixed(2),
      change: +change.toFixed(2),
      changePercent: +changePct.toFixed(2),
      lastUpdated: baseDate,
    };
  });

  return { stocks, indices };
}

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useStockData() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('loading');
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const allSymbols = [...STOCK_SYMBOLS, ...INDEX_SYMBOLS];

    // ── 1. Try Yahoo Finance ──────────────────────────────────────────────────
    const yahooData = await fetchFromYahoo(allSymbols);

    if (yahooData.size >= 5) {
      const stockList: StockQuote[] = [];
      const indexList: MarketIndex[] = [];

      for (const sym of STOCK_SYMBOLS) {
        const d = yahooData.get(sym);
        if (d && 'previousClose' in d) stockList.push(d as StockQuote);
      }
      for (const sym of INDEX_SYMBOLS) {
        const d = yahooData.get(sym);
        if (d) indexList.push(d as MarketIndex);
      }

      if (stockList.length > 0) {
        setStocks(stockList);
        setIndices(indexList);
        setDataSource('Yahoo Finance (Live)');
        setLastRefresh(new Date().toLocaleTimeString());
        setLoading(false);
        return;
      }
    }

    // ── 2. Try Alpha Vantage ──────────────────────────────────────────────────
    if (isAlphaVantageConfigured()) {
      const avData = await fetchFromAlphaVantage(STOCK_SYMBOLS);
      if (avData.size >= 3) {
        const stockList: StockQuote[] = [];
        for (const sym of STOCK_SYMBOLS) {
          const d = avData.get(sym);
          if (d) stockList.push(d);
        }
        if (stockList.length > 0) {
          setStocks(stockList);
          setDataSource(`Alpha Vantage (Live) — ${getAVRateStatus().requestsToday}/25 req today`);
          setLastRefresh(new Date().toLocaleTimeString());
          setLoading(false);
          return;
        }
      }
    }

    // ── 3. Try Twelve Data ────────────────────────────────────────────────────
    const twelveData = await fetchFromTwelveData(STOCK_SYMBOLS);
    if (twelveData.size >= 3) {
      const stockList: StockQuote[] = [];
      for (const sym of STOCK_SYMBOLS) {
        const d = twelveData.get(sym);
        if (d) stockList.push(d);
      }
      if (stockList.length > 0) {
        setStocks(stockList);
        setDataSource('Twelve Data (Live)');
        setLastRefresh(new Date().toLocaleTimeString());
        setLoading(false);
        return;
      }
    }

    // ── 4. Try Finnhub ────────────────────────────────────────────────────────
    const finnhubData = await fetchFromFinnhub(STOCK_SYMBOLS);
    if (finnhubData.size >= 2) {
      const stockList: StockQuote[] = STOCK_SYMBOLS.map(sym => {
        const d = finnhubData.get(sym);
        const meta = STOCK_META[sym];
        return {
          symbol: sym,
          name: meta.name,
          price: d?.price || 0,
          change: d?.change || 0,
          changePercent: d?.changePercent || 0,
          previousClose: d?.previousClose || 0,
          open: d?.open || 0,
          high: d?.high || 0,
          low: d?.low || 0,
          volume: 0,
          sector: meta.sector,
          lastUpdated: new Date().toLocaleTimeString(),
        };
      }).filter(s => s.price > 0);

      if (stockList.length > 0) {
        setStocks(stockList);
        setDataSource('Finnhub (Live)');
        setLastRefresh(new Date().toLocaleTimeString());
        setLoading(false);
        return;
      }
    }

    // ── 5. Simulated fallback ─────────────────────────────────────────────────
    const fallback = generateFallbackData();
    setStocks(fallback.stocks);
    setIndices(fallback.indices);
    setDataSource('Simulated (APIs unavailable)');
    setError('Live APIs unavailable — showing simulated market data');
    setLastRefresh(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { stocks, indices, loading, error, dataSource, lastRefresh, refetch: fetchData };
}

// ── Stock History Hook ────────────────────────────────────────────────────────
export function useStockHistory(symbol: string) {
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);

      // Try Yahoo Finance first
      try {
        const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1h`
        )}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();

        const result = data?.chart?.result?.[0];
        if (result) {
          const timestamps = result.timestamp || [];
          const quotes = result.indicators?.quote?.[0] || {};
          const points: StockHistoryPoint[] = [];

          for (let i = 0; i < timestamps.length; i++) {
            if (quotes.close?.[i]) {
              points.push({
                date: new Date(timestamps[i] * 1000).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                }),
                close: +(quotes.close[i]).toFixed(2),
                open: +(quotes.open?.[i] || 0).toFixed(2),
                high: +(quotes.high?.[i] || 0).toFixed(2),
                low: +(quotes.low?.[i] || 0).toFixed(2),
                volume: quotes.volume?.[i] || 0,
              });
            }
          }

          if (points.length > 0) {
            setHistory(points);
            setLoading(false);
            return;
          }
        }
      } catch { /* fall through */ }

      // Try Alpha Vantage daily series as history fallback
      if (isAlphaVantageConfigured()) {
        try {
          const { fetchAVDailySeries } = await import('@/services/alphaVantageService');
          const bars = await fetchAVDailySeries(symbol, 'compact');
          if (bars.length > 0) {
            const points: StockHistoryPoint[] = bars.map(b => ({
              date: b.date,
              close: b.close,
              open: b.open,
              high: b.high,
              low: b.low,
              volume: b.volume,
            }));
            setHistory(points);
            setLoading(false);
            return;
          }
        } catch { /* fall through */ }
      }

      // Synthetic fallback
      const points: StockHistoryPoint[] = [];
      let base = 100 + Math.random() * 100;
      for (let i = 0; i < 40; i++) {
        const change = (Math.random() - 0.48) * 3;
        base = Math.max(base + change, 10);
        const date = new Date();
        date.setHours(date.getHours() - (40 - i));
        points.push({
          date: date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          close: +base.toFixed(2),
          open: +(base - change * 0.5).toFixed(2),
          high: +(base + Math.abs(change)).toFixed(2),
          low: +(base - Math.abs(change)).toFixed(2),
          volume: Math.floor(Math.random() * 10000000),
        });
      }
      setHistory(points);
      setLoading(false);
    }

    fetchHistory();
  }, [symbol]);

  return { history, loading };
}
