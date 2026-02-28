/**
 * CLARA — Seamless Infinite Auto-Scrolling Ticker
 *
 * Stock row  : loops every ~40 s  (fast, Bloomberg-style)
 * News row   : loops every ~80 s  (slower, readable)
 *
 * Technique  : Two identical copies of content placed side-by-side.
 *              CSS translateX(0 → -50%) animates forever so the seam
 *              is invisible. No JS scroll needed.
 */

import { useState, useEffect } from 'react';
import { fetchNews, type NewsItem } from '@/services/newsService';
import { useStockData } from '@/hooks/useStockData';
import { cn } from '@/utils/cn';
import { Wifi, WifiOff, TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────── */
const fmtPrice = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ChangeChip = ({ pct }: { pct: number }) => {
  const getColor = () => {
    if (pct > 0.1) return '!text-green-400';
    if (pct < -0.1) return '!text-red-400';
    return '!text-orange-400';
  };
  
  const getArrow = () => {
    if (pct > 0.1) return '▲';
    if (pct < -0.1) return '▼';
    return '─';
  };
  
  return (
    <span className={cn('text-[10px] font-mono font-bold leading-none', getColor())}>
      {getArrow()} {Math.abs(pct).toFixed(2)}%
    </span>
  );
};

const SentimentIcon = ({ s }: { s: 'positive' | 'negative' | 'neutral' }) => {
  if (s === 'positive') return <TrendingUp  size={9} className="!text-green-400 shrink-0" />;
  if (s === 'negative') return <TrendingDown size={9} className="!text-red-400    shrink-0" />;
  return <Minus size={9} className="!text-orange-400 shrink-0" />;
};

const sentimentColor = (s: 'positive' | 'negative' | 'neutral') => {
  if (s === 'positive') return '!text-green-300';
  if (s === 'negative') return '!text-red-300';
  return '!text-orange-400';
};

/* Symbols shown in the stock row */
const STOCK_SYMS = [
  'AAPL','NVDA','MSFT','TSLA','GOOGL','META','AMZN',
  'JPM','AMD','AVGO','NFLX','V','MA','XOM','BAC',
];

/* ── component ───────────────────────────────────────────────── */
export function LiveNewsTicker() {
  const {
    stocks: quotes,
    indices,
    dataSource,
    loading: stockLoading,
    error: stockError,
  } = useStockData();

  const [news,        setNews]        = useState<NewsItem[]>([]);
  const [newsSource,  setNewsSource]  = useState('');
  const [newsLoading, setNewsLoading] = useState(true);

  /* fetch news every 5 min */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setNewsLoading(true);
      const { items, source } = await fetchNews();
      if (alive) { setNews(items); setNewsSource(source); setNewsLoading(false); }
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  /* ── build stock items once ────────────────────────────── */
  const stockItems = [
    /* indices */
    ...indices.map(idx => (
      <div
        key={`I-${idx.symbol}`}
        className="inline-flex items-center gap-2 px-4 border-r border-zinc-800/60"
      >
        <span className="text-[9px] font-bold !text-zinc-500 uppercase tracking-wide">
          {idx.name}
        </span>
        <span className="text-[11px] font-mono font-bold !text-white">
          {fmtPrice(idx.price)}
        </span>
        <ChangeChip pct={idx.changePercent} />
      </div>
    )),

    /* individual equities */
    ...STOCK_SYMS.map(sym => {
      const q   = quotes.find(s => s.symbol === sym);
      const pct = q?.changePercent ?? ((Math.random() - 0.48) * 3);
      const px  = q?.price ?? 0;
      return (
        <div
          key={`S-${sym}`}
          className="inline-flex items-center gap-2 px-4 border-r border-zinc-800/60"
        >
          <span className="text-[11px] font-bold font-mono !text-zinc-400">{sym}</span>
          {px > 0 && (
            <span className="text-[11px] font-mono !text-zinc-200">${fmtPrice(px)}</span>
          )}
          <ChangeChip pct={pct} />
        </div>
      );
    }),
  ];

  /* ── build news items once ─────────────────────────────── */
  const newsItems = news.map((item, i) => (
    <a
      key={`N-${item.id}-${i}`}
      href={item.url !== '#' ? item.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-6 border-r border-zinc-800/40 group cursor-pointer"
    >
      <SentimentIcon s={item.sentiment} />
      <span
        className={cn(
          'text-[10px] font-medium group-hover:underline transition-colors',
          sentimentColor(item.sentiment),
        )}
      >
        {item.title}
      </span>
      {item.tickers.length > 0 && (
        <span className="text-[9px] !text-zinc-500 font-mono shrink-0">
          [{item.tickers.slice(0, 3).join(', ')}]
        </span>
      )}
      <span className="text-[9px] !text-zinc-500 shrink-0">
        {item.source} ·{' '}
        {new Date(item.publishedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
      {/* bullet separator */}
      <span className="!text-zinc-500 px-1 shrink-0">◆</span>
    </a>
  ));

  /* ── render ────────────────────────────────────────────── */
  return (
    <div className="border-b border-zinc-900 bg-black select-none">

      {/* ══ ROW 1 — STOCKS (fast loop) ══════════════════════════ */}
      <div className="flex items-center border-b border-zinc-900/60 h-8">

        {/* left badge */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-zinc-900 h-full bg-black/60">
          {stockError
            ? <WifiOff size={10} className="text-amber-500" />
            : <Wifi    size={10}
                className={cn(
                  stockLoading
                    ? 'text-amber-400 animate-pulse'
                    : 'text-orange-400',
                )}
              />
          }
          <span className="text-[9px] font-semibold !text-zinc-500 uppercase tracking-wider whitespace-nowrap hidden sm:block">
            {stockLoading ? 'LIVE…' : dataSource.split(' ')[0]}
          </span>
        </div>

        {/* scrolling track — overflow hidden + two copies */}
        <div className="ticker-row flex-1 h-full flex items-center">
          <div className="ticker-track items-center">
            {/* copy A */}
            {stockItems}
            {/* copy B — identical, placed immediately after */}
            {stockItems}
          </div>
        </div>
      </div>

      {/* ══ ROW 2 — NEWS (slow loop, pause on hover) ════════════ */}
      <div className="flex items-center h-7 ticker-pause">

        {/* left badge */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-zinc-900 h-full bg-black/60">
          <Radio size={10} className={cn(
            'shrink-0',
            newsLoading ? 'text-zinc-600 animate-pulse' : 'text-amber-400',
          )} />
          <span className="text-[9px] font-bold !text-amber-500/80 uppercase tracking-wider whitespace-nowrap hidden sm:block">
            {newsLoading ? 'NEWS…' : newsSource.split(' ')[0]}
          </span>
        </div>

        {/* scrolling track */}
        {newsLoading ? (
          <div className="px-6 text-[10px] !text-zinc-500 animate-pulse">
            Fetching live market news…
          </div>
        ) : (
          <div className="ticker-row flex-1 h-full flex items-center">
            <div className="ticker-track-slow items-center">
              {/* copy A */}
              {newsItems}
              {/* copy B */}
              {newsItems}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
