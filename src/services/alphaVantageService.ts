// ─────────────────────────────────────────────────────────────────────────────
// Alpha Vantage API Service
// https://www.alphavantage.co/documentation/
//
// Free tier: 25 requests/day, 25 requests/minute
// Set VITE_ALPHA_VANTAGE_API_KEY in your .env file to enable live data.
// ─────────────────────────────────────────────────────────────────────────────

const AV_BASE = 'https://www.alphavantage.co/query';

function getKey(): string {
  return import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';
}

export function isAlphaVantageConfigured(): boolean {
  const key = getKey();
  return key.length > 0 && key !== 'your_alpha_vantage_key_here';
}

export interface AVQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

export interface AVDailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AVCompanyOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: string;
  peRatio: string;
  weekHigh52: string;
  weekLow52: string;
  dividendYield: string;
  eps: string;
  beta: string;
  analystTargetPrice: string;
  exDividendDate: string;
  forwardPE: string;
  priceToBookRatio: string;
}

export interface AVSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: string;
}

// ── Global Quote ──────────────────────────────────────────────────────────────
export async function fetchAVQuote(symbol: string): Promise<AVQuote | null> {
  if (!isAlphaVantageConfigured()) return null;

  try {
    const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note']) {
      console.warn('[Alpha Vantage] Rate limit reached:', data['Note']);
      return null;
    }
    if (data['Information']) {
      console.warn('[Alpha Vantage] API Info:', data['Information']);
      return null;
    }

    const q = data['Global Quote'];
    if (!q || !q['05. price']) return null;

    const price = parseFloat(q['05. price']);
    const prevClose = parseFloat(q['08. previous close']);
    const change = parseFloat(q['09. change']);
    const changePct = parseFloat(q['10. change percent']?.replace('%', '') || '0');

    return {
      symbol: q['01. symbol'],
      open: parseFloat(q['02. open']),
      high: parseFloat(q['03. high']),
      low: parseFloat(q['04. low']),
      price,
      volume: parseInt(q['06. volume']),
      previousClose: prevClose,
      change,
      changePercent: changePct,
      lastUpdated: q['07. latest trading day'],
    };
  } catch (err) {
    console.error(`[Alpha Vantage] fetchAVQuote(${symbol}) failed:`, err);
    return null;
  }
}

// ── Batch Quotes (sequential, rate-limit safe) ────────────────────────────────
export async function fetchAVQuoteBatch(
  symbols: string[],
  delayMs = 300
): Promise<Map<string, AVQuote>> {
  const results = new Map<string, AVQuote>();
  if (!isAlphaVantageConfigured()) return results;

  for (const sym of symbols) {
    const q = await fetchAVQuote(sym);
    if (q) results.set(sym, q);
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}

// ── Daily Time Series (for charts) ───────────────────────────────────────────
export async function fetchAVDailySeries(
  symbol: string,
  outputsize: 'compact' | 'full' = 'compact'
): Promise<AVDailyBar[]> {
  if (!isAlphaVantageConfigured()) return [];

  try {
    const url = `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information']) {
      console.warn('[Alpha Vantage] Rate limited on daily series');
      return [];
    }

    const series = data['Time Series (Daily)'];
    if (!series) return [];

    return Object.entries(series)
      .map(([date, bar]) => {
        const b = bar as Record<string, string>;
        return {
          date,
          open: parseFloat(b['1. open']),
          high: parseFloat(b['2. high']),
          low: parseFloat(b['3. low']),
          close: parseFloat(b['4. close']),
          volume: parseInt(b['5. volume']),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90); // Last 90 trading days
  } catch (err) {
    console.error(`[Alpha Vantage] fetchAVDailySeries(${symbol}) failed:`, err);
    return [];
  }
}

// ── Intraday Time Series ──────────────────────────────────────────────────────
export async function fetchAVIntraday(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '60min' = '60min'
): Promise<AVDailyBar[]> {
  if (!isAlphaVantageConfigured()) return [];

  try {
    const url = `${AV_BASE}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information']) {
      console.warn('[Alpha Vantage] Rate limited on intraday');
      return [];
    }

    const key = `Time Series (${interval})`;
    const series = data[key];
    if (!series) return [];

    return Object.entries(series)
      .map(([date, bar]) => {
        const b = bar as Record<string, string>;
        return {
          date,
          open: parseFloat(b['1. open']),
          high: parseFloat(b['2. high']),
          low: parseFloat(b['3. low']),
          close: parseFloat(b['4. close']),
          volume: parseInt(b['5. volume']),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error(`[Alpha Vantage] fetchAVIntraday(${symbol}) failed:`, err);
    return [];
  }
}

// ── Company Overview ──────────────────────────────────────────────────────────
export async function fetchAVOverview(symbol: string): Promise<AVCompanyOverview | null> {
  if (!isAlphaVantageConfigured()) return null;

  try {
    const url = `${AV_BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information'] || !data['Symbol']) return null;

    return {
      symbol: data['Symbol'],
      name: data['Name'],
      description: data['Description'],
      sector: data['Sector'],
      industry: data['Industry'],
      marketCap: data['MarketCapitalization'],
      peRatio: data['PERatio'],
      weekHigh52: data['52WeekHigh'],
      weekLow52: data['52WeekLow'],
      dividendYield: data['DividendYield'],
      eps: data['EPS'],
      beta: data['Beta'],
      analystTargetPrice: data['AnalystTargetPrice'],
      exDividendDate: data['ExDividendDate'],
      forwardPE: data['ForwardPE'],
      priceToBookRatio: data['PriceToBookRatio'],
    };
  } catch (err) {
    console.error(`[Alpha Vantage] fetchAVOverview(${symbol}) failed:`, err);
    return null;
  }
}

// ── Symbol Search ─────────────────────────────────────────────────────────────
export async function searchAVSymbol(keywords: string): Promise<AVSearchResult[]> {
  if (!isAlphaVantageConfigured()) return [];

  try {
    const url = `${AV_BASE}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information']) return [];

    const matches = data['bestMatches'] || [];
    return matches.map((m: Record<string, string>) => ({
      symbol: m['1. symbol'],
      name: m['2. name'],
      type: m['3. type'],
      region: m['4. region'],
      currency: m['8. currency'],
      matchScore: m['9. matchScore'],
    }));
  } catch (err) {
    console.error(`[Alpha Vantage] searchAVSymbol(${keywords}) failed:`, err);
    return [];
  }
}

// ── RSI ───────────────────────────────────────────────────────────────────────
export async function fetchAVRSI(
  symbol: string,
  interval: 'daily' | 'weekly' = 'daily',
  timePeriod = 14
): Promise<{ date: string; value: number }[]> {
  if (!isAlphaVantageConfigured()) return [];

  try {
    const url = `${AV_BASE}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information']) return [];

    const series = data['Technical Analysis: RSI'];
    if (!series) return [];

    return Object.entries(series)
      .map(([date, val]) => ({ date, value: parseFloat((val as Record<string, string>)['RSI']) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  } catch (err) {
    console.error(`[Alpha Vantage] fetchAVRSI(${symbol}) failed:`, err);
    return [];
  }
}

// ── MACD ──────────────────────────────────────────────────────────────────────
export async function fetchAVMACD(symbol: string): Promise<{ date: string; macd: number; signal: number; hist: number }[]> {
  if (!isAlphaVantageConfigured()) return [];

  try {
    const url = `${AV_BASE}?function=MACD&symbol=${symbol}&interval=daily&series_type=close&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information']) return [];

    const series = data['Technical Analysis: MACD'];
    if (!series) return [];

    return Object.entries(series)
      .map(([date, val]) => {
        const v = val as Record<string, string>;
        return {
          date,
          macd: parseFloat(v['MACD']),
          signal: parseFloat(v['MACD_Signal']),
          hist: parseFloat(v['MACD_Hist']),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  } catch (err) {
    console.error(`[Alpha Vantage] fetchAVMACD(${symbol}) failed:`, err);
    return [];
  }
}

// ── News & Sentiment ──────────────────────────────────────────────────────────
export interface AVNewsItem {
  title: string;
  url: string;
  timePublished: string;
  summary: string;
  source: string;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  tickerSentiment: { ticker: string; score: string; label: string }[];
}

export async function fetchAVNews(
  tickers: string[],
  limit = 10
): Promise<AVNewsItem[]> {
  if (!isAlphaVantageConfigured()) return [];

  try {
    const tickerStr = tickers.join(',');
    const url = `${AV_BASE}?function=NEWS_SENTIMENT&tickers=${tickerStr}&limit=${limit}&apikey=${getKey()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data['Note'] || data['Information']) return [];

    const feed = data['feed'] || [];
    return feed.map((item: Record<string, unknown>) => ({
      title: item['title'] as string,
      url: item['url'] as string,
      timePublished: item['time_published'] as string,
      summary: item['summary'] as string,
      source: item['source'] as string,
      overallSentimentScore: parseFloat(String(item['overall_sentiment_score'] || '0')),
      overallSentimentLabel: item['overall_sentiment_label'] as string,
      tickerSentiment: ((item['ticker_sentiment'] as Record<string, string>[]) || []).map(ts => ({
        ticker: ts['ticker'],
        score: ts['ticker_sentiment_score'],
        label: ts['ticker_sentiment_label'],
      })),
    }));
  } catch (err) {
    console.error('[Alpha Vantage] fetchAVNews failed:', err);
    return [];
  }
}

// ── Rate Limit Tracker ────────────────────────────────────────────────────────
const RATE_KEY = 'CLARA_av_rate';

export interface AVRateStatus {
  requestsToday: number;
  lastReset: string;
  withinLimit: boolean;
}

export function getAVRateStatus(): AVRateStatus {
  try {
    const stored = localStorage.getItem(RATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AVRateStatus;
      const today = new Date().toDateString();
      if (parsed.lastReset !== today) {
        const fresh = { requestsToday: 0, lastReset: today, withinLimit: true };
        localStorage.setItem(RATE_KEY, JSON.stringify(fresh));
        return fresh;
      }
      return { ...parsed, withinLimit: parsed.requestsToday < 25 };
    }
  } catch { /* ignore */ }

  const fresh: AVRateStatus = {
    requestsToday: 0,
    lastReset: new Date().toDateString(),
    withinLimit: true,
  };
  localStorage.setItem(RATE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function incrementAVRequestCount(): void {
  try {
    const status = getAVRateStatus();
    const updated = { ...status, requestsToday: status.requestsToday + 1 };
    localStorage.setItem(RATE_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}
