import { cn } from '@/utils/cn';
import { auditTrail } from '@/data/mockData';
import { CheckCircle, AlertTriangle, XCircle, FileText, Shield, Download } from 'lucide-react';

const statusConfig = {
  pass: { icon: CheckCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-900/30' },
  flag: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-900/30' },
};

const validationChecks = [
  { check: 'Input data integrity', status: 'pass' as const, detail: 'All feeds verified' },
  { check: 'Shock bounds validation', status: 'pass' as const, detail: 'No unbounded outputs' },
  { check: 'Analog reference citation', status: 'pass' as const, detail: 'All shocks grounded' },
  { check: 'Confidence score calibration', status: 'pass' as const, detail: 'Within historical range' },
  { check: 'Regime classification ensemble', status: 'warning' as const, detail: '1 model dissent' },
  { check: 'Monte Carlo convergence', status: 'pass' as const, detail: '99.2% converged' },
  { check: 'Hedge feasibility', status: 'pass' as const, detail: 'All instruments liquid' },
  { check: 'Correlation matrix PSD', status: 'pass' as const, detail: 'Positive semi-definite' },
  { check: 'Model version control', status: 'pass' as const, detail: 'v2.4.1 validated' },
  { check: 'Output reproducibility', status: 'pass' as const, detail: 'Seed: 42, deterministic' },
];

const complianceItems = [
  { framework: 'SR 11-7 (Model Risk Management)', status: 'Compliant', detail: 'All model outputs logged with inputs, assumptions, and limitations' },
  { framework: 'Internal Model Governance Policy', status: 'Compliant', detail: 'Model validation packet generated, review scheduled' },
  { framework: 'Audit Traceability Standards', status: 'Compliant', detail: 'Full chain of custody from event → shock → simulation → hedge' },
  { framework: 'Explainability Requirements', status: 'Compliant', detail: 'No black-box outputs — all decisions have cited rationale' },
];

export function AuditTrailPage() {
  const passCount = validationChecks.filter(c => c.status === 'pass').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Governance & Audit Trail</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Full audit logging, model validation, SR 11-7 compliance, and explainability layer</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-semibold text-orange-400 uppercase">
            SR 11-7 Compliant
          </span>
          <button className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
            <Download size={13} />
            Export Audit Report
          </button>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Validation Score', value: `${passCount}/${validationChecks.length}`, color: 'text-orange-400' },
          { label: 'Audit Entries', value: `${auditTrail.length}`, color: 'text-orange-400' },
          { label: 'Compliance Status', value: 'PASS', color: 'text-orange-400' },
          { label: 'Last Validated', value: '14:33 UTC', color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
            <div className={cn('text-xl font-bold font-mono mt-0.5', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Audit Log */}
        <div className="col-span-7 rounded-xl border border-zinc-800 bg-black/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Complete Audit Trail — Current Cycle</h3>
          <div className="space-y-1">
            {auditTrail.map((entry, i) => {
              const config = statusConfig[entry.status];
              const Icon = config.icon;
              return (
                <div key={i} className={cn('flex items-start gap-3 rounded-lg border px-3 py-2.5', config.bg, config.border)}>
                  <Icon size={13} className={cn('mt-0.5 shrink-0', config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">{entry.timestamp}</span>
                      <span className="text-[10px] font-semibold text-zinc-300">{entry.component}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{entry.action}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono text-zinc-500">conf: {entry.confidence}%</span>
                </div>
              );
            })}
          </div>

          {/* Additional context */}
          <div className="mt-4 rounded-lg border border-zinc-800 bg-black/50 p-3">
            <div className="text-[10px] text-zinc-500 uppercase mb-2">Cycle Summary</div>
            <div className="grid grid-cols-4 gap-3 text-[11px]">
              <div><span className="text-zinc-600">Total Steps: </span><span className="text-white font-mono">8</span></div>
              <div><span className="text-zinc-600">Duration: </span><span className="text-white font-mono">5:42</span></div>
              <div><span className="text-zinc-600">Warnings: </span><span className="text-amber-400 font-mono">1</span></div>
              <div><span className="text-zinc-600">Flags: </span><span className="text-red-400 font-mono">1</span></div>
            </div>
          </div>
        </div>

        {/* Validation & Compliance */}
        <div className="col-span-5 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={15} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Model Validation Checks</h3>
            </div>
            <div className="space-y-1.5">
              {validationChecks.map(c => {
                const config = statusConfig[c.status];
                const Icon = config.icon;
                return (
                  <div key={c.check} className="flex items-center gap-2 text-[11px]">
                    <Icon size={13} className={config.color} />
                    <span className="text-zinc-300 flex-1">{c.check}</span>
                    <span className="text-zinc-500 text-[10px]">{c.detail}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Regulatory Compliance</h3>
            </div>
            <div className="space-y-2">
              {complianceItems.map(item => (
                <div key={item.framework} className="rounded-lg border border-orange-900/30 bg-orange-950/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">{item.framework}</span>
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold text-orange-400">{item.status}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 p-5">
            <h4 className="text-xs font-semibold text-orange-400 uppercase mb-2">Output Formats Available</h4>
            <div className="grid grid-cols-3 gap-2">
              {['PDF Report', 'JSON API', 'CSV Export'].map(fmt => (
                <button key={fmt} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-[11px] text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer text-center">
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
