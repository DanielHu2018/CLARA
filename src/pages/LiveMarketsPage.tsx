import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useStockData, useStockHistory } from '@/hooks/useStockData';
import type { StockQuote } from '@/hooks/useStockData';
import { RefreshCw, TrendingUp, TrendingDown, Wifi, WifiOff, ArrowUpRight, ArrowDownRight, BarChart3, Activity, Settings2, Briefcase } from 'lucide-react';
import { ApiSettingsPanel } from '@/components/ApiSettingsPanel';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell
} from 'recharts';

function StockDetailChart({ symbol }: { symbol: string }) {
  const { history, loading } = useStockHistory(symbol);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <RefreshCw size={14} className="animate-spin" />
          Loading chart data...
        </div>
      </div>
    );
  }

  const firstClose = history[0]?.close || 0;
  const lastClose = history[history.length - 1]?.close || 0;
  const isUp = lastClose >= firstClose;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: '#64748b' }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          interval={Math.floor(history.length / 6)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth={2}
          fill={`url(#grad-${symbol})`}
          dot={false}
          name="Price"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function VolumeChart({ stocks }: { stocks: StockQuote[] }) {
  const data = stocks
    .filter(s => s.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map(s => ({
      name: s.symbol,
      volume: s.volume / 1e6,
      change: s.changePercent,
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}M`, 'Volume']}
        />
        <Bar dataKey="volume" name="Volume (M)" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.change >= 0 ? '#10b981' : '#ef4444'} opacity={0.6} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LiveMarketsPage() {
  const { stocks, indices, loading, error, dataSource, lastRefresh, refetch } = useStockData();
  const { getSelectedSymbols, hasSelections } = usePortfolioContext();
  const [selectedStock, setSelectedStock] = useState<string>('NVDA');
  const [sortBy, setSortBy] = useState<'symbol' | 'changePercent' | 'volume'>('changePercent');
  const [view, setView] = useState<'markets' | 'api'>('markets');

  // Filter stocks based on portfolio selections
  const displayStocks = useMemo(() => {
    if (!hasSelections) return stocks;
    const selectedSymbols = new Set(getSelectedSymbols());
    return stocks.filter(s => selectedSymbols.has(s.symbol));
  }, [stocks, hasSelections, getSelectedSymbols]);

  // Auto-select first portfolio stock if current selection is not in portfolio
  useEffect(() => {
    if (hasSelections && displayStocks.length > 0 && !displayStocks.find(s => s.symbol === selectedStock)) {
      setSelectedStock(displayStocks[0].symbol);
    }
  }, [hasSelections, displayStocks, selectedStock]);

  const selected = displayStocks.find(s => s.symbol === selectedStock) || displayStocks[0];

  const sortedStocks = [...displayStocks].sort((a, b) => {
    if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
    if (sortBy === 'changePercent') return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    return b.volume - a.volume;
  });

  const gainers = displayStocks.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
  const losers = displayStocks.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
  const avgChange = displayStocks.length > 0 ? displayStocks.reduce((s, x) => s + x.changePercent, 0) / displayStocks.length : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Live Market Data
            {hasSelections && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-orange-400 bg-orange-950/50 border border-orange-800/50 rounded-full px-2 py-0.5">
                <Briefcase size={10} />
                Portfolio Filter: {displayStocks.length} stocks
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {hasSelections 
              ? 'Showing only stocks from your Portfolio Risk selection' 
              : 'Real-time stock quotes & market indices — auto-refreshes every 30 seconds'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {error ? (
              <WifiOff size={13} className="text-amber-500" />
            ) : (
              <Wifi size={13} className="text-orange-400" />
            )}
            <span className="text-[10px] text-zinc-500">{dataSource}</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-orange-800 bg-orange-950/50 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-900/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-0">
        <button
          onClick={() => setView('markets')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer -mb-px',
            view === 'markets'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          )}
        >
          <Activity size={13} /> Live Markets
        </button>
        <button
          onClick={() => setView('api')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer -mb-px',
            view === 'api'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          )}
        >
          <Settings2 size={13} /> API Settings
        </button>
      </div>

      {/* API Settings View */}
      {view === 'api' && <ApiSettingsPanel />}

      {/* Markets View */}
      {view === 'markets' && error && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-2 text-xs text-amber-400">
          ⚠ {error} —{' '}
          <button onClick={() => setView('api')} className="underline text-orange-400 cursor-pointer">
            Configure API keys →
          </button>
        </div>
      )}

      {view === 'markets' && (<>

      {/* Market Summary KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {indices.length > 0 ? (
          indices.map(idx => (
            <div key={idx.symbol} className={cn(
              'rounded-lg border p-3',
              idx.change >= 0 ? 'border-orange-900/50 bg-orange-950/20' : 'border-red-900/50 bg-red-950/20'
            )}>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{idx.name}</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {idx.symbol === '^VIX' || idx.symbol === '^TNX'
                  ? idx.price.toFixed(2)
                  : idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={cn('text-[10px] font-mono font-semibold flex items-center gap-0.5 mt-1', idx.change >= 0 ? 'text-orange-400' : 'text-red-400')}>
                {idx.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {idx.change >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-6 rounded-lg border border-zinc-800 bg-black/50 p-3 text-center text-xs text-zinc-500">
            {loading ? 'Loading market indices...' : 'Market index data unavailable'}
          </div>
        )}
        {indices.length > 0 && indices.length < 6 && (
          <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Portfolio Avg</div>
            <div className={cn('text-lg font-bold font-mono mt-0.5', avgChange >= 0 ? 'text-orange-400' : 'text-red-400')}>
              {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
            </div>
            <div className="text-[10px] text-zinc-600 mt-1">Tracked stocks</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Stock List */}
        <div className="col-span-5 rounded-xl border border-zinc-800 bg-black/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Portfolio Holdings</h3>
            </div>
            <div className="flex items-center gap-1">
              {(['changePercent', 'volume', 'symbol'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[9px] uppercase font-semibold cursor-pointer transition-colors',
                    sortBy === s ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {s === 'changePercent' ? 'Change' : s}
                </button>
              ))}
            </div>
          </div>

          {loading && stocks.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <RefreshCw size={14} className="animate-spin" />
                Fetching live market data...
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
              {sortedStocks.map(stock => (
                <div
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={cn(
                    'group rounded-lg border p-3 transition-all cursor-pointer',
                    selectedStock === stock.symbol
                      ? 'border-orange-700 bg-orange-950/20'
                      : 'border-zinc-800 bg-black/50 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold',
                        stock.changePercent >= 0 ? 'bg-orange-500/15 text-orange-400' : 'bg-red-500/15 text-red-400'
                      )}>
                        {stock.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{stock.symbol}</span>
                          {stock.sector && (
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-500">{stock.sector}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500">{stock.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-white">
                        ${stock.price.toFixed(2)}
                      </div>
                      <div className={cn(
                        'text-[11px] font-mono font-semibold flex items-center justify-end gap-0.5',
                        stock.changePercent >= 0 ? 'text-orange-400' : 'text-red-400'
                      )}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        <span className="text-zinc-600 ml-1">
                          ({stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                  {stock.volume > 0 && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-600">
                      <span>Vol: {(stock.volume / 1e6).toFixed(1)}M</span>
                      {stock.marketCap && <span>MCap: {stock.marketCap}</span>}
                      <span>O: ${stock.open.toFixed(2)}</span>
                      <span>H: ${stock.high.toFixed(2)}</span>
                      <span>L: ${stock.low.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="col-span-7 space-y-4">
          {selected ? (
            <>
              {/* Stock Header */}
              <div className={cn(
                'rounded-xl border p-5',
                selected.changePercent >= 0 ? 'border-orange-900/50 bg-orange-950/10' : 'border-red-900/50 bg-red-950/10'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-white">{selected.symbol}</h3>
                      {selected.sector && (
                        <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-[10px] text-zinc-300">
                          {selected.sector}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{selected.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold font-mono text-white">${selected.price.toFixed(2)}</div>
                    <div className={cn(
                      'text-sm font-mono font-semibold flex items-center justify-end gap-1 mt-1',
                      selected.changePercent >= 0 ? 'text-orange-400' : 'text-red-400'
                    )}>
                      {selected.changePercent >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      {selected.change >= 0 ? '+' : ''}{selected.change.toFixed(2)} ({selected.changePercent >= 0 ? '+' : ''}{selected.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* OHLCV Grid */}
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {[
                    { label: 'Open', value: `$${selected.open.toFixed(2)}` },
                    { label: 'High', value: `$${selected.high.toFixed(2)}` },
                    { label: 'Low', value: `$${selected.low.toFixed(2)}` },
                    { label: 'Prev Close', value: `$${selected.previousClose.toFixed(2)}` },
                    { label: 'Volume', value: selected.volume > 0 ? `${(selected.volume / 1e6).toFixed(1)}M` : 'N/A' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg border border-zinc-800 bg-black/50 p-2.5">
                      <div className="text-[9px] text-zinc-500 uppercase">{item.label}</div>
                      <div className="text-xs font-bold font-mono text-white mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Chart */}
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">{selected.symbol} — 5 Day Price History</h4>
                  <span className="text-[10px] text-zinc-500">Hourly intervals</span>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <StockDetailChart symbol={selected.symbol} />
                </div>
              </div>

              {/* Risk Relevance */}
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3">CLARA Risk Relevance</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Portfolio Weight</div>
                    <div className="text-lg font-bold font-mono text-orange-400 mt-1">
                      {(Math.random() * 10 + 2).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Marginal VaR</div>
                    <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                      ${(Math.random() * 5 + 1).toFixed(1)}M
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Beta to SPX</div>
                    <div className="text-lg font-bold font-mono text-purple-400 mt-1">
                      {(Math.random() * 0.8 + 0.8).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-zinc-800 bg-black/50 p-3">
                  <div className="text-[10px] text-zinc-500 uppercase mb-2">Active Events Affecting {selected.symbol}</div>
                  <div className="space-y-1.5">
                    {selected.sector === 'Semiconductors' || selected.symbol === 'TSM' ? (
                      <>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <span className="text-red-400 font-semibold">EVT-001:</span>
                          <span className="text-zinc-400">China retaliatory tariffs on semiconductors</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <span className="text-red-400 font-semibold">EVT-003:</span>
                          <span className="text-zinc-400">Taiwan Strait escalation — supply chain risk</span>
                        </div>
                      </>
                    ) : selected.sector === 'Financials' ? (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="text-amber-400 font-semibold">EVT-005:</span>
                        <span className="text-zinc-400">European bank unexpected trading losses</span>
                      </div>
                    ) : selected.sector === 'Energy' ? (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="text-amber-400 font-semibold">EVT-006:</span>
                        <span className="text-zinc-400">OPEC+ production cut extension</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                        <span className="text-zinc-400 font-semibold">EVT-004:</span>
                        <span className="text-zinc-400">CPI print 5.2% above consensus</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-800 bg-black/50">
              <p className="text-sm text-zinc-600">Select a stock to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Volume Distribution */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Volume Distribution (Millions)</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <VolumeChart stocks={stocks} />
          </div>
        </div>

        <div className="col-span-5 grid grid-rows-2 gap-4">
          {/* Gainers */}
          <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 p-4">
            <h4 className="text-xs font-semibold text-orange-400 uppercase mb-2">
              Top Gainers ({gainers.length})
            </h4>
            <div className="space-y-1.5">
              {gainers.slice(0, 4).map(s => (
                <div key={s.symbol} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{s.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white">${s.price.toFixed(2)}</span>
                    <span className="text-xs font-mono font-bold text-orange-400">+{s.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
              {gainers.length === 0 && <p className="text-[10px] text-zinc-600">No gainers today</p>}
            </div>
          </div>

          {/* Losers */}
          <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4">
            <h4 className="text-xs font-semibold text-red-400 uppercase mb-2">
              Top Losers ({losers.length})
            </h4>
            <div className="space-y-1.5">
              {losers.slice(0, 4).map(s => (
                <div key={s.symbol} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{s.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white">${s.price.toFixed(2)}</span>
                    <span className="text-xs font-mono font-bold text-red-400">{s.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
              {losers.length === 0 && <p className="text-[10px] text-zinc-600">No losers today</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Data Attribution */}
      <div className="rounded-xl border border-zinc-800 bg-black/30 px-5 py-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-600">
          <div className="flex items-center gap-3">
            <span>Data Source: {dataSource}</span>
            <span>•</span>
            <span>Last Refresh: {lastRefresh}</span>
            <span>•</span>
            <span>Auto-refresh: 30s</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Prices may be delayed. For informational purposes only.</span>
            <button
              onClick={() => setView('api')}
              className="flex items-center gap-1 text-orange-500 hover:text-orange-300 cursor-pointer hover:underline"
            >
              <Settings2 size={10} /> Configure APIs
            </button>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
