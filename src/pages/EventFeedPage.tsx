import { useState } from 'react';
import { cn } from '@/utils/cn';
import { liveEvents } from '@/data/mockData';
import { AlertCircle, ArrowRight, CheckCircle, Clock, Filter, Globe, Radio, RefreshCw, Search, TrendingDown } from 'lucide-react';

const statusColors = {
  new: 'bg-amber-600/20 text-zinc-400 border-zinc-900/40',
  processing: 'bg-amber-500/20 text-amber-400 border-amber-900/40',
  translated: 'bg-purple-500/20 text-purple-400 border-purple-900/40',
  simulated: 'bg-orange-500/20 text-orange-400 border-orange-900/40',
};

const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  geopolitical: Globe,
  macro: TrendingDown,
  earnings: TrendingDown,
  policy: AlertCircle,
  commodity: Radio,
  credit: AlertCircle,
};

const categoryColors: Record<string, string> = {
  geopolitical: 'bg-red-500/15 text-red-400',
  macro: 'bg-amber-600/15 text-zinc-400',
  earnings: 'bg-green-500/15 text-green-400',
  policy: 'bg-purple-500/15 text-purple-400',
  commodity: 'bg-orange-500/15 text-orange-400',
  credit: 'bg-amber-500/15 text-amber-400',
};

export function EventFeedPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<string | null>('EVT-003');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', 'geopolitical', 'macro', 'policy', 'credit', 'commodity'];
  const filtered = liveEvents.filter(e => {
    const matchCat = selectedFilter === 'all' || e.category === selectedFilter;
    const matchSearch = searchQuery === '' || e.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const selected = liveEvents.find(e => e.id === selectedEvent);

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Event Intelligence Layer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time global event ingestion, NLP classification, and relevance scoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-orange-400">
            <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            Live Ingestion Active
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-orange-800 bg-orange-950/50 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-900/50 transition-colors cursor-pointer">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Events (24h)', value: '1,247', color: 'text-white' },
          { label: 'Filtered Relevant', value: '86', color: 'text-orange-400' },
          { label: 'Avg Relevance', value: '82%', color: 'text-amber-400' },
          { label: 'Pending Translation', value: '3', color: 'text-purple-400' },
          { label: 'Avg Sentiment', value: '-0.58', color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
            <div className={cn('text-lg font-bold font-mono mt-0.5', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-black pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-700"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={13} className="text-zinc-500 mr-1" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase transition-colors cursor-pointer',
                selectedFilter === cat
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-800'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Event List */}
        <div className="col-span-5 rounded-xl border border-zinc-800 bg-black/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-white">Live Feed</span>
            </div>
            <span className="text-[10px] text-zinc-500">{filtered.length} events</span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((event) => {
              const Icon = categoryIcons[event.category] || Globe;
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event.id)}
                  className={cn(
                    'group rounded-lg border p-3 transition-colors cursor-pointer',
                    selectedEvent === event.id
                      ? 'border-orange-700 bg-orange-950/20'
                      : 'border-zinc-800 bg-black/50 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      event.relevanceScore >= 90 ? 'bg-red-500/15 text-red-400' :
                      event.relevanceScore >= 75 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-zinc-700/50 text-zinc-400'
                    )}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-zinc-600">{event.id}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase', statusColors[event.status].split(' ').slice(0, 2).join(' '))}>
                          {event.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-200 leading-relaxed">{event.title}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
                        <span>{event.source}</span>
                        <span>•</span>
                        <span>{event.timestamp}</span>
                        <span>•</span>
                        <span className={cn('font-semibold', event.relevanceScore >= 90 ? 'text-red-400' : event.relevanceScore >= 75 ? 'text-amber-400' : 'text-zinc-400')}>
                          REL {event.relevanceScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Detail Panel */}
        <div className="col-span-7 space-y-4">
          {selected ? (
            <>
              {/* Event Detail Card */}
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-zinc-500">{selected.id}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase border', statusColors[selected.status])}>
                        {selected.status}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase', categoryColors[selected.category])}>
                        {selected.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{selected.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>{selected.source}</span>
                      <span>•</span>
                      <span>{selected.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Scores Grid */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Relevance</div>
                    <div className={cn('text-xl font-bold font-mono mt-1', selected.relevanceScore >= 90 ? 'text-red-400' : selected.relevanceScore >= 75 ? 'text-amber-400' : 'text-orange-400')}>
                      {selected.relevanceScore}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                      <div className={cn('h-full rounded-full', selected.relevanceScore >= 90 ? 'bg-red-500' : selected.relevanceScore >= 75 ? 'bg-amber-500' : 'bg-orange-500')} style={{ width: `${selected.relevanceScore}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Sentiment</div>
                    <div className={cn('text-xl font-bold font-mono mt-1', selected.sentiment < -0.5 ? 'text-red-400' : selected.sentiment < 0 ? 'text-amber-400' : 'text-orange-400')}>
                      {(selected.sentiment * 100).toFixed(0)}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                      <div className={cn('h-full rounded-full', selected.sentiment < -0.5 ? 'bg-red-500' : 'bg-amber-500')} style={{ width: `${Math.abs(selected.sentiment) * 100}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Novelty</div>
                    <div className={cn('text-xl font-bold font-mono mt-1', selected.novelty >= 80 ? 'text-purple-400' : 'text-orange-400')}>
                      {selected.novelty}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${selected.novelty}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Impact</div>
                    <div className="text-xl font-bold font-mono mt-1 text-red-400">High</div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-red-500" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>

                {/* Sectors */}
                <div className="mt-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Affected Sectors</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.sectors.map(s => (
                      <span key={s} className="rounded-lg bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Processing Pipeline */}
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-4">Processing Pipeline</h4>
                <div className="flex items-center gap-2">
                  {[
                    { step: 'Ingested', done: true },
                    { step: 'NLP Extraction', done: true },
                    { step: 'Classified', done: true },
                    { step: 'Relevance Scored', done: true },
                    { step: 'Analog Matched', done: selected.status === 'translated' || selected.status === 'simulated' },
                    { step: 'Shock Translated', done: selected.status === 'translated' || selected.status === 'simulated' },
                    { step: 'MC Simulated', done: selected.status === 'simulated' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 flex-1">
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                        s.done ? 'border-orange-700 bg-orange-500/15' : 'border-zinc-700 bg-zinc-800'
                      )}>
                        {s.done ? <CheckCircle size={13} className="text-orange-400" /> : <Clock size={13} className="text-zinc-500" />}
                      </div>
                      <div className="text-[9px] text-zinc-400 leading-tight">{s.step}</div>
                      {i < 6 && <ArrowRight size={10} className="text-zinc-700 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Entity Extraction */}
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3">NLP Entity Extraction</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'Organizations', entities: ['TSMC', 'NVIDIA', 'Apple', 'US Commerce Dept'], color: 'text-orange-400 bg-orange-500/10 border-orange-900/30' },
                    { type: 'Geographies', entities: ['Taiwan', 'China', 'United States', 'East Asia'], color: 'text-amber-400 bg-amber-500/10 border-amber-900/30' },
                    { type: 'Financial Instruments', entities: ['SOX Index', 'USD/TWD', 'Semiconductor ETF'], color: 'text-purple-400 bg-purple-500/10 border-purple-900/30' },
                  ].map(group => (
                    <div key={group.type} className="rounded-lg border border-zinc-800 bg-black/50 p-3">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{group.type}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.entities.map(e => (
                          <span key={e} className={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium', group.color)}>{e}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relevance Formula */}
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3">Relevance Score Decomposition</h4>
                <div className="font-mono text-xs text-zinc-400 bg-black rounded-lg p-3 mb-4 border border-zinc-800">
                  Score = Exposure-Weighted Sector Similarity × Novelty × Sentiment Magnitude
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-1">Sector Similarity</div>
                    <div className="h-2 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-orange-500" style={{ width: '92%' }} /></div>
                    <div className="text-[10px] font-mono text-orange-400 mt-1">0.92</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-1">Novelty Factor</div>
                    <div className="h-2 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-purple-500" style={{ width: `${selected.novelty}%` }} /></div>
                    <div className="text-[10px] font-mono text-purple-400 mt-1">{(selected.novelty / 100).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-1">Sentiment Magnitude</div>
                    <div className="h-2 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-red-500" style={{ width: `${Math.abs(selected.sentiment) * 100}%` }} /></div>
                    <div className="text-[10px] font-mono text-red-400 mt-1">{Math.abs(selected.sentiment).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-xl border border-zinc-800 bg-black/50">
              <p className="text-sm text-zinc-600">Select an event to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
