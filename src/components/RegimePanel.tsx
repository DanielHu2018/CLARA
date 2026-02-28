import { currentRegime } from '@/data/mockData';

interface GaugeProps {
  label: string;
  value: number;
  unit?: string;
  max?: number;
  danger?: number;
  warn?: number;
}

function Gauge({ label, value, unit = '', max = 100, danger = 85, warn = 65 }: GaugeProps) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= danger ? 'bg-red-500' : value >= warn ? 'bg-amber-500' : 'bg-orange-500';
  const textColor = value >= danger ? 'text-red-400' : value >= warn ? 'text-amber-400' : 'text-orange-400';

  return (
    <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-lg font-bold font-mono ${textColor}`}>
        {value}{unit}
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RegimePanel() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Regime Engine</h3>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-amber-400">{currentRegime.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Gauge label="VIX Percentile" value={currentRegime.vixPercentile} unit="th" />
        <Gauge label="MOVE Percentile" value={currentRegime.movePercentile} unit="th" />
        <Gauge label="Liquidity Score" value={currentRegime.liquidityScore} max={100} danger={100} warn={100} />
        <Gauge label="Credit Spread" value={currentRegime.creditSpread} unit="bp" max={300} danger={180} warn={120} />
        <Gauge label="Corr Cluster" value={Math.round(currentRegime.correlationCluster * 100)} unit="%" danger={75} warn={60} />
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3 flex flex-col justify-center items-center">
          <div className="text-[10px] text-amber-500 uppercase tracking-wider">Shock Multiplier</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-300">{currentRegime.shockMultiplier}×</div>
        </div>
      </div>
    </div>
  );
}
