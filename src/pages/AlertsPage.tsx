import { cn } from '@/utils/cn';
import { portfolioImpact } from '@/data/mockData';
import { AlertTriangle, Bell, CheckCircle, Clock, Shield, TrendingUp, XCircle } from 'lucide-react';

const alerts = [
  {
    id: 'ALT-001',
    severity: 'critical' as const,
    title: 'VaR 95% Limit Breach',
    detail: '1-Day VaR at $28.7M exceeds $25M limit (+14.8%)',
    timestamp: '14:32:44 UTC',
    source: 'Portfolio Risk Engine',
    action: 'Hedge execution recommended',
    acknowledged: false,
  },
  {
    id: 'ALT-002',
    severity: 'critical' as const,
    title: 'Expected Shortfall Breach',
    detail: 'ES at $45.3M exceeds $40M limit (+13.3%)',
    timestamp: '14:32:44 UTC',
    source: 'Portfolio Risk Engine',
    action: 'Risk committee notification triggered',
    acknowledged: false,
  },
  {
    id: 'ALT-003',
    severity: 'critical' as const,
    title: 'Tail Loss Probability Breach',
    detail: 'P(loss > 3σ) = 8.4%, limit 5.0%',
    timestamp: '14:32:45 UTC',
    source: 'Monte Carlo Engine',
    action: 'Position reduction recommended',
    acknowledged: false,
  },
  {
    id: 'ALT-004',
    severity: 'critical' as const,
    title: 'VaR 99% Limit Breach',
    detail: '10-Day VaR 99% at $72.1M exceeds $65M limit',
    timestamp: '14:32:44 UTC',
    source: 'Portfolio Risk Engine',
    action: 'Escalation to CRO',
    acknowledged: false,
  },
  {
    id: 'ALT-005',
    severity: 'warning' as const,
    title: 'Regime Transition Detected',
    detail: 'Moved from "Tightening Cycle" → "Crisis Contagion". Multiplier: 1.85×',
    timestamp: '14:32:25 UTC',
    source: 'Regime Engine',
    action: 'Shock recalibration complete',
    acknowledged: true,
  },
  {
    id: 'ALT-006',
    severity: 'warning' as const,
    title: 'Event Compounding Detected',
    detail: 'EVT-001 (China tariffs) + EVT-003 (Taiwan Strait) — nonlinear amplification',
    timestamp: '14:32:18 UTC',
    source: 'Bayesian Update Engine',
    action: 'Compound scenario generated',
    acknowledged: true,
  },
  {
    id: 'ALT-007',
    severity: 'info' as const,
    title: 'Hedge Coverage Below Target',
    detail: 'Portfolio hedge coverage at 68%, target 80%',
    timestamp: '14:33:01 UTC',
    source: 'Hedge Engine',
    action: '6 proposals generated',
    acknowledged: true,
  },
  {
    id: 'ALT-008',
    severity: 'info' as const,
    title: 'Correlation Matrix Stress Active',
    detail: 'Cross-asset correlations shifted +0.15 uniform. Convergence toward 1.',
    timestamp: '14:32:30 UTC',
    source: 'Regime Engine',
    action: 'Applied to simulation',
    acknowledged: true,
  },
];

const severityConfig = {
  critical: { bg: 'bg-red-950/30 border-red-900/50', icon: XCircle, iconColor: 'text-red-400', badge: 'bg-red-500/20 text-red-400', label: 'CRITICAL' },
  warning: { bg: 'bg-amber-950/20 border-amber-900/50', icon: AlertTriangle, iconColor: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400', label: 'WARNING' },
  info: { bg: 'bg-black/20 border-zinc-900/50', icon: Bell, iconColor: 'text-zinc-400', badge: 'bg-amber-600/20 text-zinc-400', label: 'INFO' },
};

export function AlertsPage() {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const unackCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Alert & Breach Management</h2>
          <p className="text-xs text-zinc-500 mt-0.5">VaR, ES, and limit breach detection with automated escalation workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
            <CheckCircle size={13} />
            Acknowledge All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Critical</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-0.5">{criticalCount}</div>
        </div>
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Warning</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{warningCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-900/50 bg-black/20 px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Info</div>
          <div className="text-2xl font-bold font-mono text-zinc-400 mt-0.5">{alerts.length - criticalCount - warningCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Unacknowledged</div>
          <div className="text-2xl font-bold font-mono text-white mt-0.5">{unackCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
          <div className="text-[10px] text-zinc-500 uppercase">Total Active</div>
          <div className="text-2xl font-bold font-mono text-orange-400 mt-0.5">{alerts.length}</div>
        </div>
      </div>

      {/* Breach Summary */}
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Limit Breach Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {portfolioImpact.filter(p => p.breached).map(item => (
            <div key={item.metric} className="rounded-lg border border-red-900/30 bg-red-950/30 px-3 py-2.5">
              <div className="text-[10px] text-zinc-500 uppercase">{item.metric}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-red-400">{item.stressed}M</span>
                <span className="text-[10px] text-zinc-600">/ {item.limit}M limit</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px]">
                <TrendingUp size={10} />
                <span>+{item.change.toFixed(0)}% from normal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">All Active Alerts</h3>
        <div className="space-y-2">
          {alerts.map(alert => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <div key={alert.id} className={cn('rounded-lg border p-4 transition-colors', config.bg)}>
                <div className="flex items-start gap-3">
                  <Icon size={16} className={cn('mt-0.5 shrink-0', config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-zinc-600">{alert.id}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase', config.badge)}>{config.label}</span>
                      {alert.acknowledged && (
                        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-semibold text-orange-400">ACK</span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">{alert.detail}</p>
                    <div className="mt-2 flex items-center gap-4 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1"><Clock size={10} /> {alert.timestamp}</span>
                      <span className="flex items-center gap-1"><Shield size={10} /> {alert.source}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-orange-400">
                      Action: {alert.action}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer shrink-0">
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
