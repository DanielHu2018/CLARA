import { varTimeSeries } from '@/data/mockData';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function VaRChart() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">VaR / ES Intraday Trajectory</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> VaR 95%</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> VaR 99%</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> ES</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Limit</span>
        </div>
      </div>
      <div className="bg-zinc-900/50 rounded-lg p-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={varTimeSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
            <linearGradient id="varGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="esGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} domain={[0, 80]} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'VaR Limit', position: 'right', fill: '#ef4444', fontSize: 10 }} />
          <Area type="monotone" dataKey="var99" stroke="#a855f7" strokeWidth={1.5} fill="none" dot={false} />
          <Area type="monotone" dataKey="es" stroke="#f59e0b" strokeWidth={1.5} fill="url(#esGrad)" dot={false} />
          <Area type="monotone" dataKey="var95" stroke="#06b6d4" strokeWidth={2} fill="url(#varGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
