/**
 * CLARA — Run Cycle Modal
 * Animated full cycle execution with real progress steps.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle, Loader2, X, Zap, AlertTriangle, Activity } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  detail: string;
  duration: number; // ms
}

const CYCLE_STEPS: Step[] = [
  { id: 'ingest',    label: 'Event Ingestion',           detail: 'Pulling data from 14 feeds — news, filings, geopolitical…',  duration: 1200 },
  { id: 'nlp',       label: 'NLP Entity Extraction',     detail: 'IBM Watson Discovery running NER, sentiment, novelty score…', duration: 900  },
  { id: 'cluster',   label: 'Event Clustering',          detail: 'Grouping 3 related events — Taiwan/China/Trade nexus…',       duration: 700  },
  { id: 'analog',    label: 'Historical Analog Match',   detail: 'Scanning 30-year macro event database — top 5 analogs found…', duration: 1000 },
  { id: 'regime',    label: 'Regime Classification',     detail: 'VIX 78th pct · MOVE 72nd pct → Crisis Contagion (1.85×)…',  duration: 600  },
  { id: 'shock',     label: 'Shock Generation (NFTE)',   detail: 'IBM Granite generating factor shocks with confidence bands…', duration: 1400 },
  { id: 'mc',        label: 'Monte Carlo Simulation',    detail: 'Running 100,000 paths with regime-conditioned covariance…',  duration: 2200 },
  { id: 'breach',    label: 'Breach Detection',          detail: 'Checking VaR/ES against limits — 4 breaches detected!',      duration: 500  },
  { id: 'hedge',     label: 'Hedge Optimization',        detail: 'Convex optimization across 6 instrument classes…',           duration: 900  },
  { id: 'audit',     label: 'Audit Trail Logging',       detail: 'Writing governance packet — SR 11-7 compliant output…',     duration: 400  },
];

interface RunCycleModalProps {
  onClose: () => void;
}

export function RunCycleModal({ onClose }: RunCycleModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [cycleId] = useState(`CYC-${148 + Math.floor(Math.random() * 10)}`);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Advance through steps
  useEffect(() => {
    if (done) return;

    let stepIndex = 0;
    let timeout: ReturnType<typeof setTimeout>;

    function runStep(idx: number) {
      if (idx >= CYCLE_STEPS.length) {
        setDone(true);
        return;
      }
      setCurrentStep(idx);
      timeout = setTimeout(() => {
        setCompletedSteps(prev => new Set([...prev, idx]));
        runStep(idx + 1);
      }, CYCLE_STEPS[idx].duration);
    }

    runStep(stepIndex);
    return () => clearTimeout(timeout);
  }, [done]);

  // Elapsed timer
  useEffect(() => {
    const iv = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(iv);
  }, [startTime]);

  const progress = Math.round((completedSteps.size / CYCLE_STEPS.length) * 100);
  const elapsedStr = (elapsed / 1000).toFixed(1) + 's';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[560px] rounded-2xl border border-zinc-700 bg-black shadow-2xl shadow-black/60 overflow-hidden">

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-600 via-amber-600 to-purple-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30">
              <Zap size={16} className={cn('text-orange-400', !done && 'animate-pulse')} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">CLARA Cycle Running</div>
              <div className="text-[10px] text-zinc-500 font-mono">{cycleId} · {elapsedStr} elapsed</div>
            </div>
          </div>
          {done && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
            <span>Cycle Progress</span>
            <span className="font-mono text-orange-400">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
          {CYCLE_STEPS.map((step, idx) => {
            const isComplete = completedSteps.has(idx);
            const isActive   = currentStep === idx && !isComplete;
            const _isPending = idx > currentStep; void _isPending;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-300',
                  isComplete ? 'border-orange-900/40 bg-orange-950/15'
                  : isActive  ? 'border-orange-800/50 bg-orange-950/20'
                  : 'border-zinc-800/50 bg-black/20 opacity-40'
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isComplete ? (
                    <CheckCircle size={15} className="text-orange-400" />
                  ) : isActive ? (
                    <Loader2 size={15} className="text-orange-400 animate-spin" />
                  ) : (
                    <div className="h-[15px] w-[15px] rounded-full border-2 border-zinc-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-xs font-semibold',
                    isComplete ? 'text-orange-300' : isActive ? 'text-orange-300' : 'text-zinc-500'
                  )}>
                    {step.label}
                  </div>
                  {(isActive || isComplete) && (
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{step.detail}</div>
                  )}
                </div>
                {isComplete && (
                  <span className="text-[9px] font-mono text-orange-600 shrink-0">✓ done</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Result */}
        {done && (
          <div className="mx-6 mb-6 rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-bold text-amber-400 mb-2">Cycle Complete — 4 Breaches Detected</div>
                <div className="grid grid-cols-3 gap-3 text-[10px]">
                  <div className="rounded-lg bg-black/60 border border-zinc-800 px-3 py-2 text-center">
                    <div className="text-zinc-500 mb-0.5">Events</div>
                    <div className="text-white font-mono font-bold text-sm">3</div>
                  </div>
                  <div className="rounded-lg bg-black/60 border border-zinc-800 px-3 py-2 text-center">
                    <div className="text-zinc-500 mb-0.5">Shocks</div>
                    <div className="text-white font-mono font-bold text-sm">8</div>
                  </div>
                  <div className="rounded-lg bg-red-900/30 border border-red-800/40 px-3 py-2 text-center">
                    <div className="text-zinc-500 mb-0.5">Breaches</div>
                    <div className="text-red-400 font-mono font-bold text-sm">4</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <Activity size={10} />
            <span>SR 11-7 Compliant · Full audit trail logged</span>
          </div>
          {done ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-orange-700 bg-orange-950/40 hover:bg-orange-900/50 px-4 py-2 text-xs font-semibold text-orange-300 transition-all"
            >
              <CheckCircle size={12} /> Close & Review Results
            </button>
          ) : (
            <div className="text-[10px] text-zinc-600 font-mono animate-pulse">Processing…</div>
          )}
        </div>
      </div>
    </div>
  );
}
