/**
 * CLARA — Settings Modal
 * System configuration: API keys, thresholds, display, notifications.
 */
import { useState } from 'react';
import { cn } from '@/utils/cn';
import {
  X, Settings, Key, Bell, Shield, Monitor, Sliders,
  Eye, EyeOff, CheckCircle, Save, RefreshCw, AlertTriangle,
  Database, Cpu, Globe,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

interface ApiKey {
  id: string;
  label: string;
  envVar: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  docsUrl: string;
}

const DEFAULT_API_KEYS: ApiKey[] = [
  {
    id: 'av', label: 'Alpha Vantage', envVar: 'VITE_ALPHA_VANTAGE_API_KEY',
    value: localStorage.getItem('CLARA_av_key') || '',
    hint: 'Free tier: 25 requests/day. Used for live stock quotes.',
    icon: Database, docsUrl: 'https://www.alphavantage.co/support/#api-key',
  },
  {
    id: 'td', label: 'Twelve Data', envVar: 'VITE_TWELVEDATA_API_KEY',
    value: localStorage.getItem('CLARA_td_key') || '',
    hint: 'Free tier: 800 requests/day. Backup price source.',
    icon: Globe, docsUrl: 'https://twelvedata.com/pricing',
  },
  {
    id: 'fh', label: 'Finnhub', envVar: 'VITE_FINNHUB_API_KEY',
    value: localStorage.getItem('CLARA_fh_key') || '',
    hint: 'Free tier: 60 req/min. Real-time quotes and news.',
    icon: Globe, docsUrl: 'https://finnhub.io/dashboard',
  },
  {
    id: 'news', label: 'NewsAPI', envVar: 'VITE_NEWSAPI_KEY',
    value: localStorage.getItem('CLARA_news_key') || '',
    hint: 'Free tier: 100 requests/day. News feed and sentiment.',
    icon: Globe, docsUrl: 'https://newsapi.org/register',
  },
  {
    id: 'ejs_svc', label: 'EmailJS Service ID', envVar: 'VITE_EMAILJS_SERVICE_ID',
    value: localStorage.getItem('CLARA_ejs_svc') || '',
    hint: 'Your EmailJS email service identifier.',
    icon: Cpu, docsUrl: 'https://www.emailjs.com/docs/',
  },
  {
    id: 'ejs_tpl', label: 'EmailJS Template ID', envVar: 'VITE_EMAILJS_TEMPLATE_ID',
    value: localStorage.getItem('CLARA_ejs_tpl') || '',
    hint: 'Your EmailJS email template identifier.',
    icon: Cpu, docsUrl: 'https://www.emailjs.com/docs/',
  },
  {
    id: 'ejs_pub', label: 'EmailJS Public Key', envVar: 'VITE_EMAILJS_PUBLIC_KEY',
    value: localStorage.getItem('CLARA_ejs_pub') || '',
    hint: 'Your EmailJS account public key.',
    icon: Cpu, docsUrl: 'https://www.emailjs.com/docs/',
  },
];

type SettingsTab = 'api' | 'thresholds' | 'display' | 'alerts' | 'model';

const TABS: { key: SettingsTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'api',        label: 'API Keys',      icon: Key     },
  { key: 'thresholds', label: 'Risk Limits',   icon: Sliders },
  { key: 'display',    label: 'Display',       icon: Monitor },
  { key: 'alerts',     label: 'Notifications', icon: Bell    },
  { key: 'model',      label: 'Model Config',  icon: Shield  },
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(DEFAULT_API_KEYS);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  // Risk limit state
  const [limits, setLimits] = useState({
    var95: localStorage.getItem('CLARA_lim_var95') || '25',
    var99: localStorage.getItem('CLARA_lim_var99') || '65',
    es:    localStorage.getItem('CLARA_lim_es')    || '40',
    tail:  localStorage.getItem('CLARA_lim_tail')  || '5',
  });

  // Display state
  const [display, setDisplay] = useState({
    theme:       localStorage.getItem('CLARA_theme')   || 'dark',
    mcPaths:     localStorage.getItem('CLARA_mc')      || '100000',
    refreshRate: localStorage.getItem('CLARA_refresh') || '30',
    compactMode: localStorage.getItem('CLARA_compact') === 'true',
  });

  // Alert prefs
  const [alertPrefs, setAlertPrefs] = useState({
    emailOnBreach: localStorage.getItem('CLARA_alert_breach') !== 'false',
    emailOnCycle:  localStorage.getItem('CLARA_alert_cycle')  === 'true',
    emailOnRegime: localStorage.getItem('CLARA_alert_regime') === 'true',
    slackWebhook:  localStorage.getItem('CLARA_slack')        || '',
  });

  // Model config
  const [modelConf, setModelConf] = useState({
    confidenceThreshold: localStorage.getItem('CLARA_conf_thresh') || '50',
    analogCount:         localStorage.getItem('CLARA_analog_n')    || '5',
    regimeEnsemble:      localStorage.getItem('CLARA_ensemble')    !== 'false',
    safeMode:            localStorage.getItem('CLARA_safe_mode')   !== 'false',
  });

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function updateApiKey(id: string, value: string) {
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, value } : k));
  }

  function saveAll() {
    // Save API keys
    const storageMap: Record<string, string> = {
      av: 'CLARA_av_key', td: 'CLARA_td_key', fh: 'CLARA_fh_key',
      news: 'CLARA_news_key', ejs_svc: 'CLARA_ejs_svc', ejs_tpl: 'CLARA_ejs_tpl', ejs_pub: 'CLARA_ejs_pub',
    };
    apiKeys.forEach(k => { if (k.value) localStorage.setItem(storageMap[k.id], k.value); });

    // Save limits
    localStorage.setItem('CLARA_lim_var95', limits.var95);
    localStorage.setItem('CLARA_lim_var99', limits.var99);
    localStorage.setItem('CLARA_lim_es',    limits.es);
    localStorage.setItem('CLARA_lim_tail',  limits.tail);

    // Save display
    localStorage.setItem('CLARA_theme',   display.theme);
    localStorage.setItem('CLARA_mc',      display.mcPaths);
    localStorage.setItem('CLARA_refresh', display.refreshRate);
    localStorage.setItem('CLARA_compact', String(display.compactMode));

    // Save alert prefs
    localStorage.setItem('CLARA_alert_breach', String(alertPrefs.emailOnBreach));
    localStorage.setItem('CLARA_alert_cycle',  String(alertPrefs.emailOnCycle));
    localStorage.setItem('CLARA_alert_regime', String(alertPrefs.emailOnRegime));
    localStorage.setItem('CLARA_slack',         alertPrefs.slackWebhook);

    // Save model config
    localStorage.setItem('CLARA_conf_thresh', modelConf.confidenceThreshold);
    localStorage.setItem('CLARA_analog_n',    modelConf.analogCount);
    localStorage.setItem('CLARA_ensemble',    String(modelConf.regimeEnsemble));
    localStorage.setItem('CLARA_safe_mode',   String(modelConf.safeMode));

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[720px] max-h-[85vh] rounded-2xl border border-zinc-700 bg-black shadow-2xl shadow-black/60 flex flex-col overflow-hidden">

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-orange-500 to-orange-800 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700">
              <Settings size={16} className="text-zinc-300" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">CLARA System Settings</div>
              <div className="text-[10px] text-zinc-500">API keys, risk limits, display preferences, model configuration</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left nav */}
          <div className="w-44 border-r border-zinc-800 p-3 space-y-1 shrink-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all text-left',
                  activeTab === t.key
                    ? 'bg-orange-950/40 border border-orange-800/40 text-orange-300'
                    : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
                )}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* ── API KEYS ── */}
            {activeTab === 'api' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-900/40 bg-zinc-950/15 px-4 py-3 flex items-start gap-3">
                  <Key size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                  <div className="text-[11px] text-zinc-300 leading-relaxed">
                    Keys saved here are stored in your browser's <strong>localStorage</strong> and used at runtime.
                    For production, add them to your <code className="bg-zinc-800 rounded px-1">.env</code> file instead.
                  </div>
                </div>
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key.id} className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <key.icon size={13} className="text-zinc-500" />
                          <span className="text-xs font-bold text-white">{key.label}</span>
                          <code className="text-[10px] text-purple-400 bg-zinc-800 rounded px-1.5 py-0.5">{key.envVar}</code>
                        </div>
                        {key.value && <CheckCircle size={13} className="text-orange-400" />}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={revealed.has(key.id) ? 'text' : 'password'}
                            value={key.value}
                            onChange={e => updateApiKey(key.id, e.target.value)}
                            placeholder={`Enter ${key.label} key…`}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 pr-9 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:border-orange-600 focus:outline-none transition-colors"
                          />
                          <button
                            onClick={() => toggleReveal(key.id)}
                            className="absolute right-2.5 top-1/2 -tranzinc-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            {revealed.has(key.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-zinc-600">{key.hint}</p>
                        <a href={key.docsUrl} target="_blank" rel="noreferrer" className="text-[10px] text-orange-600 hover:text-orange-400 transition-colors">
                          Get key →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── RISK LIMITS ── */}
            {activeTab === 'thresholds' && (
              <div className="space-y-4">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Configure breach thresholds. When simulated risk metrics exceed these limits, CLARA fires alerts
                  and triggers escalation workflows.
                </p>
                {[
                  { key: 'var95', label: '1-Day VaR 95% Limit', unit: '$M', min: 1, max: 200 },
                  { key: 'var99', label: '10-Day VaR 99% Limit', unit: '$M', min: 1, max: 500 },
                  { key: 'es',    label: 'Expected Shortfall Limit', unit: '$M', min: 1, max: 500 },
                  { key: 'tail',  label: 'Tail Loss Probability Limit', unit: '%', min: 1, max: 25 },
                ].map(lim => (
                  <div key={lim.key} className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-white">{lim.label}</label>
                      <span className="text-sm font-mono font-bold text-amber-400">
                        {lim.unit === '$M' ? `$${limits[lim.key as keyof typeof limits]}M` : `${limits[lim.key as keyof typeof limits]}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={lim.min} max={lim.max}
                      value={limits[lim.key as keyof typeof limits]}
                      onChange={e => setLimits(prev => ({ ...prev, [lim.key]: e.target.value }))}
                      className="w-full accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                      <span>{lim.unit === '$M' ? `$${lim.min}M` : `${lim.min}%`}</span>
                      <span>{lim.unit === '$M' ? `$${lim.max}M` : `${lim.max}%`}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 rounded-xl border border-amber-900/30 bg-amber-950/10 p-3">
                  <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">
                    Limit changes take effect on the next cycle run. Historical breach records are not retroactively updated.
                  </p>
                </div>
              </div>
            )}

            {/* ── DISPLAY ── */}
            {activeTab === 'display' && (
              <div className="space-y-4">
                {/* MC Paths */}
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-white">Monte Carlo Paths</label>
                    <span className="text-sm font-mono font-bold text-orange-400">{Number(display.mcPaths).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    {['10000','50000','100000','500000'].map(v => (
                      <button
                        key={v}
                        onClick={() => setDisplay(p => ({ ...p, mcPaths: v }))}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-[11px] font-bold transition-all',
                          display.mcPaths === v
                            ? 'border-orange-600 bg-orange-950/30 text-orange-300'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'
                        )}
                      >
                        {Number(v).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Refresh Rate */}
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-white">Price Refresh Rate</label>
                    <span className="text-sm font-mono font-bold text-orange-400">{display.refreshRate}s</span>
                  </div>
                  <div className="flex gap-2">
                    {['15','30','60','300'].map(v => (
                      <button
                        key={v}
                        onClick={() => setDisplay(p => ({ ...p, refreshRate: v }))}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-[11px] font-bold transition-all',
                          display.refreshRate === v
                            ? 'border-orange-600 bg-orange-950/30 text-orange-300'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'
                        )}
                      >
                        {v === '300' ? '5m' : `${v}s`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compact Mode */}
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Compact Mode</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Reduce padding and font sizes for more data density</div>
                  </div>
                  <button
                    onClick={() => setDisplay(p => ({ ...p, compactMode: !p.compactMode }))}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      display.compactMode ? 'bg-orange-600' : 'bg-zinc-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                      display.compactMode ? 'tranzinc-x-5' : 'tranzinc-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {[
                  { key: 'emailOnBreach', label: 'Email on Limit Breach', desc: 'Send email when VaR/ES limits are exceeded' },
                  { key: 'emailOnCycle',  label: 'Email on Cycle Complete', desc: 'Summary email after each CLARA cycle' },
                  { key: 'emailOnRegime', label: 'Email on Regime Change', desc: 'Alert when market regime transitions' },
                ].map(pref => (
                  <div key={pref.key} className="rounded-xl border border-zinc-800 bg-black/50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{pref.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{pref.desc}</div>
                    </div>
                    <button
                      onClick={() => setAlertPrefs(p => ({ ...p, [pref.key]: !p[pref.key as keyof typeof alertPrefs] }))}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        alertPrefs[pref.key as keyof typeof alertPrefs] ? 'bg-orange-600' : 'bg-zinc-700'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        alertPrefs[pref.key as keyof typeof alertPrefs] ? 'tranzinc-x-5' : 'tranzinc-x-0.5'
                      )} />
                    </button>
                  </div>
                ))}

                {/* Slack Webhook */}
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                  <label className="text-xs font-bold text-white mb-2 block">Slack Webhook URL</label>
                  <input
                    type="text"
                    value={alertPrefs.slackWebhook}
                    onChange={e => setAlertPrefs(p => ({ ...p, slackWebhook: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:border-orange-600 focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-600 mt-2">Optional. Sends breach and cycle alerts to your Slack channel.</p>
                </div>
              </div>
            )}

            {/* ── MODEL CONFIG ── */}
            {activeTab === 'model' && (
              <div className="space-y-4">
                {/* Confidence Threshold */}
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-white">Confidence Threshold (Safe Mode trigger)</label>
                    <span className="text-sm font-mono font-bold text-purple-400">{modelConf.confidenceThreshold}%</span>
                  </div>
                  <input
                    type="range" min={20} max={90}
                    value={modelConf.confidenceThreshold}
                    onChange={e => setModelConf(p => ({ ...p, confidenceThreshold: e.target.value }))}
                    className="w-full accent-purple-500"
                  />
                  <p className="text-[10px] text-zinc-600 mt-2">
                    If model confidence drops below this, CLARA enters Safe Mode and freezes hedge suggestions.
                  </p>
                </div>

                {/* Analog Count */}
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-white">Historical Analog Count (Top N)</label>
                    <span className="text-sm font-mono font-bold text-purple-400">Top {modelConf.analogCount}</span>
                  </div>
                  <div className="flex gap-2">
                    {['3','5','10','15'].map(v => (
                      <button
                        key={v}
                        onClick={() => setModelConf(p => ({ ...p, analogCount: v }))}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-[11px] font-bold transition-all',
                          modelConf.analogCount === v
                            ? 'border-purple-600 bg-purple-950/30 text-purple-300'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600'
                        )}
                      >
                        Top {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                {[
                  { key: 'regimeEnsemble', label: 'Regime Ensemble Model', desc: 'Use ensemble of 3 regime classifiers to reduce misclassification risk' },
                  { key: 'safeMode',       label: 'Safe Mode Enabled',     desc: 'Freeze hedge suggestions when model confidence is below threshold' },
                ].map(opt => (
                  <div key={opt.key} className="rounded-xl border border-zinc-800 bg-black/50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                    </div>
                    <button
                      onClick={() => setModelConf(p => ({ ...p, [opt.key]: !p[opt.key as keyof typeof modelConf] }))}
                      className={cn(
                        'relative h-6 w-11 rounded-full transition-colors',
                        modelConf[opt.key as keyof typeof modelConf] ? 'bg-purple-600' : 'bg-zinc-700'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        modelConf[opt.key as keyof typeof modelConf] ? 'tranzinc-x-5' : 'tranzinc-x-0.5'
                      )} />
                    </button>
                  </div>
                ))}

                <div className="rounded-xl border border-zinc-800 bg-black/30 p-4 space-y-2">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Current Model Info</div>
                  {[
                    { label: 'LLM', value: 'IBM Granite 13B Instruct' },
                    { label: 'Embedding Store', value: 'Custom FAISS Index' },
                    { label: 'Regime Classifier', value: 'Ensemble (RF + XGB + MLP)' },
                    { label: 'MC Engine', value: 'Numba-accelerated (CPU)' },
                    { label: 'Governance', value: 'IBM OpenScale + Watson Audit' },
                    { label: 'Version', value: 'CLARA v2.4.1' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-[11px] border-b border-zinc-800/50 pb-1.5">
                      <span className="text-zinc-500">{r.label}</span>
                      <span className="text-zinc-300 font-mono">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 shrink-0 bg-black">
          <button
            onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            <RefreshCw size={12} /> Reset all defaults
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={saveAll}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-5 py-2 text-xs font-bold transition-all',
                saved
                  ? 'border-orange-700 bg-orange-950/40 text-orange-300'
                  : 'border-orange-700 bg-orange-950/40 hover:bg-orange-900/50 text-orange-300'
              )}
            >
              {saved ? <><CheckCircle size={12} /> Saved!</> : <><Save size={12} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
