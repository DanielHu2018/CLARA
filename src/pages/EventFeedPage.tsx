import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useDailyDigest } from '@/hooks/useDailyDigest';
import type { ScrapedEvent } from '@/services/webScraperService';
import {
  ArrowRight, CheckCircle, Clock, ExternalLink,
  Globe, Mail, RefreshCw, Search, Send,
  TrendingDown, TrendingUp, Minus, Bot,
  Zap, Loader2,
} from 'lucide-react';

// ── Style maps ────────────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  geopolitical: 'bg-orange-500/15 text-orange-400 border-orange-900/30',
  macro:        'bg-orange-500/15 text-orange-400 border-orange-900/30',
  earnings:     'bg-green-500/15 text-green-400 border-green-900/30',
  policy:       'bg-purple-500/15 text-purple-400 border-purple-900/30',
  commodity:    'bg-orange-500/15 text-orange-400 border-orange-900/30',
  credit:       'bg-amber-500/15 text-amber-400 border-amber-900/30',
  tech:         'bg-orange-500/15 text-orange-400 border-orange-900/30',
  market:       'bg-slate-500/15 text-slate-400 border-slate-700/30',
};

const riskColors: Record<string, string> = {
  high:   'border-l-orange-500   bg-orange-950/10',
  medium: 'border-l-amber-500 bg-amber-950/10',
  low:    'border-l-emerald-600 bg-transparent',
};

const sentimentIcon = (s: string) => {
  if (s === 'positive') return <TrendingUp  size={12} className="text-emerald-400" />;
  if (s === 'negative') return <TrendingDown size={12} className="text-orange-400" />;
  return <Minus size={12} className="text-slate-500" />;
};

const CATEGORIES = ['all', 'macro', 'geopolitical', 'earnings', 'policy', 'commodity', 'credit', 'tech', 'market'];

// ── Digest Config Panel ───────────────────────────────────────────────────────

function DigestConfigPanel({
  config, updateConfig, logs, sending, lastSent, isEmailConfigured, sendDigest, scraping, runScrape, events, scrapeStatus, scrapeSource,
}: ReturnType<typeof useDailyDigest>) {
  const [tab, setTab] = useState<'config' | 'logs' | 'preview'>('config');

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15">
          <Bot size={14} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">AI Digest Agent</h3>
          <p className="text-[10px] text-slate-500">Daily morning email • Auto-summarized</p>
        </div>
        <div className={cn(
          'ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold',
          config.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
        )}>
          <div className={cn('h-1.5 w-1.5 rounded-full', config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
          {config.enabled ? 'ACTIVE' : 'PAUSED'}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 rounded-lg bg-orange-950/30 p-1">
        {(['config', 'logs', 'preview'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer',
              tab === t ? 'bg-orange-700/50 text-white' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {t === 'config' ? '⚙️ Config' : t === 'logs' ? '📋 Logs' : '👁️ Preview'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── CONFIG TAB ── */}
        {tab === 'config' && (
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between rounded-lg border border-orange-800/50 bg-orange-950/20 p-3">
              <div>
                <div className="text-xs font-semibold text-white">Enable Daily Digest</div>
                <div className="text-[10px] text-slate-500">Send AI market summary every morning</div>
              </div>
              <button
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors cursor-pointer',
                  config.enabled ? 'bg-orange-600' : 'bg-slate-700'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  config.enabled ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">
                Recipient Email
              </label>
              <input
                type="email"
                value={config.recipientEmail}
                onChange={e => updateConfig({ recipientEmail: e.target.value })}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-orange-800/50 bg-orange-950/20 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-700"
              />
            </div>

            {/* Send time */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">
                Send Time (daily)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={config.sendTime}
                  onChange={e => updateConfig({ sendTime: e.target.value })}
                  className="flex-1 rounded-lg border border-orange-800/50 bg-orange-950/20 px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-700"
                />
                <div className="text-[10px] text-slate-500">{config.timezone}</div>
              </div>
            </div>

            {/* Min relevance */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Min Relevance Score</span>
                <span className="text-orange-400 font-mono">{config.minRelevanceScore}%</span>
              </label>
              <input
                type="range" min={30} max={95} step={5}
                value={config.minRelevanceScore}
                onChange={e => updateConfig({ minRelevanceScore: Number(e.target.value) })}
                className="w-full accent-orange-500"
              />
            </div>

            {/* High risk only */}
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-orange-800/50 bg-orange-950/20 p-3">
              <input
                type="checkbox"
                checked={config.includeHighRiskOnly}
                onChange={e => updateConfig({ includeHighRiskOnly: e.target.checked })}
                className="h-4 w-4 accent-orange-500"
              />
              <div>
                <div className="text-xs font-medium text-white">High-Risk Events Only</div>
                <div className="text-[10px] text-slate-500">Only include events with High risk impact</div>
              </div>
            </label>

            {/* EmailJS status */}
            <div className={cn(
              'rounded-lg border p-3',
              isEmailConfigured
                ? 'border-emerald-900/50 bg-emerald-950/20'
                : 'border-amber-900/50 bg-amber-950/20'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Mail size={12} className={isEmailConfigured ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-[11px] font-semibold text-white">
                  EmailJS {isEmailConfigured ? '✓ Configured' : '⚠ Not Configured'}
                </span>
              </div>
              {!isEmailConfigured && (
                <p className="text-[10px] text-amber-400/80">
                  Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY to your .env file.
                </p>
              )}
              {lastSent && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Last sent: {new Date(lastSent).toLocaleString()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => runScrape()}
                disabled={scraping}
                className="flex items-center justify-center gap-2 rounded-lg border border-orange-800/50 bg-orange-950/20 px-3 py-2.5 text-xs font-semibold text-white hover:bg-orange-900/30 transition-colors cursor-pointer disabled:opacity-50"
              >
                {scraping ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {scraping ? 'Scraping…' : 'Scrape Now'}
              </button>
              <button
                onClick={() => sendDigest('manual')}
                disabled={sending || !config.recipientEmail}
                className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-orange-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {sending ? 'Sending…' : 'Send Now'}
              </button>
            </div>

            {scrapeStatus === 'done' && (
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/40 px-3 py-2 text-[11px] text-emerald-400">
                ✓ Scraped {events.length} events from {scrapeSource}
              </div>
            )}
            {scrapeStatus === 'error' && (
              <div className="rounded-lg bg-red-950/30 border border-red-900/40 px-3 py-2 text-[11px] text-red-400">
                ✗ Scrape failed — check console for details
              </div>
            )}
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === 'logs' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail size={24} className="text-slate-700 mb-3" />
                <p className="text-sm text-slate-600">No emails sent yet</p>
                <p className="text-[10px] text-slate-700 mt-1">Click "Send Now" to trigger a manual digest</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={cn(
                  'rounded-lg border p-3',
                  log.status === 'sent'   ? 'border-emerald-900/40 bg-emerald-950/20' :
                  log.status === 'failed' ? 'border-red-900/40 bg-red-950/20' :
                  'border-orange-800/50 bg-orange-950/20'
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                      log.status === 'sent'   ? 'bg-emerald-500/20 text-emerald-400' :
                      log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-600/20 text-slate-400'
                    )}>
                      {log.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {log.trigger === 'scheduled' ? '⏰ Scheduled' : '👤 Manual'}
                    </span>
                  </div>
                  <div className="text-[11px] text-white font-medium">{log.recipient}</div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span>{log.eventCount} events</span>
                    <span>·</span>
                    <span className="text-red-400">{log.highRiskCount} high risk</span>
                    <span>·</span>
                    <span>{new Date(log.sentAt).toLocaleString()}</span>
                  </div>
                  {log.error && (
                    <div className="mt-1.5 text-[10px] text-red-400 bg-red-950/20 rounded px-2 py-1">{log.error}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {tab === 'preview' && (
          <div className="space-y-3">
            <div className="text-[10px] text-slate-500 mb-2">
              Preview of what will be sent based on currently scraped events
            </div>
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Zap size={20} className="text-slate-700 mb-2" />
                <p className="text-xs text-slate-600">No events scraped yet</p>
                <button
                  onClick={() => runScrape()}
                  className="mt-3 text-[10px] text-orange-400 hover:text-orange-300 cursor-pointer"
                >
                  Click "Scrape Now" in Config tab
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Total Events', val: events.length, color: 'text-orange-400' },
                    { label: 'High Risk', val: events.filter(e => e.riskImpact === 'high').length, color: 'text-orange-400' },
                    { label: 'Negative', val: events.filter(e => e.sentiment === 'negative').length, color: 'text-amber-400' },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-orange-800/50 bg-orange-950/20 p-2 text-center">
                      <div className={cn('text-lg font-bold font-mono', s.color)}>{s.val}</div>
                      <div className="text-[9px] text-slate-600 uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>
                {events.slice(0, 5).map(e => (
                  <div key={e.id} className="rounded-lg border border-orange-800/50 bg-orange-950/20 p-3">
                    <div className="flex items-start gap-2 mb-1">
                      {sentimentIcon(e.sentiment)}
                      <p className="text-[11px] font-medium text-white leading-tight">{e.title}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed pl-5">{e.aiSummary}</p>
                    <div className="flex flex-wrap gap-1 mt-2 pl-5">
                      {e.entities.tickers.slice(0, 3).map(t => (
                        <span key={t} className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-mono text-orange-400">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({
  event,
  selected,
  onClick,
}: {
  event: ScrapedEvent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-lg border-l-4 border border-slate-800 p-3 transition-all cursor-pointer',
        riskColors[event.riskImpact],
        selected ? 'border-orange-700 border-l-orange-500' : 'hover:border-slate-700'
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
            {event.riskImpact === 'high' && (
              <span className="rounded-full bg-orange-500/20 text-orange-400 border border-orange-900/30 px-2 py-0.5 text-[9px] font-bold uppercase">
                HIGH RISK
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-200 leading-snug mb-1">{event.title}</p>
          <div className="flex items-center gap-2 text-[9px] text-slate-600 flex-wrap">
            <span className="text-slate-500">{event.source}</span>
            <span>·</span>
            <span>{new Date(event.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>·</span>
            <span className={cn('font-semibold',
              event.relevanceScore >= 80 ? 'text-orange-400' :
              event.relevanceScore >= 65 ? 'text-amber-400' : 'text-slate-400'
            )}>
              REL {event.relevanceScore}%
            </span>
            {event.entities.tickers.slice(0, 2).map(t => (
              <span key={t} className="rounded bg-slate-800 px-1 font-mono text-orange-400">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Event Detail Panel ────────────────────────────────────────────────────────

function EventDetail({ event }: { event: ScrapedEvent }) {
  const steps = [
    { step: 'RSS Ingested',      done: true },
    { step: 'NLP Extraction',    done: true },
    { step: 'Classified',        done: true },
    { step: 'Relevance Scored',  done: true },
    { step: 'AI Summarized',     done: !!event.aiSummary },
    { step: 'Risk Assessed',     done: true },
    { step: 'Digest Queued',     done: event.processed },
  ];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase', categoryColors[event.category])}>
                {event.category}
              </span>
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase',
                event.riskImpact === 'high'   ? 'bg-orange-500/15 text-orange-400 border-orange-900/40' :
                event.riskImpact === 'medium' ? 'bg-amber-500/15 text-amber-400 border-amber-900/40' :
                'bg-emerald-500/15 text-emerald-400 border-emerald-900/40'
              )}>
                {event.riskImpact} risk
              </span>
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase',
                event.sentiment === 'positive' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-900/40' :
                event.sentiment === 'negative' ? 'bg-orange-500/15 text-orange-400 border-orange-900/40' :
                'bg-slate-700/50 text-slate-400 border-slate-700'
              )}>
                {event.sentiment}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug mb-2">{event.title}</h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>{event.source}</span>
              <span>·</span>
              <span>{new Date(event.publishedAt).toLocaleString()}</span>
              {event.url !== '#' && (
                <>
                  <span>·</span>
                  <a href={event.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-orange-400 hover:text-orange-300">
                    Read full article <ExternalLink size={10} />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Relevance', val: `${event.relevanceScore}%`, color: event.relevanceScore >= 80 ? 'text-orange-400' : 'text-amber-400', pct: event.relevanceScore, barColor: event.relevanceScore >= 80 ? 'bg-orange-500' : 'bg-amber-500' },
            { label: 'Sentiment', val: `${(event.sentimentScore * 100).toFixed(0)}%`, color: event.sentiment === 'negative' ? 'text-orange-400' : event.sentiment === 'positive' ? 'text-emerald-400' : 'text-slate-400', pct: Math.abs(event.sentimentScore) * 100, barColor: event.sentiment === 'negative' ? 'bg-orange-500' : 'bg-emerald-500' },
            { label: 'Novelty', val: `${event.novelty}%`, color: 'text-purple-400', pct: event.novelty, barColor: 'bg-purple-500' },
            { label: 'Risk Impact', val: event.riskImpact.toUpperCase(), color: event.riskImpact === 'high' ? 'text-orange-400' : event.riskImpact === 'medium' ? 'text-amber-400' : 'text-emerald-400', pct: event.riskImpact === 'high' ? 90 : event.riskImpact === 'medium' ? 55 : 20, barColor: event.riskImpact === 'high' ? 'bg-orange-500' : 'bg-amber-500' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] text-slate-500 uppercase">{s.label}</div>
              <div className={cn('text-lg font-bold font-mono mt-1', s.color)}>{s.val}</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800">
                <div className={cn('h-full rounded-full', s.barColor)} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Sectors */}
        <div className="mt-4 flex flex-wrap gap-2">
          {event.sectors.map(s => (
            <span key={s} className="rounded-lg bg-orange-950/20 border border-orange-800/50 px-2.5 py-1 text-[11px] text-orange-300">{s}</span>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {event.aiSummary && (
        <div className="rounded-xl border border-orange-900/40 bg-orange-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={14} className="text-orange-400" />
            <h4 className="text-sm font-semibold text-orange-300">NARRA AI Analysis</h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{event.aiSummary}</p>
        </div>
      )}

      {/* Pipeline */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h4 className="text-sm font-semibold text-white mb-4">Processing Pipeline</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                s.done ? 'border-emerald-700 bg-emerald-500/15' : 'border-slate-700 bg-slate-800'
              )}>
                {s.done ? <CheckCircle size={13} className="text-emerald-400" /> : <Clock size={13} className="text-slate-500" />}
              </div>
              <div className="text-[9px] text-slate-400">{s.step}</div>
              {i < steps.length - 1 && <ArrowRight size={9} className="text-slate-700 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Entity Extraction */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h4 className="text-sm font-semibold text-white mb-3">NLP Entity Extraction</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { type: 'Tickers', items: event.entities.tickers, color: 'text-orange-400 bg-orange-500/10 border-orange-900/30' },
            { type: 'Organizations', items: event.entities.orgs, color: 'text-amber-400 bg-amber-500/10 border-amber-900/30' },
            { type: 'Geographies', items: event.entities.geos, color: 'text-purple-400 bg-purple-500/10 border-purple-900/30' },
            { type: 'Instruments', items: event.entities.instruments, color: 'text-green-400 bg-green-500/10 border-green-900/30' },
          ].map(group => (
            <div key={group.type} className="rounded-lg border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{group.type}</div>
              {group.items.length === 0 ? (
                <span className="text-[10px] text-slate-700">None detected</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {group.items.map(e => (
                    <span key={e} className={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium', group.color)}>{e}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Relevance formula */}
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
        <h4 className="text-sm font-semibold text-white mb-3">Relevance Score Decomposition</h4>
        <div className="font-mono text-xs text-slate-400 bg-orange-950/20 rounded-lg p-3 mb-4 border border-orange-800/50">
          Score = Sector Similarity × Novelty × |Sentiment Magnitude|
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sector Similarity', val: Math.min(0.99, (event.entities.tickers.length * 0.3 + event.entities.orgs.length * 0.15 + 0.4)), color: 'bg-orange-500 text-orange-400' },
            { label: 'Novelty Factor',    val: event.novelty / 100, color: 'bg-purple-500 text-purple-400' },
            { label: 'Sentiment Mag.',    val: Math.min(1, Math.abs(event.sentimentScore) * 2 + 0.3), color: 'bg-orange-500 text-orange-400' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className={cn('h-full rounded-full', s.color.split(' ')[0])} style={{ width: `${s.val * 100}%` }} />
              </div>
              <div className={cn('text-[10px] font-mono mt-1', s.color.split(' ')[1])}>{s.val.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function EventFeedPage() {
  const digest = useDailyDigest();
  const { events: scrapedEvents, scraping, runScrape, scrapeStatus } = digest;

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [searchQuery,    setSearchQuery]     = useState('');
  const [sortBy,         setSortBy]         = useState<'relevance' | 'time' | 'risk'>('relevance');
  const [showDigest,     setShowDigest]     = useState(true);

  // Initial scrape on mount
  useEffect(() => {
    runScrape();
    // Re-scrape every 10 minutes
    const id = setInterval(runScrape, 10 * 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = scrapedEvents.filter(e => {
    const matchCat    = selectedFilter === 'all' || e.category === selectedFilter;
    const matchSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'relevance') return b.relevanceScore - a.relevanceScore;
    if (sortBy === 'time')      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (sortBy === 'risk') {
      const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return rank[b.riskImpact] - rank[a.riskImpact];
    }
    return 0;
  });

  const selectedEvent = scrapedEvents.find(e => e.id === selectedId);
  const highRisk   = scrapedEvents.filter(e => e.riskImpact === 'high').length;
  const negCount   = scrapedEvents.filter(e => e.sentiment === 'negative').length;
  const posCount   = scrapedEvents.filter(e => e.sentiment === 'positive').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Event Intelligence Layer</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live web scraping from Reuters, MarketWatch, CNBC, Bloomberg + AI summarization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scraping ? (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-400">
              <Loader2 size={12} className="animate-spin" />
              Scraping web…
            </div>
          ) : scrapeStatus === 'done' ? (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              {scrapedEvents.length} events loaded
            </div>
          ) : null}
          <button
            onClick={() => runScrape()}
            disabled={scraping}
            className="flex items-center gap-1.5 rounded-lg border border-orange-800/50 bg-orange-950/20 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-900/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            {scraping ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {scraping ? 'Scraping…' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowDigest(p => !p)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              showDigest
                ? 'border-orange-700/50 bg-orange-950/20 text-orange-400'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white'
            )}
          >
            <Mail size={13} />
            AI Agent
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Total Events', value: scrapedEvents.length, color: 'text-white' },
          { label: 'High Risk',    value: highRisk,             color: 'text-orange-400' },
          { label: 'Bearish',      value: negCount,             color: 'text-orange-400' },
          { label: 'Bullish',      value: posCount,             color: 'text-emerald-400' },
          { label: 'Avg Relevance',value: scrapedEvents.length > 0 ? Math.round(scrapedEvents.reduce((s, e) => s + e.relevanceScore, 0) / scrapedEvents.length) + '%' : '—', color: 'text-amber-400' },
          { label: 'Sources',      value: new Set(scrapedEvents.map(e => e.source)).size, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            <div className={cn('text-xl font-bold font-mono mt-0.5', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className={cn('grid gap-4', showDigest ? 'grid-cols-12' : 'grid-cols-12')}>

        {/* Event list — left */}
        <div className={cn(showDigest ? 'col-span-3' : 'col-span-4')}>
          {/* Search + filter */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search events…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-black/50 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-700"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-zinc-800 bg-black/50 px-2 py-1 text-[10px] text-slate-400 focus:outline-none cursor-pointer"
              >
                <option value="relevance">By Relevance</option>
                <option value="time">By Time</option>
                <option value="risk">By Risk</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedFilter(cat)}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[9px] font-semibold uppercase transition-colors cursor-pointer',
                    selectedFilter === cat
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-800/50'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full', scraping ? 'bg-orange-400 animate-pulse' : 'bg-orange-500 animate-pulse')} />
                <span className="text-xs font-semibold text-white">Live Feed</span>
              </div>
              <span className="text-[10px] text-slate-500">{filtered.length} events</span>
            </div>

            {scraping && scrapedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={24} className="text-orange-500 animate-spin" />
                <p className="text-xs text-slate-500">Scraping financial news feeds…</p>
                <p className="text-[10px] text-slate-600">Reuters · MarketWatch · CNBC · Bloomberg</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe size={24} className="text-slate-700 mb-2" />
                <p className="text-xs text-slate-600">No events match filter</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {filtered.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    selected={selectedId === event.id}
                    onClick={() => setSelectedId(event.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel — middle */}
        <div className={cn(showDigest ? 'col-span-6' : 'col-span-8')}>
          {selectedEvent ? (
            <EventDetail event={selectedEvent} />
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-black/50 gap-3">
              <Globe size={32} className="text-slate-700" />
              <p className="text-sm text-slate-600">Select an event to view AI analysis</p>
              <p className="text-[10px] text-slate-700">
                {scrapedEvents.length > 0
                  ? `${scrapedEvents.length} events available — click one from the feed`
                  : 'Click "Refresh" to scrape live financial news'}
              </p>
            </div>
          )}
        </div>

        {/* Digest panel — right */}
        {showDigest && (
          <div className="col-span-3">
            <DigestConfigPanel {...digest} />
          </div>
        )}
      </div>
    </div>
  );
}
