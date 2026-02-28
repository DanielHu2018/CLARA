import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { hedgeRecommendations } from '@/data/mockData';
import { Shield, CheckCircle, ArrowRight, DollarSign, Target, TrendingDown, Zap, Loader2 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { fetchHedgeAIAnalysis, type AIAnalysisResult } from '@/services/aiAnalysisService';

const priorityStyles = {
  high: 'bg-red-500/15 text-red-400 border-red-900/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-900/30',
  low: 'bg-zinc-700/30 text-zinc-400 border-zinc-700',
};

export function HedgeEnginePage() {
  const [selectedHedge, setSelectedHedge] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const totalCost = '$2.84M';
  const avgEffectiveness = Math.round(hedgeRecommendations.reduce((s, h) => s + h.effectiveness, 0) / hedgeRecommendations.length);

  const effData = hedgeRecommendations.map(h => ({
    name: h.instrument.split(' ')[0],
    effectiveness: h.effectiveness,
    residual: h.residualTail,
  }));

  const selected = hedgeRecommendations[selectedHedge];

  useEffect(() => {
    let mounted = true;
    const loadAnalysis = async () => {
      setAiLoading(true);
      const result = await fetchHedgeAIAnalysis();
      if (mounted) {
        setAiAnalysis(result);
        setAiLoading(false);
      }
    };
    loadAnalysis();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Hedge Optimization Engine</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Convex optimization with cost, liquidity, tracking error, and mandate constraints</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors cursor-pointer">
          <Zap size={13} />
          Execute All Hedges
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Cost', value: totalCost, icon: DollarSign, color: 'text-amber-400' },
          { label: 'Avg Effectiveness', value: `${avgEffectiveness}%`, icon: Target, color: 'text-orange-400' },
          { label: 'Proposals', value: `${hedgeRecommendations.length}`, icon: Shield, color: 'text-orange-400' },
          { label: 'High Priority', value: `${hedgeRecommendations.filter(h => h.priority === 'high').length}`, icon: Zap, color: 'text-red-400' },
          { label: 'Residual Tail (Avg)', value: `${(hedgeRecommendations.reduce((s, h) => s + h.residualTail, 0) / hedgeRecommendations.length).toFixed(1)}%`, icon: TrendingDown, color: 'text-purple-400' },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.label}</span>
              <k.icon size={13} className="text-zinc-600" />
            </div>
            <div className={cn('text-xl font-bold font-mono', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">AI Hedge Quality Check</h3>
          {aiLoading && <Loader2 size={14} className="text-orange-400 animate-spin" />}
        </div>
        {aiAnalysis ? (
          <div className="space-y-2.5">
            <p className="text-xs text-zinc-300 leading-relaxed">{aiAnalysis.summary}</p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>Provider: <span className="text-zinc-300 uppercase">{aiAnalysis.provider}</span></span>
              <span>•</span>
              <span>Confidence: <span className={cn('font-mono', aiAnalysis.confidence >= 0.65 ? 'text-orange-400' : 'text-amber-400')}>{Math.round(aiAnalysis.confidence * 100)}%</span></span>
              {aiAnalysis.needs_review && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">Needs analyst review</span>
                </>
              )}
            </div>
            {aiAnalysis.recommended_actions.length > 0 && (
              <ul className="space-y-1 text-[11px] text-zinc-400">
                {aiAnalysis.recommended_actions.slice(0, 2).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">AI analysis unavailable right now. Check backend server and API key configuration.</p>
        )}
      </div>

      {/* Effectiveness Chart */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Hedge Effectiveness vs Residual Tail Exposure</h3>
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <ResponsiveContainer width="100%" height={220}>
          <BarChart data={effData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#334155' }} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="effectiveness" name="Effectiveness %" radius={[4, 4, 0, 0]}>
              {effData.map((_, i) => (
                <Cell key={i} fill={hedgeRecommendations[i].priority === 'high' ? '#06b6d4' : hedgeRecommendations[i].priority === 'medium' ? '#f59e0b' : '#475569'} opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Hedge List */}
        <div className="col-span-7 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Hedge Proposals</h3>
          <div className="space-y-2">
            {hedgeRecommendations.map((h, i) => (
              <div
                key={h.instrument}
                onClick={() => setSelectedHedge(i)}
                className={cn(
                  'group rounded-lg border p-3 transition-colors cursor-pointer',
                  selectedHedge === i ? 'border-orange-700 bg-orange-950/20' : 'border-zinc-800 bg-black/50 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border', priorityStyles[h.priority])}>
                      {h.priority}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-zinc-200">{h.instrument}</div>
                      <div className="text-[10px] text-zinc-500">{h.type} • {h.notional}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <div className="font-mono text-zinc-300">{h.cost}</div>
                      <div className="text-[10px] text-zinc-600">cost</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-orange-400">{h.effectiveness}%</div>
                      <div className="text-[10px] text-zinc-600">effective</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-amber-400">{h.residualTail}%</div>
                      <div className="text-[10px] text-zinc-600">residual</div>
                    </div>
                    <ArrowRight size={14} className="text-zinc-700 group-hover:text-orange-400 transition-colors" />
                  </div>
                </div>
                <div className="mt-2 h-1 w-full rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-500" style={{ width: `${h.effectiveness}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Detail */}
        <div className="col-span-5 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h4 className="text-sm font-semibold text-white mb-3">Instrument Detail</h4>
            <div className="space-y-3">
              {[
                { label: 'Instrument', value: selected.instrument },
                { label: 'Type', value: selected.type },
                { label: 'Notional', value: selected.notional },
                { label: 'Cost', value: selected.cost },
                { label: 'Effectiveness', value: `${selected.effectiveness}%` },
                { label: 'Residual Tail', value: `${selected.residualTail}%` },
                { label: 'Priority', value: selected.priority.toUpperCase() },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                  <span className="text-[11px] text-zinc-500">{row.label}</span>
                  <span className="text-xs font-mono text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h4 className="text-sm font-semibold text-white mb-3">Optimization Constraints</h4>
            <div className="space-y-2">
              {[
                { constraint: 'Cost Budget', status: 'pass', detail: 'Within $5M limit' },
                { constraint: 'Liquidity', status: 'pass', detail: 'Avg daily volume OK' },
                { constraint: 'Tracking Error', status: 'pass', detail: '< 2% TE constraint' },
                { constraint: 'Mandate Compliance', status: 'pass', detail: 'All instruments allowed' },
                { constraint: 'Execution Feasibility', status: selected.priority === 'low' ? 'warning' : 'pass', detail: selected.priority === 'low' ? 'Low liquidity window' : 'Immediate execution' },
              ].map(c => (
                <div key={c.constraint} className="flex items-center gap-2 text-[11px]">
                  <CheckCircle size={13} className={c.status === 'pass' ? 'text-orange-400' : 'text-amber-400'} />
                  <span className="text-zinc-300 flex-1">{c.constraint}</span>
                  <span className="text-zinc-500">{c.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 p-5">
            <h4 className="text-xs font-semibold text-orange-400 uppercase mb-2">Optimization Method</h4>
            <ul className="space-y-1.5 text-[11px] text-zinc-400">
              <li>• Convex optimization (SOCP)</li>
              <li>• Scenario-based tail minimization</li>
              <li>• Greeks targeting (delta/gamma/vega)</li>
              <li>• Liquidity-weighted cost penalty</li>
              <li>• Regime-conditioned slippage model</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
