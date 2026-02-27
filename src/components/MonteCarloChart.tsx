import { monteCarloDistribution } from '@/data/mockData';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function MonteCarloChart() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Monte Carlo Distribution (100K paths)</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-red-400">■ Tail (&lt;5%)</span>
          <span className="text-amber-400">■ Adverse</span>
          <span className="text-orange-400">■ Core</span>
        </div>
      </div>
      <div className="bg-zinc-900/50 rounded-lg p-2">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monteCarloDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="bin" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
          />
          <ReferenceLine x="-8%" stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'VaR 99', position: 'top', fill: '#ef4444', fontSize: 9 }} />
          <ReferenceLine x="-6%" stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'VaR 95', position: 'top', fill: '#f59e0b', fontSize: 9 }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Paths">
            {monteCarloDistribution.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index <= 1 ? '#ef4444' : index <= 3 ? '#f59e0b' : '#06b6d4'}
                opacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
