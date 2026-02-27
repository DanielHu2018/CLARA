import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface SensitivityResult {
  factor_name: string;
  base_var: number;
  low_var: number;
  high_var: number;
  impact_range: number;
  impact_pct: number;
}

interface SensitivityChartProps {
  data: SensitivityResult[];
  baseVar: number;
}

const FACTOR_LABELS: Record<string, string> = {
  equity_vol: 'Equity Volatility',
  beta: 'Portfolio Beta',
  correlation: 'Asset Correlation',
  concentration: 'Position Concentration',
  rates: 'Interest Rates',
  credit_spread: 'Credit Spreads',
  fx: 'FX Rates',
  commodity: 'Commodity Prices'
};

export function SensitivityChart({ data, baseVar }: SensitivityChartProps) {
  // Transform data for tornado chart
  const chartData = data.map(item => {
    const lowImpact = item.low_var - baseVar;
    const highImpact = item.high_var - baseVar;
    
    return {
      factor: FACTOR_LABELS[item.factor_name] || item.factor_name,
      lowImpact: lowImpact,
      highImpact: highImpact,
      impactRange: item.impact_range,
      impactPct: item.impact_pct
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black border border-zinc-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-white mb-2">{data.factor}</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Downside Impact:</span>
              <span className="text-red-400 font-medium">${Math.abs(data.lowImpact).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Upside Impact:</span>
              <span className="text-green-400 font-medium">${Math.abs(data.highImpact).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-800">
              <span className="text-zinc-400">Total Range:</span>
              <span className="text-white font-semibold">${data.impactRange.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Impact %:</span>
              <span className="text-white font-semibold">{data.impactPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxAbsValue = Math.max(
    ...chartData.map(d => Math.max(Math.abs(d.lowImpact), Math.abs(d.highImpact)))
  );

  return (
    <div className="bg-black border border-zinc-900 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Sensitivity Analysis</h3>
          <p className="text-sm text-zinc-400">VaR Impact by Risk Factor (Tornado Diagram)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-zinc-400">Downside</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-zinc-400">Upside</span>
          </div>
        </div>
      </div>

      {/* Base VaR Reference */}
      <div className="mb-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded flex items-center justify-between">
        <span className="text-sm text-zinc-400">Base VaR (95%, 1-day):</span>
        <span className="text-lg font-semibold text-white">${baseVar.toLocaleString()}</span>
      </div>

      {/* Tornado Chart */}
      <div className="bg-zinc-900/50 rounded-lg p-3">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              domain={[-maxAbsValue * 1.1, maxAbsValue * 1.1]}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#52525b"
            />
            <YAxis
              type="category"
              dataKey="factor"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              width={140}
              stroke="#52525b"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(63, 63, 70, 0.3)' }} />
            <ReferenceLine x={0} stroke="#71717a" strokeWidth={2} />
            
            {/* Downside bars (negative, red) */}
            <Bar dataKey="lowImpact" stackId="a" fill="#ef4444" radius={[4, 0, 0, 4]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-low-${index}`} fill="#ef4444" opacity={0.8} />
              ))}
            </Bar>
            
            {/* Upside bars (positive, green) */}
            <Bar dataKey="highImpact" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-high-${index}`} fill="#10b981" opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 px-3 text-zinc-400 font-medium">Risk Factor</th>
              <th className="text-right py-2 px-3 text-zinc-400 font-medium">Impact Range</th>
              <th className="text-right py-2 px-3 text-zinc-400 font-medium">Impact %</th>
              <th className="text-right py-2 px-3 text-zinc-400 font-medium">Rank</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.factor_name} className="border-b border-zinc-900 hover:bg-zinc-900/30">
                <td className="py-2 px-3 text-white">
                  {FACTOR_LABELS[item.factor_name] || item.factor_name}
                </td>
                <td className="py-2 px-3 text-right text-white font-medium">
                  ${item.impact_range.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right">
                  <span className={`font-medium ${
                    item.impact_pct > 20 ? 'text-red-400' :
                    item.impact_pct > 10 ? 'text-amber-400' :
                    'text-green-400'
                  }`}>
                    {item.impact_pct.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-zinc-400">
                  #{index + 1}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Footer */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-zinc-950/50 border border-zinc-900 rounded">
        <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Tornado diagram shows VaR sensitivity to ±20% perturbations in each risk factor. 
          Wider bars indicate higher sensitivity. Factors are ranked by total impact range.
        </p>
      </div>
    </div>
  );
}
