import { cn } from '@/utils/cn';
import { systemMetrics } from '@/data/mockData';
import { Activity, CheckCircle, Cpu, Database, Globe, Server, Wifi } from 'lucide-react';

const services = [
  { name: 'Event Intelligence Layer', status: 'operational' as const, latency: '45ms', uptime: '99.99%', icon: Globe },
  { name: 'IBM Watson Discovery', status: 'operational' as const, latency: '120ms', uptime: '99.97%', icon: Database },
  { name: 'Granite LLM (NFTE)', status: 'operational' as const, latency: '850ms', uptime: '99.95%', icon: Cpu },
  { name: 'Regime Engine', status: 'operational' as const, latency: '32ms', uptime: '99.99%', icon: Activity },
  { name: 'Monte Carlo Engine', status: 'operational' as const, latency: '142s', uptime: '99.98%', icon: Server },
  { name: 'Hedge Optimizer', status: 'operational' as const, latency: '1.2s', uptime: '99.96%', icon: Wifi },
  { name: 'Governance Logger', status: 'operational' as const, latency: '15ms', uptime: '99.99%', icon: CheckCircle },
  { name: 'Vector Similarity Store', status: 'operational' as const, latency: '28ms', uptime: '99.98%', icon: Database },
];

const pipelineSteps = [
  { step: 'Event Detection', target: '< 60s', actual: '45s', status: 'pass' as const },
  { step: 'NLP Translation', target: '< 120s', actual: '85s', status: 'pass' as const },
  { step: 'Simulation', target: '< 180s', actual: '142s', status: 'pass' as const },
  { step: 'Full Cycle', target: '< 6 min', actual: '5:42', status: 'pass' as const },
];

const recentCycles = [
  { id: 'CYC-147', time: '14:33', duration: '5:42', events: 3, shocks: 8, breaches: 4, status: 'complete' },
  { id: 'CYC-146', time: '14:27', duration: '4:18', events: 1, shocks: 4, breaches: 1, status: 'complete' },
  { id: 'CYC-145', time: '14:22', duration: '3:55', events: 2, shocks: 6, breaches: 2, status: 'complete' },
  { id: 'CYC-144', time: '14:16', duration: '4:02', events: 1, shocks: 3, breaches: 0, status: 'complete' },
  { id: 'CYC-143', time: '14:10', duration: '5:12', events: 2, shocks: 5, breaches: 1, status: 'complete' },
  { id: 'CYC-142', time: '14:04', duration: '3:48', events: 1, shocks: 2, breaches: 0, status: 'complete' },
];

export function SystemHealthPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">System Health & Performance</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time monitoring of all CLARA subsystems, latency metrics, and pipeline performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-xs font-semibold text-orange-400">All Systems Operational</span>
        </div>
      </div>

      {/* System KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Uptime', value: systemMetrics.uptime, color: 'text-orange-400' },
          { label: 'Events Processed', value: systemMetrics.eventsProcessed.toLocaleString(), color: 'text-orange-400' },
          { label: 'Avg Latency', value: systemMetrics.avgLatency, color: 'text-orange-400' },
          { label: 'Models Validated', value: systemMetrics.modelsValidated.toString(), color: 'text-purple-400' },
          { label: 'MC Paths/Cycle', value: systemMetrics.mcPaths, color: 'text-amber-400' },
          { label: 'Regime Changes', value: systemMetrics.regimeChanges.toString(), color: 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.label}</div>
            <div className={cn('text-xl font-bold font-mono mt-0.5', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Service Status */}
        <div className="col-span-7 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Service Status</h3>
          <div className="space-y-2">
            {services.map(s => (
              <div key={s.name} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <s.icon size={14} className="text-zinc-500" />
                  <span className="text-xs text-zinc-200">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-zinc-500">Latency: {s.latency}</span>
                  <span className="text-[10px] font-mono text-zinc-500">Uptime: {s.uptime}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="text-[10px] font-semibold text-orange-400 uppercase">Operational</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latency Targets */}
        <div className="col-span-5 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Latency Compliance</h3>
            <div className="space-y-3">
              {pipelineSteps.map(p => (
                <div key={p.step} className="rounded-lg border border-orange-900/30 bg-orange-950/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-200 font-medium">{p.step}</span>
                    <CheckCircle size={13} className="text-orange-400" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-zinc-500">Target: {p.target}</span>
                    <span className="text-zinc-700">→</span>
                    <span className="text-orange-400 font-mono font-semibold">Actual: {p.actual}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: '75%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Reliability Config</h3>
            <div className="space-y-2 text-[11px]">
              {[
                { param: 'Target Uptime', value: '99.9%' },
                { param: 'Fallback Mode', value: 'Last known regime' },
                { param: 'Safe Mode Threshold', value: 'Confidence < 50%' },
                { param: 'Model Version', value: 'v2.4.1' },
                { param: 'IBM Granite Model', value: 'granite-13b-instruct' },
              ].map(p => (
                <div key={p.param} className="flex items-center justify-between border-b border-zinc-800/50 pb-1.5">
                  <span className="text-zinc-500">{p.param}</span>
                  <span className="font-mono text-orange-400">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Cycles */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Recent Processing Cycles</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="pb-2 text-left font-medium">Cycle ID</th>
              <th className="pb-2 text-right font-medium">Time</th>
              <th className="pb-2 text-right font-medium">Duration</th>
              <th className="pb-2 text-right font-medium">Events</th>
              <th className="pb-2 text-right font-medium">Shocks</th>
              <th className="pb-2 text-right font-medium">Breaches</th>
              <th className="pb-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentCycles.map(c => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2.5 font-mono text-orange-400">{c.id}</td>
                <td className="py-2.5 text-right font-mono text-zinc-400">{c.time}</td>
                <td className="py-2.5 text-right font-mono text-zinc-300">{c.duration}</td>
                <td className="py-2.5 text-right font-mono text-zinc-400">{c.events}</td>
                <td className="py-2.5 text-right font-mono text-zinc-400">{c.shocks}</td>
                <td className={cn('py-2.5 text-right font-mono', c.breaches > 0 ? 'text-red-400 font-bold' : 'text-zinc-500')}>{c.breaches}</td>
                <td className="py-2.5 text-right">
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-semibold text-orange-400 uppercase">{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
