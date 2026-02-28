import { cn } from '@/utils/cn';
import { currentRegime, correlationData } from '@/data/mockData';
import { usePortfolioContext } from '@/contexts/PortfolioContext';
import { Briefcase } from 'lucide-react';

interface GaugeProps {
  label: string;
  value: number;
  unit?: string;
  max?: number;
  danger?: number;
  warn?: number;
  description?: string;
}

function GaugeLarge({ label, value, unit = '', max = 100, danger = 85, warn = 65, description }: GaugeProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= danger ? 'bg-red-500' : value >= warn ? 'bg-amber-500' : 'bg-orange-500';
  const textColor = value >= danger ? 'text-red-400' : value >= warn ? 'text-amber-400' : 'text-orange-400';
  const ring = value >= danger ? 'border-red-900/50' : value >= warn ? 'border-amber-900/50' : 'border-orange-900/50';

  return (
    <div className={cn('rounded-xl border bg-black/50 p-4', ring)}>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={cn('mt-1 text-3xl font-black font-mono', textColor)}>
        {value}{unit}
      </div>
      {description && <div className="text-[10px] text-zinc-600 mt-1">{description}</div>}
      <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-zinc-700">0</span>
        <span className="text-[9px] text-zinc-700">{max}</span>
      </div>
    </div>
  );
}

const regimeHistory = [
  { date: 'Today 14:32', regime: 'Crisis Contagion', multiplier: 1.85, trigger: 'Taiwan + Tariffs compound' },
  { date: 'Today 09:15', regime: 'Tightening Cycle', multiplier: 1.35, trigger: 'CPI print 5.2%' },
  { date: 'Yesterday', regime: 'Tightening Cycle', multiplier: 1.30, trigger: 'Fed hawkish tone' },
  { date: '2 days ago', regime: 'Low Vol Expansion', multiplier: 1.00, trigger: 'Stable macro' },
  { date: '3 days ago', regime: 'Low Vol Expansion', multiplier: 1.00, trigger: 'Earnings season positive' },
];

const regimeTypes = [
  { name: 'Low Vol Expansion', color: 'bg-orange-500', desc: 'Stable growth, low volatility, narrow spreads', mult: '1.0×' },
  { name: 'Tightening Cycle', color: 'bg-amber-500', desc: 'Rising rates, moderate vol, spread widening', mult: '1.2–1.4×' },
  { name: 'Inflation Shock', color: 'bg-orange-500', desc: 'Inflation surprise, rate vol, real asset rotation', mult: '1.3–1.6×' },
  { name: 'Crisis Contagion', color: 'bg-red-500', desc: 'Cross-asset contagion, correlation convergence', mult: '1.5–2.0×' },
  { name: 'Liquidity Contraction', color: 'bg-purple-500', desc: 'Bid-ask widening, slippage, execution risk', mult: '1.6–2.2×' },
];

export function RegimeAnalysisPage() {
  const { getSelectedSymbols, hasSelections } = usePortfolioContext();
  const selectedSymbols = hasSelections ? getSelectedSymbols() : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Regime Detection Engine
            {hasSelections && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-orange-400 bg-orange-950/50 border border-orange-800/50 rounded-full px-2 py-0.5">
                <Briefcase size={10} />
                Portfolio: {selectedSymbols.join(', ')}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {hasSelections 
              ? `Regime analysis focused on your ${selectedSymbols.length} portfolio holdings`
              : 'Multi-factor regime classification with dynamic shock multipliers and correlation adjustment'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm font-bold text-amber-400">{currentRegime.label}</span>
          <span className="text-xs font-mono text-amber-300 ml-2">Multiplier: {currentRegime.shockMultiplier}×</span>
        </div>
      </div>

      {/* Current Regime Banner */}
      <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-500 uppercase font-semibold tracking-wider">Active Regime</div>
            <div className="text-2xl font-black text-amber-300 mt-1">{currentRegime.label}</div>
            <div className="text-xs text-zinc-400 mt-1">Cross-asset contagion detected. Correlation matrix converging toward 1. Volatility surface steepening active.</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black font-mono text-amber-300">{currentRegime.shockMultiplier}×</div>
            <div className="text-[10px] text-amber-500 uppercase">Dynamic Shock Multiplier</div>
          </div>
        </div>
      </div>

      {/* Input Gauges */}
      <div className="grid grid-cols-3 gap-4">
        <GaugeLarge label="VIX Percentile" value={currentRegime.vixPercentile} unit="th" description="Equity implied volatility — extreme zone" />
        <GaugeLarge label="MOVE Index Percentile" value={currentRegime.movePercentile} unit="th" description="Interest rate volatility — elevated" />
        <GaugeLarge label="Liquidity Score" value={currentRegime.liquidityScore} max={100} danger={100} warn={100} description="Bid-ask proxy — severely impaired" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <GaugeLarge label="Credit Spread (IG)" value={currentRegime.creditSpread} unit="bp" max={300} danger={180} warn={120} description="Investment grade spread widening" />
        <GaugeLarge label="Correlation Clustering" value={Math.round(currentRegime.correlationCluster * 100)} unit="%" danger={75} warn={60} description="Cross-asset correlation convergence" />
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-amber-500 uppercase tracking-wider">Ensemble Output</div>
          <div className="text-5xl font-black font-mono text-amber-300 mt-2">{currentRegime.shockMultiplier}×</div>
          <div className="text-[10px] text-zinc-500 mt-2">Applied to all factor shocks</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Regime Type Reference */}
        <div className="col-span-5 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Regime Classification Reference</h3>
          <div className="space-y-2">
            {regimeTypes.map(r => (
              <div key={r.name} className={cn('rounded-lg border border-zinc-800 bg-black/40 p-3', r.name === currentRegime.label && 'border-amber-800 bg-amber-950/20')}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('h-2.5 w-2.5 rounded-full', r.color)} />
                  <span className="text-xs font-semibold text-white">{r.name}</span>
                  {r.name === currentRegime.label && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[8px] font-bold text-amber-400">ACTIVE</span>}
                  <span className="ml-auto text-[10px] font-mono text-zinc-500">{r.mult}</span>
                </div>
                <p className="text-[10px] text-zinc-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Regime History + Correlation */}
        <div className="col-span-7 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Regime Transition History</h3>
            <div className="space-y-2">
              {regimeHistory.map((r, i) => (
                <div key={i} className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5', i === 0 ? 'border-amber-800 bg-amber-950/20' : 'border-zinc-800 bg-black/40')}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-600 w-24">{r.date}</span>
                    <span className={cn('text-xs font-semibold', i === 0 ? 'text-amber-400' : 'text-zinc-300')}>{r.regime}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500">{r.trigger}</span>
                    <span className="text-xs font-mono text-zinc-400">{r.multiplier}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Correlation Regime Shift — Normal → Stressed</h3>
            <div className="space-y-2">
              {correlationData.map((c) => {
                const shift = Math.abs(c.stressed - c.normal);
                const isConverging = Math.abs(c.stressed) > Math.abs(c.normal);
                return (
                  <div key={`${c.x}-${c.y}`} className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-medium">{c.x} / {c.y}</span>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-zinc-500">{c.normal.toFixed(2)}</span>
                        <span className="text-zinc-700">→</span>
                        <span className={cn('font-bold', isConverging ? 'text-red-400' : 'text-orange-400')}>{c.stressed.toFixed(2)}</span>
                        <span className={cn('text-[10px]', shift > 0.15 ? 'text-red-400' : 'text-amber-400')}>Δ{shift.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      <div className="flex-1">
                        <div className="h-1.5 w-full rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-zinc-500" style={{ width: `${Math.abs(c.normal) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 w-full rounded-full bg-zinc-800">
                          <div className={cn('h-full rounded-full', isConverging ? 'bg-red-500' : 'bg-orange-500')} style={{ width: `${Math.abs(c.stressed) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
