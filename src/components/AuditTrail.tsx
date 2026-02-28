import { cn } from '@/utils/cn';
import { auditTrail } from '@/data/mockData';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const statusConfig = {
  pass: { icon: CheckCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  flag: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export function AuditTrail() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Governance Audit Trail</h3>
        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-semibold text-orange-400 uppercase">
          SR 11-7 Compliant
        </span>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        {auditTrail.map((entry, i) => {
          const config = statusConfig[entry.status];
          const Icon = config.icon;
          return (
            <div key={i} className={cn('flex items-start gap-3 rounded-lg px-3 py-2', config.bg)}>
              <Icon size={13} className={cn('mt-0.5 shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{entry.timestamp}</span>
                  <span className="text-[10px] font-semibold text-zinc-400">{entry.component}</span>
                </div>
                <p className="text-[11px] text-zinc-300 mt-0.5">{entry.action}</p>
              </div>
              <span className="shrink-0 text-[10px] font-mono text-zinc-500">conf: {entry.confidence}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
