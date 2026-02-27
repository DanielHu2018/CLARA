import { useState } from 'react';
import { cn } from '@/utils/cn';
import { shockMatrix } from '@/data/mockData';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function ShockMatrixPage() {
  const [selectedFactor, setSelectedFactor] = useState<string>('S&P 500');
  const selected = shockMatrix.find(s => s.factor === selectedFactor);

  const chartData = shockMatrix.map(s => ({
    name: s.factor,
    base: Math.abs(s.baseCase),
    adverse: Math.abs(s.adverseCase),
    severe: Math.abs(s.severeCase),
    baseRaw: s.baseCase,
    adverseRaw: s.adverseCase,
    severeRaw: s.severeCase,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Narrative-to-Factor Translation Engine</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Regime-aware shock generation with historical analog grounding — IBM Granite LLM</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-semibold text-amber-400 uppercase">Regime-Adjusted · 1.85× Multiplier</span>
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-semibold text-orange-400 uppercase">Analog Grounded</span>
        </div>
      </div>

      {/* Shock Construction Rules */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Factors Shocked', value: '8', color: 'text-orange-400' },
          { label: 'Avg Confidence', value: `${Math.round(shockMatrix.reduce((s, x) => s + x.confidence, 0) / shockMatrix.length)}%`, color: 'text-orange-400' },
          { label: 'Regime Multiplier', value: '1.85×', color: 'text-amber-400' },
          { label: 'Cross-Asset Corr', value: '0.78', color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
            <div className={cn('text-xl font-bold font-mono mt-0.5', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Shock Magnitude Chart */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Shock Magnitude Comparison (Absolute %)</h3>
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="base" name="Base Case" fill="#06b6d4" opacity={0.6} radius={[2, 2, 0, 0]} />
            <Bar dataKey="adverse" name="Adverse (95th)" fill="#f59e0b" opacity={0.7} radius={[2, 2, 0, 0]} />
            <Bar dataKey="severe" name="Severe (99th)" fill="#ef4444" opacity={0.8} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Full Matrix Table */}
        <div className="col-span-8 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Full Shock Matrix</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="pb-2 text-left font-medium">Factor</th>
                <th className="pb-2 text-right font-medium">Base</th>
                <th className="pb-2 text-right font-medium">Adverse (95)</th>
                <th className="pb-2 text-right font-medium">Severe (99)</th>
                <th className="pb-2 text-right font-medium">Confidence</th>
                <th className="pb-2 text-right font-medium">Probability</th>
                <th className="pb-2 text-left font-medium pl-3">Analog Reference</th>
              </tr>
            </thead>
            <tbody>
              {shockMatrix.map((s) => (
                <tr
                  key={s.factor}
                  onClick={() => setSelectedFactor(s.factor)}
                  className={cn(
                    'border-b border-zinc-800/50 transition-colors cursor-pointer',
                    selectedFactor === s.factor ? 'bg-orange-950/20' : 'hover:bg-zinc-800/30'
                  )}
                >
                  <td className="py-2.5 font-medium text-zinc-200">{s.factor}</td>
                  <td className={cn('py-2.5 text-right font-mono', s.baseCase < 0 ? 'text-red-400' : 'text-orange-400')}>
                    {s.baseCase > 0 ? '+' : ''}{s.baseCase}%
                  </td>
                  <td className={cn('py-2.5 text-right font-mono', s.adverseCase < 0 ? 'text-red-400' : 'text-amber-400')}>
                    {s.adverseCase > 0 ? '+' : ''}{s.adverseCase}%
                  </td>
                  <td className={cn('py-2.5 text-right font-mono font-bold', s.severeCase < 0 ? 'text-red-500' : 'text-red-400')}>
                    {s.severeCase > 0 ? '+' : ''}{s.severeCase}%
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-zinc-800">
                        <div
                          className={cn('h-full rounded-full', s.confidence >= 80 ? 'bg-orange-500' : s.confidence >= 65 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${s.confidence}%` }}
                        />
                      </div>
                      <span className="font-mono text-zinc-400 w-8 text-right">{s.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-zinc-500">{(s.probability * 100).toFixed(0)}%</td>
                  <td className="py-2.5 pl-3 text-zinc-500 text-[11px]">{s.analogRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Factor Detail */}
        <div className="col-span-4 space-y-4">
          {selected && (
            <>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3">{selected.factor} — Shock Detail</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Base Case (Expected)', value: selected.baseCase, color: 'cyan' },
                    { label: 'Adverse (95th %ile)', value: selected.adverseCase, color: 'amber' },
                    { label: 'Severe (99th %ile)', value: selected.severeCase, color: 'red' },
                  ].map(scenario => (
                    <div key={scenario.label} className={cn('rounded-lg border p-3', `border-${scenario.color}-900/30 bg-${scenario.color}-950/10`)}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 uppercase">{scenario.label}</span>
                        <span className={cn('text-lg font-bold font-mono', `text-${scenario.color}-400`)}>
                          {scenario.value > 0 ? '+' : ''}{scenario.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3">Analog Reference</h4>
                <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                  <div className="text-xs font-medium text-orange-400">{selected.analogRef}</div>
                  <div className="text-[10px] text-zinc-500 mt-1">Historical analog used for shock calibration</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-zinc-500">Confidence</div>
                      <div className="text-sm font-bold font-mono text-white">{selected.confidence}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">Probability</div>
                      <div className="text-sm font-bold font-mono text-white">{(selected.probability * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-5">
                <h4 className="text-xs font-semibold text-amber-400 uppercase mb-2">Shock Construction Rules</h4>
                <ul className="space-y-1.5 text-[11px] text-zinc-400">
                  <li className="flex items-center gap-2">✓ <span>Probability distribution attached</span></li>
                  <li className="flex items-center gap-2">✓ <span>Confidence interval bounded</span></li>
                  <li className="flex items-center gap-2">✓ <span>Analog reference cited</span></li>
                  <li className="flex items-center gap-2">✓ <span>No unbounded shocks</span></li>
                  <li className="flex items-center gap-2">✓ <span>No deterministic outputs</span></li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
