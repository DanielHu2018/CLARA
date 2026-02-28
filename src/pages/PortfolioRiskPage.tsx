import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  AlertTriangle, TrendingUp, TrendingDown, Plus, Trash2,
  RefreshCw, DollarSign, Target, Star, Info,
  ChevronUp, ChevronDown, Loader2, ShoppingCart,
  BarChart2, Wallet, Eye, Edit3, Check, X,
  PieChart, ArrowUpRight, ArrowDownRight, Zap, Shield,
  BookOpen, Database, Search, Save, FolderPlus, Folders,
  GitCompare, Pencil, ChevronRight,
} from 'lucide-react';
import { useAlertAgent } from '@/hooks/useAlertAgent';
import { AlertAgentPanel } from '@/components/AlertAgentPanel';
import { fetchPortfolioAIAnalysis, type AIAnalysisResult } from '@/services/aiAnalysisService';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import {
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  ReferenceLine, LineChart, Line, Legend,
} from 'recharts';
import { usePortfolioData, BASE_PRICES, STOCK_META } from '@/hooks/usePortfolioData';
import { useMultiPortfolio, type Portfolio, type Holding } from '@/hooks/useMultiPortfolio';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface LiveHolding extends Holding {
  name: string;
  sector: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  beta: number;
  pe: number;
  marketValue: number;
  gainLoss: number;
  gainLossPct: number;
  dayGainLoss: number;
  sellTarget: number;
  stopLoss: number;
  conservativeTarget: number;
  bullTarget: number;
  trailingStop: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  recommendation: 'Strong Hold' | 'Hold' | 'Reduce' | 'Sell';
}

interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  totalDayGain: number;
  portfolioBeta: number;
  liveHoldings: LiveHolding[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getRiskLevel(beta: number): LiveHolding['riskLevel'] {
  if (beta < 0.8) return 'Low';
  if (beta < 1.3) return 'Medium';
  if (beta < 1.8) return 'High';
  return 'Very High';
}

function getRecommendation(gainLossPct: number, pctFrom52High: number): LiveHolding['recommendation'] {
  if (gainLossPct > 80 && pctFrom52High > -5) return 'Sell';
  if (gainLossPct > 50) return 'Reduce';
  if (gainLossPct < -20) return 'Reduce';
  return gainLossPct > 25 ? 'Strong Hold' : 'Hold';
}

const RISK_COLORS: Record<string, string> = {
  Low: 'text-orange-400 bg-orange-400/10 border-orange-800/50',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-800/50',
  High: 'text-orange-400 bg-orange-400/10 border-orange-800/50',
  'Very High': 'text-red-400 bg-red-400/10 border-red-800/50',
};

const REC_COLORS: Record<string, string> = {
  'Strong Hold': 'text-orange-400',
  Hold: 'text-orange-400',
  Reduce: 'text-amber-400',
  Sell: 'text-red-400',
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#3b82f6',
  Semiconductors: '#8b5cf6',
  Financials: '#10b981',
  Healthcare: '#f59e0b',
  Energy: '#ef4444',
  Consumer: '#06b6d4',
  Automotive: '#ec4899',
  Unknown: '#64748b',
};

const POPULAR_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA',
  'JPM', 'V', 'LLY', 'AVGO', 'XOM', 'COST', 'HD', 'AMD'
];

// ─── Compute live holdings from raw holdings + quotes ─────────────────────────
function computeLiveHoldings(holdings: Holding[], getQuote: (s: string) => ReturnType<ReturnType<typeof usePortfolioData>['getQuote']>): LiveHolding[] {
  return holdings.map(h => {
    const q = getQuote(h.symbol);
    const meta = STOCK_META[h.symbol] || { name: h.symbol, sector: 'Unknown', beta: 1.0, pe: 20 };
    const base = BASE_PRICES[h.symbol] || 100;
    const price = q?.price || base;
    const prevClose = q?.previousClose || base;
    const change = q?.change || 0;
    const changePercent = q?.changePercent || 0;
    const high52w = q?.high52w || price * 1.35;
    const low52w = q?.low52w || price * 0.65;
    const marketValue = price * h.shares;
    const costBasis = h.avgCost * h.shares;
    const gainLoss = marketValue - costBasis;
    const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
    const dayGainLoss = change * h.shares;
    const pctFrom52High = ((price - high52w) / high52w) * 100;
    const momentum = gainLossPct > 20 ? 1.06 : gainLossPct < -10 ? 0.96 : 1.0;
    const sellTarget = gainLossPct > 0
      ? +(price * (1 + (0.14 + meta.beta * 0.04) * momentum)).toFixed(2)
      : +(h.avgCost * 1.06).toFixed(2);
    const stopLoss = gainLossPct > 0
      ? +(price * (1 - (0.07 + meta.beta * 0.025))).toFixed(2)
      : +(h.avgCost * (1 - 0.12)).toFixed(2);
    const conservativeTarget = +(sellTarget * 0.87).toFixed(2);
    const bullTarget = +(sellTarget * 1.22).toFixed(2);
    const trailingStop = +(price * (1 - 0.08)).toFixed(2);

    return {
      ...h,
      name: meta.name,
      sector: meta.sector,
      currentPrice: price,
      previousClose: prevClose,
      change,
      changePercent,
      high52w,
      low52w,
      beta: meta.beta,
      pe: meta.pe,
      marketValue,
      gainLoss,
      gainLossPct,
      dayGainLoss,
      sellTarget,
      stopLoss,
      conservativeTarget,
      bullTarget,
      trailingStop,
      riskLevel: getRiskLevel(meta.beta),
      recommendation: getRecommendation(gainLossPct, pctFrom52High),
    };
  });
}

function computeStats(liveHoldings: LiveHolding[]): PortfolioStats {
  const totalValue = liveHoldings.reduce((s, h) => s + h.marketValue, 0);
  const totalCost = liveHoldings.reduce((s, h) => s + h.avgCost * h.shares, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const totalDayGain = liveHoldings.reduce((s, h) => s + h.dayGainLoss, 0);
  const portfolioBeta = liveHoldings.length > 0
    ? liveHoldings.reduce((s, h) => s + h.beta * (h.marketValue / Math.max(totalValue, 1)), 0) : 0;
  return { totalValue, totalCost, totalGainLoss, totalGainLossPct, totalDayGain, portfolioBeta, liveHoldings };
}

// ─── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({ value, onSave, prefix = '' }: {
  value: number; onSave: (v: number) => void; prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n > 0) onSave(n);
    setEditing(false);
  };
  if (editing) return (
    <div className="flex items-center gap-1">
      <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-20 rounded bg-zinc-800 border border-orange-600 px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none" type="number" />
      <button onClick={commit} className="text-orange-400 hover:text-orange-300"><Check size={11} /></button>
      <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-red-400"><X size={11} /></button>
    </div>
  );
  return (
    <button onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="group flex items-center gap-1 font-mono text-xs text-zinc-300 hover:text-white transition-colors">
      {prefix}{value.toLocaleString()}
      <Edit3 size={9} className="opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity" />
    </button>
  );
}

// ─── Add Position Form ─────────────────────────────────────────────────────────
function AddPositionForm({ onAdd }: { onAdd: (h: Omit<Holding, 'id'>) => void }) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<string[]>([]);
  const symbolRef = useRef<HTMLInputElement>(null);

  const handleSymbolChange = (val: string) => {
    const v = val.toUpperCase();
    setSymbol(v);
    setSuggestion(v.length >= 1 ? POPULAR_TICKERS.filter(t => t.startsWith(v) && t !== v).slice(0, 5) : []);
  };

  const handleSubmit = () => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) { setError('Enter a ticker symbol'); return; }
    if (!/^[A-Z]{1,6}$/.test(sym)) { setError('Enter a valid ticker (1–6 letters)'); return; }
    const sh = parseFloat(shares);
    const ac = parseFloat(avgCost);
    if (!sh || sh <= 0) { setError('Enter a valid number of shares'); return; }
    if (!ac || ac <= 0) { setError('Enter a valid purchase price'); return; }
    setError('');
    setSuggestion([]);
    onAdd({ symbol: sym, shares: sh, avgCost: ac, note: note.trim() || undefined });
    setSymbol(''); setShares(''); setAvgCost(''); setNote('');
    symbolRef.current?.focus();
  };

  return (
    <div className="rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900 to-black p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30">
          <Plus size={16} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Add Position</h3>
          <p className="text-[10px] text-zinc-500">Enter ticker, shares owned, and purchase price</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[10px] text-zinc-600 self-center mr-1">Quick add:</span>
        {POPULAR_TICKERS.slice(0, 10).map(t => (
          <button key={t} onClick={() => { setSymbol(t); setSuggestion([]); }}
            className="rounded-md border border-zinc-800 bg-zinc-800/60 hover:border-orange-700 hover:bg-orange-900/20 px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-orange-300 transition-all">
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-2 relative">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Ticker *</label>
          <input ref={symbolRef} value={symbol} onChange={e => handleSymbolChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="AAPL" maxLength={6}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-mono font-bold uppercase text-white placeholder-zinc-700 focus:border-orange-500 focus:outline-none transition-all" />
          {suggestion.length > 0 && (
            <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl overflow-hidden">
              {suggestion.map(s => (
                <button key={s} onClick={() => { setSymbol(s); setSuggestion([]); }}
                  className="w-full px-3 py-2 text-left text-xs font-mono text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Shares *</label>
          <input value={shares} onChange={e => setShares(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="100" type="number" min="0.001" step="any"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:border-orange-500 focus:outline-none transition-all" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Avg Buy Price ($) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-500 text-sm">$</span>
            <input value={avgCost} onChange={e => setAvgCost(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="0.00" type="number" min="0.01" step="0.01"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:border-orange-500 focus:outline-none transition-all" />
          </div>
        </div>
        <div className="col-span-4">
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Long-term hold, retirement account..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-orange-500 focus:outline-none transition-all" />
        </div>
        <div className="col-span-2">
          <button onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-orange-900/20">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
          <AlertTriangle size={12} />{error}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1"><Check size={9} className="text-orange-600" /> Enter to add quickly</span>
        <span className="flex items-center gap-1"><Save size={9} className="text-orange-600" /> Auto-saved per portfolio</span>
        <span className="flex items-center gap-1"><Check size={9} className="text-orange-600" /> Duplicates auto-average cost</span>
      </div>
    </div>
  );
}

// ─── Portfolio Tab Button ──────────────────────────────────────────────────────
function PortfolioTab({ portfolio, isActive, onClick, onDelete, onRename }: {
  portfolio: Portfolio; isActive: boolean; onClick: () => void;
  onDelete: () => void; onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(portfolio.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  };

  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-xl border px-3 py-2 cursor-pointer transition-all group min-w-0',
      isActive ? 'border-orange-600/50 bg-orange-950/30 text-white' : 'border-zinc-700 bg-black/50 text-zinc-400 hover:border-zinc-600 hover:text-white'
    )} onClick={onClick}>
      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: portfolio.color }} />
      {editing ? (
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          onBlur={commit} onClick={e => e.stopPropagation()}
          className="bg-transparent text-xs font-semibold text-white focus:outline-none w-24 border-b border-orange-500" />
      ) : (
        <span className="text-xs font-semibold truncate max-w-[100px]">{portfolio.name}</span>
      )}
      <span className="text-[9px] text-zinc-600 shrink-0">{portfolio.holdings.length}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        <button onClick={e => { e.stopPropagation(); setEditing(true); setDraft(portfolio.name); }}
          className="rounded p-0.5 hover:bg-zinc-700 hover:text-orange-400 transition-colors"><Pencil size={9} /></button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="rounded p-0.5 hover:bg-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={9} /></button>
      </div>
    </div>
  );
}

// ─── New Portfolio Modal ───────────────────────────────────────────────────────
function NewPortfolioModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc?: string) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-black p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FolderPlus size={18} className="text-orange-400" /> New Portfolio
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Portfolio Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && (onCreate(name.trim(), desc.trim() || undefined), onClose())}
              placeholder="e.g. Growth Portfolio, Retirement Fund..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-all" autoFocus />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Long-term tech holdings, aggressive growth..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 focus:border-orange-500 focus:outline-none transition-all" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-all">
            Cancel
          </button>
          <button onClick={() => { if (name.trim()) { onCreate(name.trim(), desc.trim() || undefined); onClose(); } }}
            disabled={!name.trim()}
            className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 px-4 py-2.5 text-sm font-bold text-white transition-all">
            Create Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color = 'text-white', icon: Icon, border = '' }: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ElementType; border?: string;
}) {
  return (
    <div className={cn('rounded-xl border bg-black/60 p-4', border || 'border-zinc-800')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
        {Icon && <Icon size={13} className="text-zinc-600" />}
      </div>
      <div className={cn('text-xl font-bold font-mono leading-none', color)}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-1.5 leading-snug">{sub}</div>}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyPortfolio({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-zinc-700 bg-black/30 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700">
        <Wallet size={24} className="text-zinc-600" />
      </div>
      <h3 className="text-sm font-bold text-zinc-400 mb-2">This portfolio is empty</h3>
      <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
        Add your first position using the form above. Enter the ticker, shares owned, and what you paid per share.
      </p>
      {onAdd && (
        <button onClick={onAdd}
          className="mt-5 flex items-center gap-2 rounded-xl bg-orange-600/20 border border-orange-700/40 hover:bg-orange-600/30 px-4 py-2 text-xs font-semibold text-orange-300 transition-all">
          <Plus size={13} /> Add First Position
        </button>
      )}
    </div>
  );
}

// ─── Compare View ─────────────────────────────────────────────────────────────
function CompareView({ portfolios, getQuote }: {
  portfolios: Portfolio[];
  getQuote: (s: string) => ReturnType<ReturnType<typeof usePortfolioData>['getQuote']>;
}) {
  const statsAll = portfolios.map(p => {
    const live = computeLiveHoldings(p.holdings, getQuote);
    const s = computeStats(live);
    return { ...s, name: p.name, color: p.color, id: p.id };
  });

  if (portfolios.length < 2) return (
    <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-zinc-700 bg-black/30 text-center">
      <GitCompare size={32} className="text-zinc-600 mb-4" />
      <h3 className="text-sm font-bold text-zinc-400 mb-2">Need at least 2 portfolios to compare</h3>
      <p className="text-xs text-zinc-600 max-w-xs">Create another portfolio using the "New Portfolio" button above, then add holdings to it.</p>
    </div>
  );

  // Build chart data from sector allocations
  const allSectors = [...new Set(statsAll.flatMap(s => s.liveHoldings.map(h => h.sector)))];
  const sectorChartData = allSectors.map(sector => {
    const entry: Record<string, string | number> = { sector };
    statsAll.forEach(s => {
      const sectorVal = s.liveHoldings.filter(h => h.sector === sector).reduce((acc, h) => acc + h.marketValue, 0);
      entry[s.name] = s.totalValue > 0 ? +((sectorVal / s.totalValue) * 100).toFixed(1) : 0;
    });
    return entry;
  }).filter(d => statsAll.some(s => (d[s.name] as number) > 0));

  // Value over time (simulated using cost basis as origin)
  const growthData = statsAll[0].liveHoldings.length > 0 ? Array.from({ length: 10 }, (_, i) => {
    const entry: Record<string, string | number> = { month: `M-${9 - i}` };
    statsAll.forEach(s => {
      const factor = 1 - (s.totalGainLossPct / 100) * (i / 9);
      entry[s.name] = s.totalValue > 0 ? +(s.totalValue * factor).toFixed(0) : 0;
    });
    return entry;
  }).reverse() : [];

  return (
    <div className="space-y-5">
      {/* Comparison header KPIs */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${statsAll.length}, 1fr)` }}>
        {statsAll.map(s => (
          <div key={s.id} className="rounded-2xl border border-zinc-800 bg-black/60 p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full" style={{ background: s.color }} />
              <h3 className="text-sm font-bold text-white">{s.name}</h3>
              <span className="text-[10px] text-zinc-500">{s.liveHoldings.length} positions</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Value', value: `$${s.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-white' },
                { label: 'Total Gain/Loss', value: `${s.totalGainLoss >= 0 ? '+' : ''}$${Math.abs(s.totalGainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: s.totalGainLoss >= 0 ? 'text-orange-400' : 'text-red-400' },
                { label: 'Return %', value: `${s.totalGainLossPct >= 0 ? '+' : ''}${s.totalGainLossPct.toFixed(2)}%`, color: s.totalGainLossPct >= 0 ? 'text-orange-400' : 'text-red-400' },
                { label: 'Portfolio Beta', value: `β${s.portfolioBeta.toFixed(2)}`, color: s.portfolioBeta > 1.5 ? 'text-red-400' : s.portfolioBeta > 1 ? 'text-amber-400' : 'text-orange-400' },
                { label: "Today's Gain", value: `${s.totalDayGain >= 0 ? '+' : ''}$${Math.abs(s.totalDayGain).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: s.totalDayGain >= 0 ? 'text-orange-400' : 'text-red-400' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">{m.label}</span>
                  <span className={cn('text-sm font-bold font-mono', m.color)}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      {growthData.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-orange-400" /> Estimated Portfolio Growth (10-Month Projection)
          </h3>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growthData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 11 }}
                formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, '']} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {statsAll.map(s => (
                <Line key={s.id} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sector allocation comparison */}
      {sectorChartData.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <PieChart size={14} className="text-orange-400" /> Sector Allocation Comparison (%)
          </h3>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectorChartData} margin={{ top: 5, right: 5, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="sector" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} angle={-25} textAnchor="end" />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false}
                tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 11 }}
                formatter={(v: number | undefined) => [`${v ?? 0}%`, '']} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {statsAll.map(s => (
                <Bar key={s.id} dataKey={s.name} fill={s.color} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Risk comparison table */}
      <div className="rounded-2xl border border-zinc-800 bg-black/50 p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Shield size={14} className="text-orange-400" /> Risk Metrics Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left text-[10px] text-zinc-500 uppercase tracking-wider py-2 pr-4">Metric</th>
                {statsAll.map(s => (
                  <th key={s.id} className="text-right text-[10px] text-zinc-400 py-2 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[
                { label: 'Total Value', fmt: (s: typeof statsAll[0]) => `$${s.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, colorFn: () => 'text-white' },
                { label: 'Cost Basis', fmt: (s: typeof statsAll[0]) => `$${s.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, colorFn: () => 'text-zinc-300' },
                { label: 'Unrealized P&L', fmt: (s: typeof statsAll[0]) => `${s.totalGainLoss >= 0 ? '+' : ''}$${Math.abs(s.totalGainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, colorFn: (s: typeof statsAll[0]) => s.totalGainLoss >= 0 ? 'text-orange-400' : 'text-red-400' },
                { label: 'Return %', fmt: (s: typeof statsAll[0]) => `${s.totalGainLossPct >= 0 ? '+' : ''}${s.totalGainLossPct.toFixed(2)}%`, colorFn: (s: typeof statsAll[0]) => s.totalGainLossPct >= 0 ? 'text-orange-400' : 'text-red-400' },
                { label: 'Portfolio Beta', fmt: (s: typeof statsAll[0]) => `β${s.portfolioBeta.toFixed(2)}`, colorFn: (s: typeof statsAll[0]) => s.portfolioBeta > 1.5 ? 'text-red-400' : s.portfolioBeta > 1 ? 'text-amber-400' : 'text-orange-400' },
                { label: 'Positions', fmt: (s: typeof statsAll[0]) => String(s.liveHoldings.length), colorFn: () => 'text-zinc-300' },
                { label: 'Today Change', fmt: (s: typeof statsAll[0]) => `${s.totalDayGain >= 0 ? '+' : ''}$${Math.abs(s.totalDayGain).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, colorFn: (s: typeof statsAll[0]) => s.totalDayGain >= 0 ? 'text-orange-400' : 'text-red-400' },
              ].map(row => (
                <tr key={row.label}>
                  <td className="py-2.5 pr-4 text-zinc-400">{row.label}</td>
                  {statsAll.map(s => (
                    <td key={s.id} className={cn('py-2.5 px-3 text-right font-mono font-semibold', row.colorFn(s))}>
                      {row.fmt(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Winner badges */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Highest Total Value', winner: statsAll.reduce((a, b) => a.totalValue > b.totalValue ? a : b), fmt: (s: typeof statsAll[0]) => `$${s.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
          { label: 'Best Return', winner: statsAll.reduce((a, b) => a.totalGainLossPct > b.totalGainLossPct ? a : b), fmt: (s: typeof statsAll[0]) => `+${s.totalGainLossPct.toFixed(2)}%` },
          { label: 'Lowest Risk (Beta)', winner: statsAll.reduce((a, b) => a.portfolioBeta < b.portfolioBeta ? a : b), fmt: (s: typeof statsAll[0]) => `β${s.portfolioBeta.toFixed(2)}` },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-zinc-800 bg-black/50 p-4">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{card.label}</div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: card.winner.color }} />
              <span className="text-sm font-bold text-white">{card.winner.name}</span>
            </div>
            <div className="text-lg font-black font-mono text-orange-400 mt-1">{card.fmt(card.winner)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function PortfolioRiskPage({ userId, userName: _userName }: { userId: string; userName?: string }) {
  const { fetchQuote, getQuote, getRecommendations, loadingSymbols } = usePortfolioData();
  const {
    portfolios,
    activePortfolioId,
    activePortfolio,
    setActivePortfolioId,
    createPortfolio,
    deletePortfolio,
    renamePortfolio,
    addHolding,
    removeHolding,
    updateHolding,
  } = useMultiPortfolio(userId);

  const alertAgent = useAlertAgent();
  const { setSelectedHoldings } = usePortfolioContext();
  const [activeView, setActiveView] = useState<'holdings' | 'recommendations' | 'analytics' | 'alerts' | 'compare'>('holdings');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'gain' | 'symbol'>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [portfolioAI, setPortfolioAI] = useState<AIAnalysisResult | null>(null);
  const [portfolioAILoading, setPortfolioAILoading] = useState(false);
  const prevSymbolsRef = useRef<Set<string>>(new Set());

  // Create first portfolio for new users
  useEffect(() => {
    if (portfolios.length === 0) {
      createPortfolio('My Portfolio', 'Primary portfolio');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch symbols whenever active portfolio changes
  useEffect(() => {
    if (!activePortfolio) return;
    activePortfolio.holdings.forEach(h => {
      if (!prevSymbolsRef.current.has(h.symbol)) {
        fetchQuote(h.symbol);
        prevSymbolsRef.current.add(h.symbol);
      }
    });
  }, [activePortfolio, fetchQuote]);

  // Update global portfolio context when active portfolio changes
  useEffect(() => {
    if (activePortfolio) {
      setSelectedHoldings(activePortfolio.holdings.map(h => ({
        symbol: h.symbol,
        shares: h.shares,
        avgCost: h.avgCost,
      })));
    } else {
      setSelectedHoldings([]);
    }
  }, [activePortfolio, setSelectedHoldings]);

  // Pre-fetch recommendation stocks
  useEffect(() => {
    ['NVDA', 'AVGO', 'META', 'GOOGL', 'LLY', 'V', 'MSFT', 'COST', 'AMD', 'PLTR'].forEach(s => fetchQuote(s));
  }, [fetchQuote]);

  const handleRefreshAll = useCallback(async () => {
    if (!activePortfolio) return;
    setLoadingAll(true);
    const symbols = [...new Set(activePortfolio.holdings.map(h => h.symbol))];
    await Promise.all(symbols.map(s => fetchQuote(s)));
    setLastRefresh(new Date());
    setLoadingAll(false);
  }, [activePortfolio, fetchQuote]);

  const handleAddHolding = useCallback((data: Omit<Holding, 'id'>) => {
    if (!activePortfolioId) return;
    const holding: Holding = { ...data, id: `${data.symbol}-${Date.now()}` };
    addHolding(activePortfolioId, holding);
    fetchQuote(data.symbol);
    prevSymbolsRef.current.add(data.symbol);
  }, [activePortfolioId, addHolding, fetchQuote]);

  const handleAddRecommendation = useCallback((rec: ReturnType<typeof getRecommendations>[0]) => {
    if (!activePortfolioId) return;
    // Add with 10 shares by default, using current price as cost basis
    const defaultShares = 10;
    handleAddHolding({
      symbol: rec.symbol,
      shares: defaultShares,
      avgCost: rec.currentPrice,
      note: `Added from CLARA recommendations - ${rec.rating}`,
    });
    // Switch to holdings view to show the newly added position
    setActiveView('holdings');
  }, [activePortfolioId, handleAddHolding]);

  const liveHoldings = activePortfolio ? computeLiveHoldings(activePortfolio.holdings, getQuote) : [];
  const stats = computeStats(liveHoldings);

  // Feed alert agent
  useEffect(() => {
    alertAgent.setMonitoredHoldings(
      liveHoldings.map(h => ({
        id: h.id, symbol: h.symbol, company: h.name, shares: h.shares, avgCost: h.avgCost,
        currentPrice: h.currentPrice, sellTarget: h.sellTarget, stopLoss: h.stopLoss,
        trailingStop: h.trailingStop, bullTarget: h.bullTarget, gainLoss: h.gainLoss,
        gainLossPct: h.gainLossPct, marketValue: h.marketValue,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveHoldings]);

  const filtered = liveHoldings
    .filter(h => h.symbol.includes(searchQuery.toUpperCase()) || h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === 'value') diff = b.marketValue - a.marketValue;
      else if (sortBy === 'gain') diff = b.gainLossPct - a.gainLossPct;
      else diff = a.symbol.localeCompare(b.symbol);
      return sortDir === 'desc' ? diff : -diff;
    });

  const sectorMap: Record<string, number> = {};
  liveHoldings.forEach(h => { sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.marketValue; });
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value: +((value / Math.max(stats.totalValue, 1)) * 100).toFixed(1) }))
    .sort((a, b) => b.value - a.value);

  const plData = liveHoldings
    .sort((a, b) => b.gainLoss - a.gainLoss)
    .map(h => ({ symbol: h.symbol, gainLoss: +h.gainLoss.toFixed(0), gainLossPct: +h.gainLossPct.toFixed(1), marketValue: +h.marketValue.toFixed(0) }));

  const recommendations = getRecommendations();

  useEffect(() => {
    if (!activePortfolio || liveHoldings.length === 0) {
      setPortfolioAI(null);
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      setPortfolioAILoading(true);
      const topHoldings = [...liveHoldings]
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 5)
        .map(h => ({
          symbol: h.symbol,
          sector: h.sector,
          weight_pct: +((h.marketValue / Math.max(stats.totalValue, 1)) * 100).toFixed(2),
          beta: h.beta,
          gain_loss_pct: +h.gainLossPct.toFixed(2),
        }));

      const payload = {
        portfolio_name: activePortfolio.name,
        total_value: +stats.totalValue.toFixed(2),
        total_cost: +stats.totalCost.toFixed(2),
        total_gain_loss_pct: +stats.totalGainLossPct.toFixed(2),
        day_gain_loss: +stats.totalDayGain.toFixed(2),
        portfolio_beta: +stats.portfolioBeta.toFixed(3),
        positions_count: liveHoldings.length,
        top_holdings: topHoldings,
      };

      const result = await fetchPortfolioAIAnalysis(payload);
      if (mounted) {
        setPortfolioAI(result);
        setPortfolioAILoading(false);
      }
    }, 650);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [
    activePortfolio,
    liveHoldings,
    stats.totalValue,
    stats.totalCost,
    stats.totalGainLossPct,
    stats.totalDayGain,
    stats.portfolioBeta,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ══ Page Header ════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30">
              <Folders size={16} className="text-orange-400" />
            </div>
            Portfolio Manager
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Multiple portfolios · Live prices · AI sell targets · Stop-losses · Compare
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activePortfolio && (
            <button onClick={handleRefreshAll} disabled={loadingAll}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300 transition-colors disabled:opacity-50">
              {loadingAll ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh
            </button>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 bg-black border border-zinc-800 rounded-lg px-3 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* ══ Portfolio Tabs ══════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 flex-wrap">
        {portfolios.map(p => (
          <PortfolioTab
            key={p.id}
            portfolio={p}
            isActive={p.id === activePortfolioId}
            onClick={() => { setActivePortfolioId(p.id); setExpandedId(null); }}
            onDelete={() => {
              if (portfolios.length > 1 || window.confirm('Delete this portfolio?')) {
                deletePortfolio(p.id);
              }
            }}
            onRename={name => renamePortfolio(p.id, name)}
          />
        ))}
        <button onClick={() => setShowNewPortfolio(true)}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-700 hover:border-orange-600 bg-black/50 hover:bg-orange-950/20 px-3 py-2 text-xs text-zinc-500 hover:text-orange-300 transition-all">
          <FolderPlus size={13} /> New Portfolio
        </button>
        {portfolios.length >= 2 && (
          <button onClick={() => setActiveView('compare')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
              activeView === 'compare'
                ? 'border-purple-600/50 bg-purple-950/30 text-purple-300'
                : 'border-zinc-700 bg-black/50 text-zinc-400 hover:border-purple-600/50 hover:text-purple-300'
            )}>
            <GitCompare size={13} /> Compare All
          </button>
        )}
      </div>

      {/* ══ Add Position Form (only when a portfolio is active & not comparing) ══ */}
      {activePortfolio && activeView !== 'compare' && (
        <AddPositionForm onAdd={handleAddHolding} />
      )}

      {/* ══ KPIs ════════════════════════════════════════════════════════════════ */}
      {activePortfolio && activePortfolio.holdings.length > 0 && activeView !== 'compare' && (
        <div className="grid grid-cols-6 gap-3">
          <KPICard label="Portfolio Value" value={`$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={`${activePortfolio.holdings.length} positions · ${[...new Set(liveHoldings.map(h => h.sector))].length} sectors`} icon={Wallet} />
          <KPICard label="Cost Basis" value={`$${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="Invested capital" color="text-zinc-300" icon={DollarSign} />
          <KPICard label="Total Gain / Loss"
            value={`${stats.totalGainLoss >= 0 ? '+' : ''}$${Math.abs(stats.totalGainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            sub={`${stats.totalGainLossPct >= 0 ? '+' : ''}${stats.totalGainLossPct.toFixed(2)}% overall`}
            color={stats.totalGainLoss >= 0 ? 'text-orange-400' : 'text-red-400'}
            border={stats.totalGainLoss >= 0 ? 'border-orange-900/30' : 'border-red-900/30'}
            icon={stats.totalGainLoss >= 0 ? TrendingUp : TrendingDown} />
          <KPICard label="Today's Gain"
            value={`${stats.totalDayGain >= 0 ? '+' : ''}$${Math.abs(stats.totalDayGain).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            sub="vs. yesterday" color={stats.totalDayGain >= 0 ? 'text-orange-400' : 'text-red-400'}
            icon={stats.totalDayGain >= 0 ? ChevronUp : ChevronDown} />
          <KPICard label="Portfolio Beta" value={stats.portfolioBeta.toFixed(2)}
            sub={stats.portfolioBeta > 1.3 ? 'High sensitivity' : stats.portfolioBeta > 0.8 ? 'Moderate risk' : 'Defensive'}
            color={stats.portfolioBeta > 1.5 ? 'text-red-400' : stats.portfolioBeta > 1.0 ? 'text-amber-400' : 'text-orange-400'}
            icon={BarChart2} />
          <KPICard label="Unrealized Return"
            value={`${stats.totalGainLossPct >= 0 ? '+' : ''}${stats.totalGainLossPct.toFixed(2)}%`}
            sub={stats.totalGainLossPct > 20 ? 'Strong performer' : stats.totalGainLossPct > 0 ? 'Positive' : 'Review positions'}
            color={stats.totalGainLossPct >= 0 ? 'text-orange-400' : 'text-red-400'} icon={Target} />
        </div>
      )}

      {activePortfolio && activePortfolio.holdings.length > 0 && activeView !== 'compare' && (
        <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">AI Portfolio Insight</h3>
            {portfolioAILoading && <Loader2 size={14} className="text-orange-400 animate-spin" />}
          </div>
          {portfolioAI ? (
            <div className="space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed">{portfolioAI.summary}</p>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span>Provider: <span className="text-zinc-300 uppercase">{portfolioAI.provider}</span></span>
                <span>•</span>
                <span>Confidence: <span className={cn('font-mono', portfolioAI.confidence >= 0.65 ? 'text-orange-400' : 'text-amber-400')}>{Math.round(portfolioAI.confidence * 100)}%</span></span>
                {portfolioAI.needs_review && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">Needs analyst review</span>
                  </>
                )}
              </div>
              {portfolioAI.key_risks.length > 0 && (
                <div className="text-[11px] text-zinc-400">
                  Top risk: {portfolioAI.key_risks[0]}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">AI insight unavailable. Ensure backend is running and API key is configured.</p>
          )}
        </div>
      )}

      {/* ══ View Tabs ═══════════════════════════════════════════════════════════ */}
      {activePortfolio && activeView !== 'compare' && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 rounded-xl border border-zinc-800 bg-black/50 p-1 w-fit flex-wrap">
            {([
              { key: 'holdings',        label: '📊 Holdings',      count: activePortfolio.holdings.length },
              { key: 'recommendations', label: '⭐ Buy Ideas',     count: 8 },
              { key: 'analytics',       label: '📈 Analytics' },
              { key: 'alerts',          label: '🔔 Alert Agent',   count: alertAgent.unacknowledgedCount > 0 ? alertAgent.unacknowledgedCount : undefined },
            ] as const).map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  activeView === v.key ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                )}>
                {v.label}
                {'count' in v && v.count !== undefined && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', activeView === v.key ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-800 text-zinc-500')}>
                    {v.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeView === 'holdings' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -tranzinc-y-1/2 text-zinc-500" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search holdings..." className="w-44 rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:border-orange-600 focus:outline-none" />
              </div>
              <select value={`${sortBy}-${sortDir}`}
                onChange={e => { const [sb, sd] = e.target.value.split('-'); setSortBy(sb as typeof sortBy); setSortDir(sd as typeof sortDir); }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:outline-none">
                <option value="value-desc">Largest value</option>
                <option value="value-asc">Smallest value</option>
                <option value="gain-desc">Best performers</option>
                <option value="gain-asc">Worst performers</option>
                <option value="symbol-asc">A → Z</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* ══ COMPARE VIEW ════════════════════════════════════════════════════════ */}
      {activeView === 'compare' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GitCompare size={16} className="text-purple-400" />
              Portfolio Comparison — All {portfolios.length} Portfolios
            </h3>
            <button onClick={() => setActiveView('holdings')}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors">
              <ChevronRight size={12} /> Back to Holdings
            </button>
          </div>
          <CompareView portfolios={portfolios} getQuote={getQuote} />
        </div>
      )}

      {/* ══ HOLDINGS VIEW ════════════════════════════════════════════════════════ */}
      {activeView === 'holdings' && activePortfolio && (
        activePortfolio.holdings.length === 0 ? <EmptyPortfolio /> : (
          <div className="space-y-3">
            {/* Table header */}
            <div className="grid items-center px-4 py-2 text-[10px] text-zinc-600 uppercase tracking-wider font-medium"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr 0.8fr' }}>
              <div>Stock</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Avg Cost</div>
              <div className="text-right">Current</div>
              <div className="text-right">Day %</div>
              <div className="text-right">Mkt Value</div>
              <div className="text-right">Gain / Loss</div>
              <div className="text-right">Sell Target</div>
              <div className="text-right">Stop Loss</div>
              <div className="text-right">Risk</div>
              <div className="text-right">Action</div>
            </div>

            {filtered.map(h => {
              const isLoading = loadingSymbols.has(h.symbol);
              const isExpanded = expandedId === h.id;
              const weightPct = (h.marketValue / Math.max(stats.totalValue, 1)) * 100;

              return (
                <div key={h.id} className={cn('rounded-xl border transition-all duration-200',
                  isExpanded ? 'border-orange-700/50 bg-black' : 'border-zinc-800 bg-black/60 hover:border-zinc-700')}>
                  <div className="h-0.5 rounded-t-xl overflow-hidden">
                    <div className="h-full transition-all duration-700"
                      style={{ width: `${weightPct}%`, background: SECTOR_COLORS[h.sector] || '#64748b', opacity: 0.7 }} />
                  </div>
                  <div className="grid items-center px-4 py-3 cursor-pointer select-none"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr 1fr 0.8fr' }}
                    onClick={() => setExpandedId(isExpanded ? null : h.id)}>
                    {/* Symbol */}
                    <div className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold font-mono shrink-0"
                        style={{ background: (SECTOR_COLORS[h.sector] || '#64748b') + '25', color: SECTOR_COLORS[h.sector] || '#94a3b8', border: `1px solid ${(SECTOR_COLORS[h.sector] || '#64748b')}40` }}>
                        {h.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white font-mono">{h.symbol}</span>
                          {isLoading && <Loader2 size={10} className="animate-spin text-orange-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">{h.name}</div>
                        {h.note && <div className="text-[9px] text-zinc-600 italic truncate">{h.note}</div>}
                      </div>
                    </div>
                    {/* Shares */}
                    <div className="text-right" onClick={e => e.stopPropagation()}>
                      <EditableCell value={h.shares} onSave={v => activePortfolioId && updateHolding(activePortfolioId, h.id, { shares: v })} />
                      <div className="text-[9px] text-zinc-600">{weightPct.toFixed(1)}%</div>
                    </div>
                    {/* Avg Cost */}
                    <div className="text-right" onClick={e => e.stopPropagation()}>
                      <EditableCell value={h.avgCost} onSave={v => activePortfolioId && updateHolding(activePortfolioId, h.id, { avgCost: v })} prefix="$" />
                    </div>
                    {/* Current */}
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">${h.currentPrice.toFixed(2)}</div>
                      <div className="text-[9px] text-zinc-600">prev ${h.previousClose.toFixed(2)}</div>
                    </div>
                    {/* Day % */}
                    <div className="text-right">
                      <div className={cn('flex items-center justify-end gap-0.5 text-xs font-mono', h.change >= 0 ? 'text-orange-400' : 'text-red-400')}>
                        {h.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(h.changePercent).toFixed(2)}%
                      </div>
                      <div className={cn('text-[9px] font-mono', h.change >= 0 ? 'text-orange-700' : 'text-red-700')}>
                        {h.change >= 0 ? '+' : ''}${h.dayGainLoss.toFixed(0)}
                      </div>
                    </div>
                    {/* Market Value */}
                    <div className="text-right">
                      <div className="text-xs font-mono font-semibold text-zinc-200">
                        ${h.marketValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    {/* Gain/Loss */}
                    <div className="text-right">
                      <div className={cn('text-xs font-mono font-bold', h.gainLoss >= 0 ? 'text-orange-400' : 'text-red-400')}>
                        {h.gainLoss >= 0 ? '+' : '-'}${Math.abs(h.gainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      <div className={cn('text-[10px] font-mono font-semibold', h.gainLoss >= 0 ? 'text-orange-600' : 'text-red-600')}>
                        {h.gainLossPct >= 0 ? '+' : ''}{h.gainLossPct.toFixed(1)}%
                      </div>
                    </div>
                    {/* Sell Target */}
                    <div className="text-right">
                      <div className="text-xs font-mono text-amber-400 font-bold">${h.sellTarget.toFixed(2)}</div>
                      <div className="text-[9px] text-amber-700">+{((h.sellTarget - h.currentPrice) / h.currentPrice * 100).toFixed(1)}%</div>
                    </div>
                    {/* Stop Loss */}
                    <div className="text-right">
                      <div className="text-xs font-mono text-red-400 font-bold">${h.stopLoss.toFixed(2)}</div>
                      <div className="text-[9px] text-red-800">-{((h.currentPrice - h.stopLoss) / h.currentPrice * 100).toFixed(1)}%</div>
                    </div>
                    {/* Risk */}
                    <div className="text-right" onClick={e => e.stopPropagation()}>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', RISK_COLORS[h.riskLevel])}>{h.riskLevel}</span>
                      <div className="text-[9px] text-zinc-600 mt-0.5">β={h.beta}</div>
                    </div>
                    {/* Action */}
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <span className={cn('text-[10px] font-bold hidden lg:block', REC_COLORS[h.recommendation])}>{h.recommendation}</span>
                      <button onClick={() => setExpandedId(isExpanded ? null : h.id)}
                        className={cn('p-1 rounded transition-colors', isExpanded ? 'text-orange-400' : 'text-zinc-600 hover:text-orange-400')}>
                        <Eye size={13} />
                      </button>
                      <button onClick={() => activePortfolioId && removeHolding(activePortfolioId, h.id)}
                        className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-5 py-5 grid grid-cols-3 gap-6">
                      {/* Price ladder */}
                      <div>
                        <div className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                          <div className="h-5 w-5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <Target size={11} className="text-amber-400" />
                          </div>
                          Price Target Ladder
                        </div>
                        <div className="space-y-2.5">
                          {[
                            { label: 'Bull Case', price: h.bullTarget, color: 'bg-orange-500', textColor: 'text-orange-300', note: 'Momentum extension' },
                            { label: 'Base Sell Target', price: h.sellTarget, color: 'bg-amber-500', textColor: 'text-amber-300', note: 'Primary exit · CLARA model' },
                            { label: 'Conservative', price: h.conservativeTarget, color: 'bg-yellow-600', textColor: 'text-yellow-400', note: 'Minimum exit' },
                            { label: 'Current Price', price: h.currentPrice, color: 'bg-orange-500', textColor: 'text-orange-300', note: 'Live market', current: true },
                            { label: 'Trailing Stop', price: h.trailingStop, color: 'bg-orange-600', textColor: 'text-orange-400', note: 'Dynamic 8% floor' },
                            { label: 'Hard Stop Loss', price: h.stopLoss, color: 'bg-red-600', textColor: 'text-red-400', note: 'Maximum loss' },
                          ].map((item, i) => (
                            <div key={i} className={cn('flex items-center gap-3 rounded-lg px-3 py-2', item.current ? 'bg-orange-950/30 border border-orange-900/40' : 'bg-zinc-800/40')}>
                              <div className={cn('h-2 w-2 rounded-full shrink-0', item.color)} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-zinc-400 font-medium">{item.label}</div>
                                <div className="text-[9px] text-zinc-600 truncate">{item.note}</div>
                              </div>
                              <div className={cn('text-sm font-bold font-mono shrink-0', item.textColor)}>${item.price.toFixed(2)}</div>
                              {!item.current && (
                                <div className="text-[9px] font-mono text-zinc-600 shrink-0 w-14 text-right">
                                  {item.price > h.currentPrice ? '+' : ''}{((item.price - h.currentPrice) / h.currentPrice * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Statistics */}
                      <div>
                        <div className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                          <div className="h-5 w-5 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                            <BarChart2 size={11} className="text-orange-400" />
                          </div>
                          Key Statistics
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: '52-Week High', value: `$${h.high52w.toFixed(2)}`, note: `${((h.currentPrice / h.high52w - 1) * 100).toFixed(1)}% below` },
                            { label: '52-Week Low',  value: `$${h.low52w.toFixed(2)}`,  note: `+${((h.currentPrice / h.low52w - 1) * 100).toFixed(1)}% above` },
                            { label: 'P/E Ratio',    value: `${h.pe}x`,                  note: h.pe > 40 ? 'Growth premium' : h.pe > 20 ? 'Fair value' : 'Value range' },
                            { label: 'Beta (β)',     value: h.beta.toFixed(2),           note: h.beta > 1 ? 'Above market' : 'Below market' },
                            { label: 'Sector',       value: h.sector,                    note: 'GICS classification' },
                            { label: 'Weight',       value: `${weightPct.toFixed(1)}%`,  note: weightPct > 35 ? '⚠ Concentration' : '✓ OK' },
                            { label: 'Cost Basis',   value: `$${(h.avgCost * h.shares).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, note: `${h.shares} × $${h.avgCost.toFixed(2)}` },
                            { label: 'Mkt Value',    value: `$${h.marketValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, note: 'Live price × shares' },
                          ].map(s => (
                            <div key={s.label} className="rounded-lg bg-zinc-800/50 p-2.5">
                              <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">{s.label}</div>
                              <div className="text-xs font-mono font-bold text-zinc-200">{s.value}</div>
                              <div className="text-[9px] text-zinc-600">{s.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CLARA Thesis */}
                      <div>
                        <div className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                          <div className="h-5 w-5 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                            <Zap size={11} className="text-purple-400" />
                          </div>
                          CLARA Analysis
                        </div>
                        <div className={cn('flex items-center gap-2 rounded-xl border px-4 py-3 mb-4',
                          h.recommendation === 'Strong Hold' ? 'border-orange-800/50 bg-orange-950/30' :
                          h.recommendation === 'Hold' ? 'border-orange-800/50 bg-orange-950/20' :
                          h.recommendation === 'Reduce' ? 'border-amber-800/50 bg-amber-950/20' :
                          'border-red-800/50 bg-red-950/20')}>
                          <div className="text-xl">{h.recommendation === 'Strong Hold' ? '💚' : h.recommendation === 'Hold' ? '💙' : h.recommendation === 'Reduce' ? '⚠️' : '🔴'}</div>
                          <div>
                            <div className={cn('text-sm font-black', REC_COLORS[h.recommendation])}>{h.recommendation}</div>
                            <div className="text-[10px] text-zinc-500">CLARA regime-adjusted signal</div>
                          </div>
                        </div>
                        <div className="rounded-xl bg-zinc-800/50 p-3.5 text-[11px] text-zinc-400 leading-relaxed mb-3">
                          {h.recommendation === 'Strong Hold' && <>Position is up <span className="text-orange-400 font-semibold">{h.gainLossPct.toFixed(1)}%</span>. Momentum supports upside. Raise trailing stop to ${h.trailingStop.toFixed(2)} to lock gains. Consider partial exit near ${h.sellTarget.toFixed(2)} or hold for bull case ${h.bullTarget.toFixed(2)}.</>}
                          {h.recommendation === 'Hold' && <>Position shows <span className={h.gainLoss >= 0 ? 'text-orange-400 font-semibold' : 'text-amber-400 font-semibold'}>{h.gainLossPct >= 0 ? '+' : ''}{h.gainLossPct.toFixed(1)}%</span>. Maintain position. Hard stop at ${h.stopLoss.toFixed(2)}. Primary target ${h.sellTarget.toFixed(2)}.</>}
                          {h.recommendation === 'Reduce' && <>Consider trimming 25-50% of position. {h.gainLossPct > 0 ? <>Lock in <span className="text-orange-400 font-semibold">{h.gainLossPct.toFixed(1)}% gains</span>.</> : <>Down <span className="text-red-400 font-semibold">{Math.abs(h.gainLossPct).toFixed(1)}%</span> — limit drawdown.</>} Hard stop ${h.stopLoss.toFixed(2)}.</>}
                          {h.recommendation === 'Sell' && <>Position at extended levels (+{h.gainLossPct.toFixed(1)}%). Near 52-week high. Consider exiting near ${h.sellTarget.toFixed(2)} and rotating to lower-beta alternatives.</>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[9px] rounded-md bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-zinc-500">β={h.beta}</span>
                          <span className="text-[9px] rounded-md bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-zinc-500">P/E {h.pe}x</span>
                          <span className="text-[9px] rounded-md bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-zinc-500">{h.sector}</span>
                          <span className={cn('text-[9px] rounded-md border px-2 py-0.5', RISK_COLORS[h.riskLevel])}>{h.riskLevel} Risk</span>
                          <span className="text-[9px] rounded-md bg-purple-900/30 border border-purple-800/40 px-2 py-0.5 text-purple-400">Crisis Regime ×1.85</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && searchQuery && (
              <div className="flex items-center justify-center py-12 text-zinc-600 text-sm">No holdings match "{searchQuery}"</div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 flex items-start gap-3">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-zinc-400 leading-relaxed">
                <span className="text-amber-400 font-bold">CLARA Advisory: </span>
                Portfolio beta <span className="text-white font-mono">{stats.portfolioBeta.toFixed(2)}</span> — {stats.portfolioBeta > 1.3 ? 'elevated' : stats.portfolioBeta > 0.8 ? 'moderate' : 'low'} market sensitivity.{' '}
                {liveHoldings.filter(h => h.marketValue / Math.max(stats.totalValue, 1) > 0.35).length > 0 && '⚠️ Concentration risk: position >35%. '}
                Targets regime-conditioned under <span className="text-red-400 font-semibold">Crisis Contagion</span> (×1.85). Click rows to expand.
              </div>
            </div>
          </div>
        )
      )}

      {/* ══ RECOMMENDATIONS VIEW ════════════════════════════════════════════════ */}
      {activeView === 'recommendations' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Star size={15} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">CLARA Top Buy Recommendations</h3>
                <p className="text-[10px] text-zinc-500">AI-generated · Fundamentals + momentum + regime factors</p>
              </div>
            </div>
            <div className="text-[10px] text-amber-500 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <Info size={10} /> Not financial advice · DYOR
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recommendations.map((rec, idx) => (
              <div key={rec.symbol} className={cn('rounded-2xl border p-5 space-y-4 hover:border-zinc-600 transition-all',
                rec.rating === 'Strong Buy' ? 'border-orange-800/50 bg-gradient-to-br from-orange-950/20 to-zinc-900' :
                rec.rating === 'Buy' ? 'border-orange-800/30 bg-gradient-to-br from-orange-950/10 to-zinc-900' :
                'border-zinc-800 bg-black/50')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-bold font-mono text-orange-400 relative">
                      {rec.symbol.slice(0, 2)}
                      <div className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-black rounded-full px-1 border border-zinc-700 text-zinc-400">#{idx + 1}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">{rec.symbol}</span>
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full',
                          rec.rating === 'Strong Buy' ? 'bg-orange-500/20 text-orange-400 border border-orange-700/40' :
                          rec.rating === 'Buy' ? 'bg-orange-500/20 text-orange-400 border border-orange-700/40' :
                          'bg-amber-500/20 text-amber-400 border border-amber-700/40')}>{rec.rating}</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">{rec.name}</div>
                      <div className="text-[10px] text-zinc-600">{rec.sector}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black font-mono text-white">${rec.currentPrice.toFixed(2)}</div>
                    <div className={cn('text-xs font-mono flex items-center justify-end gap-0.5', rec.changePercent >= 0 ? 'text-orange-400' : 'text-red-400')}>
                      {rec.changePercent >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {Math.abs(rec.changePercent).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '12-Mo Target', value: `$${rec.targetPrice.toFixed(2)}`, color: 'text-amber-400' },
                    { label: 'Upside', value: `+${rec.upside.toFixed(1)}%`, color: 'text-orange-400' },
                    { label: 'P/E', value: `${rec.pe}x`, color: 'text-zinc-300' },
                    { label: 'Beta', value: `β${rec.beta}`, color: 'text-zinc-300' },
                  ].map(m => (
                    <div key={m.label} className="rounded-lg bg-zinc-800/60 px-2.5 py-2 text-center">
                      <div className="text-[9px] text-zinc-500 mb-1">{m.label}</div>
                      <div className={cn('text-sm font-black font-mono', m.color)}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-zinc-600 mb-1.5">
                    <span>Current: ${rec.currentPrice.toFixed(2)}</span>
                    <span>Target: ${rec.targetPrice.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-500" style={{ width: `${Math.min((rec.upside / 40) * 100, 100)}%` }} />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{rec.reason}</p>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                  <div className="flex gap-1.5">
                    <span className="text-[9px] rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-500 border border-zinc-700">{rec.sector}</span>
                  </div>
                  <button onClick={() => handleAddRecommendation(rec)}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-orange-700 px-3 py-1.5 text-[10px] font-semibold text-zinc-300 hover:text-orange-300 transition-all">
                    <ShoppingCart size={10} /> Add to Portfolio
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-4 flex items-start gap-3">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400/80 leading-relaxed">
              <strong>Disclaimer:</strong> CLARA recommendations are AI-generated for informational purposes only and do not constitute investment advice. All investments carry risk. Past performance is not indicative of future results. Please consult a licensed financial advisor.
            </p>
          </div>
        </div>
      )}

      {/* ══ ANALYTICS VIEW ════════════════════════════════════════════════════ */}
      {activeView === 'analytics' && activePortfolio && (
        activePortfolio.holdings.length === 0 ? <EmptyPortfolio /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <div className="flex items-center gap-2 mb-4"><BarChart2 size={14} className="text-orange-400" /><h3 className="text-sm font-semibold text-white">Unrealized P&L by Position</h3></div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={plData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="symbol" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} tickFormatter={v => v >= 0 ? `+$${(v / 1000).toFixed(0)}k` : `-$${Math.abs(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 11 }} formatter={(v: number | undefined) => [`${(v ?? 0) >= 0 ? '+' : ''}$${(v ?? 0).toLocaleString()}`, 'Gain/Loss']} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Bar dataKey="gainLoss" radius={[4, 4, 0, 0]}>
                      {plData.map((entry, i) => <Cell key={i} fill={entry.gainLoss >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <div className="flex items-center gap-2 mb-4"><PieChart size={14} className="text-orange-400" /><h3 className="text-sm font-semibold text-white">Sector Allocation</h3></div>
                <div className="flex items-center gap-4">
                  <div className="bg-zinc-900/50 rounded-lg p-3" style={{ width: '55%' }}>
                    <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie data={sectorData} cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3} dataKey="value">
                        {sectorData.map((entry, i) => <Cell key={i} fill={SECTOR_COLORS[entry.name] || '#64748b'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Allocation']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {sectorData.map(s => (
                      <div key={s.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: SECTOR_COLORS[s.name] || '#64748b' }} />
                            <span className="text-zinc-400">{s.name}</span>
                          </div>
                          <span className="font-mono font-bold text-white">{s.value}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: SECTOR_COLORS[s.name] || '#64748b' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
              <div className="flex items-center gap-2 mb-4"><Database size={14} className="text-orange-400" /><h3 className="text-sm font-semibold text-white">Position Weight Breakdown</h3></div>
              <div className="space-y-2.5">
                {liveHoldings.sort((a, b) => b.marketValue - a.marketValue).map(h => {
                  const weight = (h.marketValue / Math.max(stats.totalValue, 1)) * 100;
                  return (
                    <div key={h.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white w-14">{h.symbol}</span>
                          <span className="text-zinc-500 hidden sm:block">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-6 font-mono">
                          <span className="text-zinc-300 w-20 text-right">${h.marketValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                          <span className={cn('w-20 text-right', h.gainLoss >= 0 ? 'text-orange-400' : 'text-red-400')}>
                            {h.gainLoss >= 0 ? '+' : '-'}${Math.abs(h.gainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                          <span className={cn('w-14 text-right font-semibold', h.gainLossPct >= 0 ? 'text-orange-400' : 'text-red-400')}>
                            {h.gainLossPct >= 0 ? '+' : ''}{h.gainLossPct.toFixed(1)}%
                          </span>
                          <span className="text-zinc-500 w-10 text-right">{weight.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${weight}%`, background: SECTOR_COLORS[h.sector] || '#64748b', opacity: 0.75 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Largest Position', value: liveHoldings.length ? liveHoldings.reduce((a, b) => a.marketValue > b.marketValue ? a : b) : null, fmt: (h: LiveHolding) => `${((h.marketValue / Math.max(stats.totalValue, 1)) * 100).toFixed(1)}% weight`, icon: BookOpen },
                { label: 'Best Performer',   value: liveHoldings.length ? liveHoldings.reduce((a, b) => a.gainLossPct > b.gainLossPct ? a : b) : null, fmt: (h: LiveHolding) => `+${h.gainLossPct.toFixed(1)}%`, icon: TrendingUp },
                { label: 'Worst Performer',  value: liveHoldings.length ? liveHoldings.reduce((a, b) => a.gainLossPct < b.gainLossPct ? a : b) : null, fmt: (h: LiveHolding) => `${h.gainLossPct.toFixed(1)}%`, icon: TrendingDown },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                  <div className="flex items-center gap-2 mb-3"><card.icon size={13} className="text-zinc-500" /><div className="text-[10px] text-zinc-500 uppercase tracking-wider">{card.label}</div></div>
                  {card.value ? (
                    <>
                      <div className="text-2xl font-black text-white font-mono mb-1">{card.value.symbol}</div>
                      <div className="text-sm font-semibold font-mono text-orange-400">{card.fmt(card.value)}</div>
                    </>
                  ) : <div className="text-zinc-600 text-sm">No data</div>}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ══ ALERTS VIEW ════════════════════════════════════════════════════════ */}
      {activeView === 'alerts' && (
        <AlertAgentPanel
          config={alertAgent.config}
          updateConfig={alertAgent.updateConfig}
          inAppAlerts={alertAgent.inAppAlerts}
          emailLogs={alertAgent.emailLogs}
          agentStatus={alertAgent.agentStatus}
          isEmailConfigured={alertAgent.isEmailConfigured}
          unacknowledgedCount={alertAgent.unacknowledgedCount}
          acknowledgeAlert={alertAgent.acknowledgeAlert}
          clearAllAlerts={alertAgent.clearAllAlerts}
          testAlert={alertAgent.testAlert}
          availableSymbols={[...new Set(activePortfolio?.holdings.map(h => h.symbol) || [])]}
        />
      )}

      {/* New Portfolio Modal */}
      {showNewPortfolio && (
        <NewPortfolioModal
          onClose={() => setShowNewPortfolio(false)}
          onCreate={(name, desc) => createPortfolio(name, desc)}
        />
      )}
    </div>
  );
}
