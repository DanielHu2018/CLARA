import { cn } from '@/utils/cn';
import { liveEvents } from '@/data/mockData';
import { AlertCircle, ArrowRight, Globe, Radio, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const statusColors = {
  new: 'bg-orange-500/20 text-orange-400 border-orange-900/30',
  processing: 'bg-amber-500/20 text-amber-400 border-amber-900/30',
  translated: 'bg-purple-500/20 text-purple-400 border-purple-900/30',
  simulated: 'bg-emerald-500/20 text-emerald-400 border-emerald-900/30',
};

const categoryColors: Record<string, string> = {
  geopolitical: 'bg-orange-500/15 text-orange-400 border-orange-900/30',
  macro: 'bg-orange-500/15 text-orange-400 border-orange-900/30',
  earnings: 'bg-green-500/15 text-green-400 border-green-900/30',
  policy: 'bg-purple-500/15 text-purple-400 border-purple-900/30',
  commodity: 'bg-orange-500/15 text-orange-400 border-orange-900/30',
  credit: 'bg-amber-500/15 text-amber-400 border-amber-900/30',
};

const sentimentIcon = (sentiment: number) => {
  if (sentiment > 0.1) return <TrendingUp size={12} className="text-emerald-400" />;
  if (sentiment < -0.1) return <TrendingDown size={12} className="text-orange-400" />;
  return <Minus size={12} className="text-zinc-500" />;
};

const getRiskColor = (relevanceScore: number) => {
  if (relevanceScore >= 90) return 'border-l-orange-500 bg-orange-950/10';
  if (relevanceScore >= 75) return 'border-l-amber-500 bg-amber-950/10';
  return 'border-l-emerald-600 bg-transparent';
};

const categoryIcons = {
  geopolitical: Globe,
  macro: TrendingDown,
  earnings: TrendingDown,
  policy: AlertCircle,
  commodity: Radio,
  credit: AlertCircle,
};

export function EventFeed() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          <h3 className="text-sm font-semibold text-white">Live Event Intelligence</h3>
        </div>
        <span className="text-[10px] text-zinc-500">{liveEvents.length} active events</span>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {liveEvents.map((event) => {
          return (
            <div
              key={event.id}
              className={cn(
                'group rounded-lg border-l-4 border border-zinc-800 p-3 transition-all cursor-pointer hover:border-zinc-700',
                getRiskColor(event.relevanceScore)
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {sentimentIcon(event.sentiment)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase', categoryColors[event.category])}>
                      {event.category}
                    </span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase', statusColors[event.status])}>
                      {event.status}
                    </span>
                    {event.relevanceScore >= 90 && (
                      <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-900/30 px-2 py-0.5 text-[9px] font-bold uppercase">
                        HIGH RISK
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-zinc-200 leading-snug mb-1">{event.title}</p>
                  <div className="flex items-center gap-2 text-[9px] text-zinc-600 flex-wrap">
                    <span className="text-zinc-500">{event.source}</span>
                    <span>·</span>
                    <span>{event.timestamp}</span>
                    <span>·</span>
                    <span className={cn('font-semibold',
                      event.relevanceScore >= 90 ? 'text-orange-400' :
                      event.relevanceScore >= 75 ? 'text-amber-400' : 'text-zinc-400'
                    )}>
                      REL {event.relevanceScore}%
                    </span>
                    <span>·</span>
                    <span className={event.sentiment < -0.5 ? 'text-orange-400' : event.sentiment < 0 ? 'text-amber-400' : 'text-emerald-400'}>
                      SNT {(event.sentiment * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.sectors.slice(0, 3).map((s) => (
                      <span key={s} className="rounded bg-zinc-800 px-1 font-mono text-orange-400 text-[9px]">{s}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight size={14} className="mt-1 shrink-0 text-zinc-700 group-hover:text-orange-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
