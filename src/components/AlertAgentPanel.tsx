/**
 * CLARA — Alert Agent Configuration & Status Panel
 * Embedded inside the Portfolio Risk page.
 */

import { useState } from 'react';
import { cn } from '@/utils/cn';
import {
  Bell, BellOff, Mail, CheckCircle, XCircle, AlertTriangle,
  Zap, Clock, Send, Eye, Trash2,
  ShieldCheck, Activity, Info,
  BellRing,
} from 'lucide-react';
import type { AlertAgentConfig, InAppAlert } from '@/hooks/useAlertAgent';
import type { AlertLog } from '@/services/emailAlertService';

// ── Alert type badge ──────────────────────────────────────────────────────

function AlertTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SELL_TARGET_HIT:   { label: '🎯 Sell Target',   cls: 'bg-amber-500/20 text-amber-300 border-amber-700/40' },
    STOP_LOSS_HIT:     { label: '🛑 Stop Loss',      cls: 'bg-red-500/20 text-red-300 border-red-700/40' },
    TRAILING_STOP_HIT: { label: '⚠️ Trailing Stop', cls: 'bg-orange-500/20 text-orange-300 border-orange-700/40' },
    BULL_TARGET_HIT:   { label: '🚀 Bull Target',    cls: 'bg-orange-500/20 text-orange-300 border-orange-700/40' },
    DAILY_SUMMARY:     { label: '📊 Daily Summary',  cls: 'bg-amber-600/20 text-zinc-300 border-zinc-700/40' },
  };
  const m = map[type] || { label: type, cls: 'bg-zinc-700 text-zinc-400 border-zinc-600' };
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', m.cls)}>
      {m.label}
    </span>
  );
}

// ── Severity indicator ────────────────────────────────────────────────────

function SeverityDot({ severity }: { severity: InAppAlert['severity'] }) {
  const cls = {
    critical: 'bg-red-500',
    warning:  'bg-orange-400',
    success:  'bg-orange-400',
    info:     'bg-zinc-400',
  }[severity];
  return <span className={cn('h-2 w-2 rounded-full shrink-0 animate-pulse', cls)} />;
}

// ── Main Panel ─────────────────────────────────────────────────────────────

interface AlertAgentPanelProps {
  config: AlertAgentConfig;
  updateConfig: (u: Partial<AlertAgentConfig>) => void;
  inAppAlerts: InAppAlert[];
  emailLogs: AlertLog[];
  agentStatus: 'idle' | 'running' | 'paused';
  isEmailConfigured: boolean;
  unacknowledgedCount: number;
  acknowledgeAlert: (id: string) => void;
  clearAllAlerts: () => void;
  testAlert: (symbol: string) => void;
  availableSymbols: string[];
}

export function AlertAgentPanel({
  config,
  updateConfig,
  inAppAlerts,
  emailLogs,
  agentStatus,
  isEmailConfigured,
  unacknowledgedCount,
  acknowledgeAlert,
  clearAllAlerts,
  testAlert,
  availableSymbols,
}: AlertAgentPanelProps) {
  const [testSymbol, setTestSymbol] = useState(availableSymbols[0] || '');
  const [activeTab, setActiveTab] = useState<'alerts' | 'settings' | 'logs'>('alerts');

  const statusColor = {
    running: 'text-orange-400',
    paused:  'text-amber-400',
    idle:    'text-zinc-500',
  }[agentStatus];

  const statusLabel = {
    running: '● Agent Running',
    paused:  '◌ Agent Paused',
    idle:    '○ Agent Idle',
  }[agentStatus];

  return (
    <div className="rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900 to-black overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30">
            <BellRing size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">CLARA Alert Agent</h3>
              {unacknowledgedCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white px-1 animate-bounce">
                  {unacknowledgedCount}
                </span>
              )}
            </div>
            <p className={cn('text-[10px] font-medium', statusColor)}>{statusLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Master toggle */}
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
              config.enabled
                ? 'border-orange-700/50 bg-orange-950/40 text-orange-400 hover:bg-orange-950/60'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            )}
          >
            {config.enabled ? <Bell size={12} /> : <BellOff size={12} />}
            {config.enabled ? 'Monitoring ON' : 'Monitoring OFF'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 px-6 pt-3">
        {([
          { key: 'alerts',   label: 'Live Alerts',  count: inAppAlerts.length },
          { key: 'settings', label: 'Configuration' },
          { key: 'logs',     label: 'Email Logs',   count: emailLogs.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 pb-3 px-4 text-xs font-semibold border-b-2 transition-all',
              activeTab === t.key
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t.label}
            {'count' in t && t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* ── ALERTS TAB ── */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Status banner */}
            {!config.enabled && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
                <BellOff size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-400 mb-1">Monitoring is disabled</div>
                  <div className="text-[11px] text-amber-400/70 leading-relaxed">
                    Enable monitoring and enter your email in the Configuration tab to receive automatic
                    alerts when your stocks hit sell targets or stop losses.
                  </div>
                </div>
              </div>
            )}

            {config.enabled && !config.userEmail && (
              <div className="flex items-start gap-3 rounded-xl border border-orange-800/40 bg-orange-950/20 p-4">
                <Mail size={15} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-orange-400 mb-1">Add your email address</div>
                  <div className="text-[11px] text-orange-400/70">
                    Go to the Configuration tab and enter your email to receive notifications.
                    Monitoring is active but emails are disabled until an address is provided.
                  </div>
                </div>
              </div>
            )}

            {config.enabled && config.userEmail && !isEmailConfigured && (
              <div className="flex items-start gap-3 rounded-xl border border-orange-800/40 bg-orange-950/20 p-4">
                <Info size={15} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-orange-400 mb-1">EmailJS keys not configured</div>
                  <div className="text-[11px] text-orange-400/70 leading-relaxed">
                    In-app alerts are active ✓. To enable email delivery, add your EmailJS keys to the{' '}
                    <code className="bg-zinc-800 px-1 rounded text-orange-300">.env</code> file.
                    See the Configuration tab for setup instructions.
                  </div>
                </div>
              </div>
            )}

            {/* Alert list */}
            {inAppAlerts.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400 font-medium">
                    {unacknowledgedCount > 0
                      ? `${unacknowledgedCount} unacknowledged alert${unacknowledgedCount !== 1 ? 's' : ''}`
                      : 'All alerts acknowledged'}
                  </div>
                  <button
                    onClick={clearAllAlerts}
                    className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={10} /> Clear all
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {inAppAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        'rounded-xl border p-3.5 transition-all',
                        alert.acknowledged
                          ? 'border-zinc-800 bg-black/30 opacity-50'
                          : alert.severity === 'critical'
                          ? 'border-red-800/50 bg-red-950/20'
                          : alert.severity === 'warning'
                          ? 'border-orange-800/40 bg-orange-950/15'
                          : alert.severity === 'success'
                          ? 'border-orange-800/40 bg-orange-950/15'
                          : 'border-zinc-800/30 bg-zinc-950/10'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <SeverityDot severity={alert.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-white font-mono">{alert.symbol}</span>
                            <AlertTypeBadge type={alert.type} />
                            {alert.emailSent && (
                              <span className="flex items-center gap-0.5 text-[9px] text-orange-400">
                                <Mail size={8} /> Emailed
                              </span>
                            )}
                            {!alert.emailSent && config.userEmail && (
                              <span className="flex items-center gap-0.5 text-[9px] text-zinc-500">
                                <Mail size={8} /> In-app only
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-300 leading-relaxed">{alert.message}</p>
                          <div className="flex items-center gap-4 mt-1.5 text-[9px] text-zinc-600">
                            <span>Trigger: <span className="text-zinc-400 font-mono">${alert.triggerPrice.toFixed(2)}</span></span>
                            <span>Price: <span className="text-zinc-400 font-mono">${alert.currentPrice.toFixed(2)}</span></span>
                            <span>{alert.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="shrink-0 rounded-lg border border-zinc-700 hover:border-orange-700 bg-zinc-800 hover:bg-orange-950/30 px-2 py-1 text-[10px] text-zinc-400 hover:text-orange-300 transition-all flex items-center gap-1"
                          >
                            <Eye size={9} /> ACK
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
                  <Bell size={20} className="text-zinc-600" />
                </div>
                <div className="text-sm font-semibold text-zinc-500 mb-1">No alerts yet</div>
                <div className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                  Alerts will appear here when a stock in your portfolio hits a sell target or stop loss.
                </div>
              </div>
            )}

            {/* Test alert */}
            {availableSymbols.length > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black/40 px-4 py-3">
                <Zap size={13} className="text-purple-400 shrink-0" />
                <span className="text-xs text-zinc-400 flex-1">Test alert for:</span>
                <select
                  value={testSymbol}
                  onChange={e => setTestSymbol(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none"
                >
                  {availableSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => testAlert(testSymbol)}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-800/50 bg-purple-950/30 hover:bg-purple-900/40 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all"
                >
                  <Send size={10} /> Send Test
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">

            {/* Email address */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-white mb-3">
                <Mail size={13} className="text-orange-400" />
                Alert Email Address
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={12} className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={config.userEmail}
                    onChange={e => updateConfig({ userEmail: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-8 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 focus:outline-none transition-all"
                  />
                </div>
                {config.userEmail && (
                  <div className="flex items-center gap-1.5 rounded-xl border border-orange-800/40 bg-orange-950/20 px-3 text-xs text-orange-400">
                    <CheckCircle size={12} />
                    Set
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600 leading-relaxed">
                Alerts will be sent to this address when price targets are hit.
                All emails are sent client-side via EmailJS — your address is never stored on a server.
              </p>
            </div>

            {/* Alert types */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-white mb-3">
                <Bell size={13} className="text-purple-400" />
                Alert Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    key: 'alertOnSellTarget',
                    label: '🎯 Sell Target Hit',
                    desc: 'When price ≥ your sell target',
                    color: 'amber',
                  },
                  {
                    key: 'alertOnStopLoss',
                    label: '🛑 Stop Loss Triggered',
                    desc: 'When price ≤ your stop loss',
                    color: 'red',
                  },
                  {
                    key: 'alertOnTrailingStop',
                    label: '⚠️ Trailing Stop Hit',
                    desc: 'When price ≤ trailing stop',
                    color: 'orange',
                  },
                  {
                    key: 'alertOnBullTarget',
                    label: '🚀 Bull Case Target',
                    desc: 'When price ≥ bull case level',
                    color: 'emerald',
                  },
                ].map(opt => {
                  const val = config[opt.key as keyof AlertAgentConfig] as boolean;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => updateConfig({ [opt.key]: !val })}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        val
                          ? 'border-orange-700/40 bg-orange-950/20'
                          : 'border-zinc-800 bg-black/40 opacity-60 hover:opacity-80'
                      )}
                    >
                      <div className={cn(
                        'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                        val ? 'border-orange-500 bg-orange-500' : 'border-zinc-600 bg-transparent'
                      )}>
                        {val && <CheckCircle size={10} className="text-white fill-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">{opt.label}</div>
                        <div className="text-[10px] text-zinc-500">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Check interval */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-white mb-3">
                <Clock size={13} className="text-orange-400" />
                Check Interval
              </label>
              <div className="flex gap-2">
                {[
                  { label: '15s', ms: 15_000 },
                  { label: '30s', ms: 30_000 },
                  { label: '1m',  ms: 60_000 },
                  { label: '5m',  ms: 300_000 },
                ].map(opt => (
                  <button
                    key={opt.ms}
                    onClick={() => updateConfig({ checkIntervalMs: opt.ms })}
                    className={cn(
                      'flex-1 rounded-xl border py-2 text-xs font-bold transition-all',
                      config.checkIntervalMs === opt.ms
                        ? 'border-orange-600 bg-orange-950/30 text-orange-300'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">
                How often the agent checks prices against targets. More frequent = faster alerts, more API calls.
              </p>
            </div>

            {/* EmailJS setup guide */}
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className={isEmailConfigured ? 'text-orange-400' : 'text-zinc-500'} />
                <span className="text-xs font-bold text-white">EmailJS Setup</span>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                  isEmailConfigured
                    ? 'bg-orange-500/20 text-orange-400 border-orange-700/40'
                    : 'bg-zinc-700/50 text-zinc-500 border-zinc-600/50'
                )}>
                  {isEmailConfigured ? '✓ Configured' : 'Not configured'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                CLARA uses <strong className="text-zinc-200">EmailJS</strong> to send emails directly from
                your browser — no server required. To enable email delivery:
              </p>
              <ol className="space-y-1.5 text-[11px] text-zinc-500">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold shrink-0">1.</span>
                  Sign up free at <span className="text-orange-400">emailjs.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold shrink-0">2.</span>
                  Add an Email Service (Gmail, Outlook, etc.) → copy the <strong className="text-zinc-300">Service ID</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold shrink-0">3.</span>
                  Create an Email Template with variables:
                  <code className="bg-zinc-800 rounded px-1 text-purple-300">
                    {'{{to_email}}, {{subject}}, {{alert_type}}, {{symbol}}, {{trigger_price}}, {{current_price}}, {{gain_loss}}, {{action}}'}
                  </code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold shrink-0">4.</span>
                  Go to Account → API Keys → copy your <strong className="text-zinc-300">Public Key</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 font-bold shrink-0">5.</span>
                  Add all three keys to your <code className="bg-zinc-800 rounded px-1 text-purple-300">.env</code> file:
                </li>
              </ol>
              <div className="rounded-lg bg-black border border-zinc-800 p-3 font-mono text-[10px] text-purple-300 space-y-1">
                <div><span className="text-zinc-500"># .env</span></div>
                <div>VITE_EMAILJS_SERVICE_ID=<span className="text-amber-400">your_service_id</span></div>
                <div>VITE_EMAILJS_TEMPLATE_ID=<span className="text-amber-400">your_template_id</span></div>
                <div>VITE_EMAILJS_PUBLIC_KEY=<span className="text-amber-400">your_public_key</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-400">
                {emailLogs.length} email attempt{emailLogs.length !== 1 ? 's' : ''} logged
              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> Sent successfully
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
                </span>
              </div>
            </div>

            {emailLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity size={24} className="text-zinc-600 mb-3" />
                <div className="text-sm text-zinc-500 font-medium mb-1">No email logs yet</div>
                <div className="text-xs text-zinc-600">
                  Email attempts will be recorded here once alerts are triggered.
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {emailLogs.map(log => (
                  <div
                    key={log.id}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3',
                      log.sent
                        ? 'border-orange-800/30 bg-orange-950/10'
                        : 'border-red-800/30 bg-red-950/10'
                    )}
                  >
                    {log.sent
                      ? <CheckCircle size={13} className="text-orange-400 shrink-0 mt-0.5" />
                      : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-white font-mono">{log.symbol}</span>
                        <AlertTypeBadge type={log.type} />
                        <span className={cn('text-[10px] font-bold', log.sent ? 'text-orange-400' : 'text-red-400')}>
                          {log.sent ? '✓ Sent' : '✗ Failed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                        <span>→ {log.emailAddress}</span>
                        <span>Trigger: <span className="font-mono text-zinc-400">${log.triggerPrice.toFixed(2)}</span></span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.errorMessage && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-400 bg-red-950/20 rounded-lg px-2 py-1">
                          <AlertTriangle size={9} className="shrink-0 mt-0.5" />
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
