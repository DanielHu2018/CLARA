import { useState } from 'react';
import { cn } from '@/utils/cn';
import { MonteCarloChart } from '@/components/MonteCarloChart';
import { VaRChart } from '@/components/VaRChart';
import { SensitivityChart } from '@/components/SensitivityChart';
import { Settings, Info, Sparkles } from 'lucide-react';
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell
} from 'recharts';

const convergenceData = [
  { paths: '1K', var95: 24.1, var99: 62.5, es: 38.2 },
  { paths: '5K', var95: 26.3, var99: 67.8, es: 41.5 },
  { paths: '10K', var95: 27.5, var99: 69.2, es: 43.1 },
  { paths: '25K', var95: 28.1, var99: 70.8, es: 44.2 },
  { paths: '50K', var95: 28.5, var99: 71.5, es: 44.9 },
  { paths: '100K', var95: 28.7, var99: 72.1, es: 45.3 },
];

const sensitivityData = [
  { factor: 'Equity Vol +10%', varImpact: 4.2, esImpact: 6.8 },
  { factor: 'Corr +0.1', varImpact: 3.8, esImpact: 5.5 },
  { factor: 'Rate Shock +50bp', varImpact: 2.9, esImpact: 4.1 },
  { factor: 'Credit Widen +30bp', varImpact: 2.4, esImpact: 3.6 },
  { factor: 'FX Vol +15%', varImpact: 1.8, esImpact: 2.9 },
  { factor: 'Liquidity -20%', varImpact: 3.1, esImpact: 5.2 },
];

// Mock data for tornado diagram
const tornadoData = [
  { factor_name: 'equity_vol', base_var: 28500, low_var: 24300, high_var: 33800, impact_range: 9500, impact_pct: 33.3 },
  { factor_name: 'beta', base_var: 28500, low_var: 25100, high_var: 32200, impact_range: 7100, impact_pct: 24.9 },
  { factor_name: 'correlation', base_var: 28500, low_var: 25800, high_var: 31500, impact_range: 5700, impact_pct: 20.0 },
  { factor_name: 'concentration', base_var: 28500, low_var: 26200, high_var: 30900, impact_range: 4700, impact_pct: 16.5 },
  { factor_name: 'rates', base_var: 28500, low_var: 27100, high_var: 30200, impact_range: 3100, impact_pct: 10.9 },
];

const DISTRIBUTIONS = [
  { value: 'normal', label: 'Normal', description: 'Standard Gaussian distribution' },
  { value: 'student_t', label: 'Student-t', description: 'Fat-tailed distribution for extreme events' },
  { value: 'lognormal', label: 'Log-Normal', description: 'Right-skewed, positive-only returns' },
  { value: 'exponential', label: 'Exponential', description: 'Extreme value modeling' }
];

const CONFIDENCE_LEVELS = [
  { value: 0.90, label: '90%' },
  { value: 0.95, label: '95%' },
  { value: 0.99, label: '99%' }
];

export function SimulationPage() {
  const [selectedDistribution, setSelectedDistribution] = useState('normal');
  const [useWatsonRecommendation, setUseWatsonRecommendation] = useState(true);
  const [selectedConfidenceLevels, setSelectedConfidenceLevels] = useState([0.95, 0.99]);
  const [showConfig, setShowConfig] = useState(false);

  const toggleConfidenceLevel = (level: number) => {
    setSelectedConfidenceLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level].sort()
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Monte Carlo Simulation Engine</h2>
          <p className="text-xs text-zinc-500 mt-0.5">100K path simulation with regime-conditioned covariance, non-linear payoff modeling, correlation stress</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuration
          </button>
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-semibold text-orange-400 uppercase">100K Paths Complete</span>
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-semibold text-orange-400 uppercase">Converged</span>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-black border border-zinc-900 rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Simulation Configuration</h3>
            <button
              onClick={() => setShowConfig(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {/* Distribution Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Probability Distribution
            </label>
            <div className="grid grid-cols-4 gap-3">
              {DISTRIBUTIONS.map(dist => (
                <button
                  key={dist.value}
                  onClick={() => {
                    setSelectedDistribution(dist.value);
                    setUseWatsonRecommendation(false);
                  }}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    selectedDistribution === dist.value && !useWatsonRecommendation
                      ? 'border-zinc-600 bg-zinc-800 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">{dist.label}</div>
                  <div className="text-xs text-zinc-500">{dist.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Watson AI Recommendation */}
          <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <input
              type="checkbox"
              id="watson-recommend"
              checked={useWatsonRecommendation}
              onChange={(e) => setUseWatsonRecommendation(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="watson-recommend" className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Use Watson AI Distribution Recommendation
              </label>
              <p className="text-xs text-zinc-500 mt-1">
                Watson AI analyzes historical returns and statistical properties to recommend the optimal distribution model.
              </p>
              {useWatsonRecommendation && (
                <div className="mt-3 p-2 bg-amber-950/20 border border-amber-900/50 rounded text-xs">
                  <span className="text-amber-400 font-medium">Recommended:</span>
                  <span className="text-zinc-300 ml-2">Student-t distribution (fat tails detected)</span>
                </div>
              )}
            </div>
          </div>

          {/* Confidence Levels */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              VaR/ES Confidence Levels
            </label>
            <div className="flex gap-3">
              {CONFIDENCE_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => toggleConfidenceLevel(level.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedConfidenceLevels.includes(level.value)
                      ? 'border-zinc-600 bg-zinc-800 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Select one or more confidence levels for VaR and Expected Shortfall calculations.
            </p>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-zinc-950/50 border border-zinc-900 rounded">
            <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              Distribution selection affects tail risk estimates. Student-t captures fat tails better than Normal. 
              Watson AI recommendation is based on statistical tests (Jarque-Bera, kurtosis, skewness).
            </p>
          </div>
        </div>
      )}

      {/* Simulation Stats */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Total Paths', value: '100,000', color: 'text-orange-400' },
          { label: 'Computation Time', value: '142s', color: 'text-orange-400' },
          { label: 'Covariance Matrix', value: 'Regime-Adj', color: 'text-amber-400' },
          { label: 'Payoff Model', value: 'Non-Linear', color: 'text-purple-400' },
          { label: 'Correlation Stress', value: 'Active', color: 'text-red-400' },
          { label: 'Convergence', value: '99.2%', color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
            <div className={cn('text-lg font-bold font-mono mt-0.5', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-2 gap-4">
        <MonteCarloChart />
        <VaRChart />
      </div>

      {/* Factor Sensitivity Analysis - Tornado Diagram */}
      <SensitivityChart data={tornadoData} baseVar={28500} />

      {/* Convergence Analysis */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Convergence Analysis</h3>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={convergenceData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="paths" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="var95" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeWidth={2} name="VaR 95% ($M)" />
              <Area type="monotone" dataKey="var99" stroke="#a855f7" fill="#a855f7" fillOpacity={0.05} strokeWidth={2} name="VaR 99% ($M)" />
              <Area type="monotone" dataKey="es" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} name="ES ($M)" />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Sensitivity Analysis — VaR Impact ($M)</h3>
          <div className="bg-zinc-900/50 rounded-lg p-3">
            <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sensitivityData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis type="category" dataKey="factor" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="varImpact" name="VaR Impact" fill="#06b6d4" opacity={0.7} radius={[0, 4, 4, 0]}>
                {sensitivityData.map((_, i) => (
                  <Cell key={i} fill={i < 2 ? '#ef4444' : i < 4 ? '#f59e0b' : '#06b6d4'} opacity={0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tail Analysis */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Tail Risk Decomposition</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="pb-2 text-left font-medium">Percentile</th>
                <th className="pb-2 text-right font-medium">Portfolio Loss ($M)</th>
                <th className="pb-2 text-right font-medium">Probability</th>
                <th className="pb-2 text-right font-medium">Paths</th>
                <th className="pb-2 text-left font-medium pl-3">Primary Driver</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pct: '90th', loss: 18.2, prob: '10%', paths: '10,000', driver: 'Equity + Credit' },
                { pct: '95th', loss: 28.7, prob: '5%', paths: '5,000', driver: 'Semiconductor shock' },
                { pct: '97.5th', loss: 38.4, prob: '2.5%', paths: '2,500', driver: 'Geopolitical contagion' },
                { pct: '99th', loss: 52.1, prob: '1%', paths: '1,000', driver: 'Full correlation spike' },
                { pct: '99.5th', loss: 68.3, prob: '0.5%', paths: '500', driver: 'Liquidity + correlation' },
                { pct: '99.9th', loss: 95.7, prob: '0.1%', paths: '100', driver: 'Systemic crisis' },
              ].map(row => (
                <tr key={row.pct} className="border-b border-zinc-800/50">
                  <td className="py-2.5 font-medium text-zinc-200">{row.pct}</td>
                  <td className="py-2.5 text-right font-mono text-red-400">${row.loss}M</td>
                  <td className="py-2.5 text-right font-mono text-zinc-400">{row.prob}</td>
                  <td className="py-2.5 text-right font-mono text-zinc-500">{row.paths}</td>
                  <td className="py-2.5 pl-3 text-zinc-500">{row.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-5 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h4 className="text-sm font-semibold text-white mb-3">Simulation Configuration</h4>
            <div className="space-y-2">
              {[
                { param: 'Random Number Generator', value: 'Sobol Quasi-Monte Carlo' },
                { param: 'Covariance Model', value: 'DCC-GARCH (regime-switched)' },
                { param: 'Fat Tails', value: 'Student-t (ν=4.2)' },
                { param: 'Jump Diffusion', value: 'Merton model (λ=0.08)' },
                { param: 'Correlation Stress', value: '+0.15 uniform shift' },
                { param: 'Vol Surface', value: 'SABR calibrated' },
                { param: 'Time Horizon', value: '1-day & 10-day' },
              ].map(p => (
                <div key={p.param} className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                  <span className="text-[11px] text-zinc-500">{p.param}</span>
                  <span className="text-[11px] font-mono text-orange-400">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-purple-900/30 bg-purple-950/10 p-5">
            <h4 className="text-xs font-semibold text-purple-400 uppercase mb-2">Convexity Sensitivity</h4>
            <div className="space-y-2">
              {[
                { metric: 'Gamma Exposure', value: '-$2.4M / 1%', status: 'warning' },
                { metric: 'Vol-of-Vol Sens', value: '$1.8M / 1pt', status: 'ok' },
                { metric: 'Skew Shift Vuln', value: '$3.1M / 5%', status: 'warning' },
                { metric: 'Theta Decay (1d)', value: '-$420K', status: 'ok' },
              ].map(m => (
                <div key={m.metric} className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">{m.metric}</span>
                  <span className={cn('text-[11px] font-mono', m.status === 'warning' ? 'text-amber-400' : 'text-zinc-400')}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
