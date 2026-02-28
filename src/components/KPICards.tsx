import { cn } from '@/utils/cn';
import { AlertTriangle, Activity, Clock, Shield, Zap, BarChart3 } from 'lucide-react';

const kpis = [
  {
    label: '1-Day VaR (95%)',
    value: '$28.7M',
    change: '+131%',
    status: 'critical' as const,
    icon: AlertTriangle,
    detail: 'Limit: $25M',
  },
  {
    label: 'Expected Shortfall',
    value: '$45.3M',
    change: '+143%',
    status: 'critical' as const,
    icon: Activity,
    detail: 'Limit: $40M',
  },
  {
    label: 'Active Breaches',
    value: '4',
    change: '+3 new',
    status: 'critical' as const,
    icon: Zap,
    detail: 'VaR, ES, Tail',
  },
  {
    label: 'Hedge Coverage',
    value: '68%',
    change: 'Optimizing',
    status: 'warning' as const,
    icon: Shield,
    detail: 'Cost: $2.84M',
  },
  {
    label: 'Cycle Latency',
    value: '5:42',
    change: '< 6 min ✓',
    status: 'ok' as const,
    icon: Clock,
    detail: '100K MC paths',
  },
  {
    label: 'Regime',
    value: 'Crisis',
    change: '1.85× mult',
    status: 'critical' as const,
    icon: BarChart3,
    detail: 'VIX 92nd %ile',
  },
];

const statusStyles = {
  critical: {
    border: 'border-red-900/50',
    bg: 'bg-red-950/20',
    icon: 'bg-red-500/15 text-red-400',
    value: 'text-red-400',
    badge: 'text-red-400',
  },
  warning: {
    border: 'border-amber-900/50',
    bg: 'bg-amber-950/20',
    icon: 'bg-amber-500/15 text-amber-400',
    value: 'text-amber-400',
    badge: 'text-amber-400',
  },
  ok: {
    border: 'border-orange-900/50',
    bg: 'bg-orange-950/20',
    icon: 'bg-orange-500/15 text-orange-400',
    value: 'text-orange-400',
    badge: 'text-orange-400',
  },
};

export function KPICards() {
  return (
    <div className="grid grid-cols-6 gap-3">
      {kpis.map((kpi) => {
        const style = statusStyles[kpi.status];
        return (
          <div
            key={kpi.label}
            className={cn(
              'rounded-xl border p-3 transition-colors',
              style.border,
              style.bg
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-300 uppercase tracking-wider font-medium">{kpi.label}</span>
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', style.icon)}>
                <kpi.icon size={15} />
              </div>
            </div>
            <div className={cn('text-2xl font-bold font-mono', style.value)}>{kpi.value}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className={cn('text-xs font-semibold', style.badge)}>{kpi.change}</span>
              <span className="text-xs text-zinc-400">{kpi.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
