import { useState } from 'react';
import { cn } from '@/utils/cn';
import {
  Key, CheckCircle2, XCircle, AlertTriangle, ExternalLink,
  Eye, EyeOff, RefreshCw, Activity, Shield, Zap, Info,
} from 'lucide-react';
import { isAlphaVantageConfigured, getAVRateStatus } from '@/services/alphaVantageService';

// ── Runtime key overrides stored in localStorage ──────────────────────────────
// This lets users paste their keys in the UI without touching .env.
const LS_PREFIX = 'CLARA_api_key_';

export function getRuntimeKey(name: string): string {
  return localStorage.getItem(LS_PREFIX + name) || '';
}

function setRuntimeKey(name: string, value: string): void {
  if (value.trim()) {
    localStorage.setItem(LS_PREFIX + name, value.trim());
  } else {
    localStorage.removeItem(LS_PREFIX + name);
  }
}

// ── API Definition ─────────────────────────────────────────────────────────────
interface ApiDef {
  id: string;
  name: string;
  envKey: string;
  envValue: string;
  url: string;
  docsUrl: string;
  registerUrl: string;
  description: string;
  freeTier: string;
  priority: number;
  color: string;
  usedFor: string[];
  testEndpoint?: string;
}

const APIS: ApiDef[] = [
  {
    id: 'alpha_vantage',
    name: 'Alpha Vantage',
    envKey: 'VITE_ALPHA_VANTAGE_API_KEY',
    envValue: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '',
    url: 'https://www.alphavantage.co',
    docsUrl: 'https://www.alphavantage.co/documentation/',
    registerUrl: 'https://www.alphavantage.co/support/#api-key',
    description: 'Premium stock quotes, technical indicators, MACD, RSI, intraday OHLCV, company fundamentals, and news sentiment.',
    freeTier: '25 req/day · 25 req/min',
    priority: 2,
    color: 'cyan',
    usedFor: ['Real-time quotes', 'Daily OHLCV history', 'Intraday charts', 'RSI/MACD indicators', 'News sentiment', 'Company overview'],
    testEndpoint: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL',
  },
  {
    id: 'twelve_data',
    name: 'Twelve Data',
    envKey: 'VITE_TWELVEDATA_API_KEY',
    envValue: import.meta.env.VITE_TWELVEDATA_API_KEY || '',
    url: 'https://twelvedata.com',
    docsUrl: 'https://twelvedata.com/docs',
    registerUrl: 'https://twelvedata.com/pricing',
    description: 'Real-time and historical data for stocks, forex, ETFs, and indices. High request limits on free tier.',
    freeTier: '800 req/day · 8 req/min',
    priority: 3,
    color: 'violet',
    usedFor: ['Fallback stock quotes', 'Batch symbol quotes', 'ETF data'],
    testEndpoint: 'https://api.twelvedata.com/quote?symbol=AAPL',
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    envKey: 'VITE_FINNHUB_API_KEY',
    envValue: import.meta.env.VITE_FINNHUB_API_KEY || '',
    url: 'https://finnhub.io',
    docsUrl: 'https://finnhub.io/docs/api',
    registerUrl: 'https://finnhub.io/register',
    description: 'Real-time quotes, institutional ownership data, earnings calendars, and market news.',
    freeTier: '60 req/min',
    priority: 4,
    color: 'emerald',
    usedFor: ['Tertiary quote fallback', 'Earnings data', 'Market news'],
    testEndpoint: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
  },
  {
    id: 'emailjs_service',
    name: 'EmailJS — Service ID',
    envKey: 'VITE_EMAILJS_SERVICE_ID',
    envValue: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
    url: 'https://emailjs.com',
    docsUrl: 'https://www.emailjs.com/docs/',
    registerUrl: 'https://www.emailjs.com',
    description: 'Email delivery service for AI alert notifications. No backend required — sends directly from the browser.',
    freeTier: '200 emails/month',
    priority: 5,
    color: 'amber',
    usedFor: ['Price target alerts', 'Stop loss notifications', 'AI agent emails'],
  },
  {
    id: 'emailjs_template',
    name: 'EmailJS — Template ID',
    envKey: 'VITE_EMAILJS_TEMPLATE_ID',
    envValue: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
    url: 'https://emailjs.com',
    docsUrl: 'https://www.emailjs.com/docs/tutorial/creating-email-template/',
    registerUrl: 'https://www.emailjs.com',
    description: 'The EmailJS email template ID used for formatting alert messages.',
    freeTier: 'See EmailJS plan',
    priority: 5,
    color: 'amber',
    usedFor: ['Alert email formatting'],
  },
  {
    id: 'emailjs_pubkey',
    name: 'EmailJS — Public Key',
    envKey: 'VITE_EMAILJS_PUBLIC_KEY',
    envValue: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
    url: 'https://emailjs.com',
    docsUrl: 'https://www.emailjs.com/docs/sdk/installation/',
    registerUrl: 'https://dashboard.emailjs.com/admin/account',
    description: 'Your EmailJS account public key. Found in Account → API Keys.',
    freeTier: 'See EmailJS plan',
    priority: 5,
    color: 'amber',
    usedFor: ['EmailJS authentication'],
  },
];

const PLACEHOLDER_VALUES = new Set([
  'your_alpha_vantage_key_here',
  'your_twelvedata_key_here',
  'your_finnhub_key_here',
  'your_service_id_here',
  'your_template_id_here',
  'your_public_key_here',
  'demo',
  '',
]);

function isKeyConfigured(api: ApiDef, runtimeVal: string): boolean {
  const effective = runtimeVal || api.envValue;
  return effective.length > 0 && !PLACEHOLDER_VALUES.has(effective);
}

function getColorClasses(color: string, variant: 'bg' | 'border' | 'text' | 'badge') {
  const map: Record<string, Record<string, string>> = {
    cyan:    { bg: 'bg-orange-950/30',   border: 'border-orange-800/50',   text: 'text-orange-400',    badge: 'bg-orange-500/15 text-orange-300' },
    violet:  { bg: 'bg-violet-950/30', border: 'border-violet-800/50', text: 'text-violet-400',  badge: 'bg-violet-500/15 text-violet-300' },
    emerald: { bg: 'bg-orange-950/30',border: 'border-orange-800/50',text: 'text-orange-400', badge: 'bg-orange-500/15 text-orange-300' },
    amber:   { bg: 'bg-amber-950/30',  border: 'border-amber-800/50',  text: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-300' },
  };
  return map[color]?.[variant] || '';
}

// ── API Card ──────────────────────────────────────────────────────────────────
function ApiCard({ api }: { api: ApiDef }) {
  const [runtimeVal, setRuntimeVal] = useState(() => getRuntimeKey(api.id));
  const [inputVal, setInputVal] = useState('');
  const [showVal, setShowVal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const configured = isKeyConfigured(api, runtimeVal);
  const effectiveVal = runtimeVal || api.envValue;
  const displayVal = showVal
    ? (effectiveVal && !PLACEHOLDER_VALUES.has(effectiveVal) ? effectiveVal : '(not set)')
    : (configured ? '••••••••••••••••' : '(not set)');

  function handleSave() {
    setRuntimeKey(api.id, inputVal);
    setRuntimeVal(inputVal);
    setInputVal('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Reload page so new key takes effect in env-like reads
    // (In a real app, you'd use a context/store; here we just tell the user to refresh)
  }

  async function handleTest() {
    if (!api.testEndpoint) return;
    setTesting(true);
    setTestResult(null);
    const key = runtimeVal || api.envValue;
    const url = `${api.testEndpoint}&apikey=${key}&token=${key}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      const failed = !res.ok || data['Note'] || data['Information'] || data['error'];
      setTestResult(failed ? 'fail' : 'success');
    } catch {
      setTestResult('fail');
    }
    setTesting(false);
  }

  return (
    <div className={cn(
      'rounded-xl border p-5 transition-all',
      getColorClasses(api.color, 'bg'),
      getColorClasses(api.color, 'border'),
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', getColorClasses(api.color, 'badge'))}>
            <Key size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{api.name}</h3>
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase', getColorClasses(api.color, 'badge'))}>
                Priority #{api.priority}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{api.envKey}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {configured ? (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1">
              <CheckCircle2 size={11} className="text-orange-400" />
              <span className="text-[10px] font-semibold text-orange-400">Configured</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1">
              <XCircle size={11} className="text-red-400" />
              <span className="text-[10px] font-semibold text-red-400">Not Set</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{api.description}</p>

      {/* Used For Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {api.usedFor.map(u => (
          <span key={u} className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', getColorClasses(api.color, 'badge'))}>
            {u}
          </span>
        ))}
      </div>

      {/* Current Key Display */}
      <div className="mb-3 rounded-lg border border-zinc-800 bg-black/60 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase text-zinc-600 font-semibold mb-1">Current Key</div>
            <div className="text-xs font-mono text-zinc-300">{displayVal}</div>
          </div>
          <button
            onClick={() => setShowVal(v => !v)}
            className="rounded p-1 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
            title={showVal ? 'Hide' : 'Show'}
          >
            {showVal ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      {/* Input to update key at runtime */}
      <div className="mb-3">
        <div className="text-[9px] uppercase text-zinc-600 font-semibold mb-1.5">
          Paste new key (saved to browser storage)
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inputVal && handleSave()}
            placeholder="Paste your API key here..."
            className="flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={!inputVal.trim()}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer disabled:opacity-30',
              saved
                ? 'bg-orange-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600',
            )}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {saved && (
          <p className="text-[10px] text-amber-400 mt-1.5">
            ⚠ Refresh the page for the new key to take effect in live API calls.
          </p>
        )}
      </div>

      {/* Bottom Row: links + test */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-3 text-[10px]">
          <a
            href={api.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('flex items-center gap-1 font-semibold hover:underline', getColorClasses(api.color, 'text'))}
          >
            Get Free Key <ExternalLink size={9} />
          </a>
          <span className="text-zinc-700">|</span>
          <a
            href={api.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300"
          >
            Docs <ExternalLink size={9} />
          </a>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500">{api.freeTier}</span>
        </div>

        {api.testEndpoint && (
          <button
            onClick={handleTest}
            disabled={testing || !configured}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-[10px] text-zinc-400 hover:border-zinc-600 hover:text-white transition-all cursor-pointer disabled:opacity-40"
          >
            {testing ? (
              <><RefreshCw size={10} className="animate-spin" /> Testing...</>
            ) : testResult === 'success' ? (
              <><CheckCircle2 size={10} className="text-orange-400" /> Connected</>
            ) : testResult === 'fail' ? (
              <><XCircle size={10} className="text-red-400" /> Failed</>
            ) : (
              <><Activity size={10} /> Test Connection</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Alpha Vantage Rate Meter ──────────────────────────────────────────────────
function AVRateMeter() {
  const status = getAVRateStatus();
  const pct = Math.min((status.requestsToday / 25) * 100, 100);
  const color = pct < 60 ? 'emerald' : pct < 85 ? 'amber' : 'red';

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={15} className="text-orange-400" />
        <h3 className="text-sm font-semibold text-white">Alpha Vantage Rate Limiter</h3>
        <span className={cn(
          'ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
          isAlphaVantageConfigured() ? 'bg-orange-500/15 text-orange-400' : 'bg-zinc-800 text-zinc-500',
        )}>
          {isAlphaVantageConfigured() ? 'Active' : 'Not Configured'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-zinc-800 bg-black/50 p-3 text-center">
          <div className="text-xl font-bold font-mono text-white">{status.requestsToday}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Requests Today</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/50 p-3 text-center">
          <div className="text-xl font-bold font-mono text-white">{25 - status.requestsToday}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Remaining Today</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/50 p-3 text-center">
          <div className="text-xl font-bold font-mono text-white">25</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Daily Limit (Free)</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
          <span>Daily Usage</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              color === 'emerald' ? 'bg-orange-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          Resets daily at midnight UTC · Last reset: {status.lastReset}
        </p>
      </div>
    </div>
  );
}

// ── Source Priority Diagram ───────────────────────────────────────────────────
function SourcePriorityDiagram() {
  const sources = [
    { num: 1, name: 'Yahoo Finance', note: 'No key needed — CORS proxy', status: 'always', color: 'emerald' },
    { num: 2, name: 'Alpha Vantage', note: 'VITE_ALPHA_VANTAGE_API_KEY', status: isAlphaVantageConfigured() ? 'active' : 'inactive', color: 'cyan' },
    { num: 3, name: 'Twelve Data',   note: 'VITE_TWELVEDATA_API_KEY', status: !PLACEHOLDER_VALUES.has(import.meta.env.VITE_TWELVEDATA_API_KEY || '') ? 'active' : 'inactive', color: 'violet' },
    { num: 4, name: 'Finnhub',       note: 'VITE_FINNHUB_API_KEY', status: !PLACEHOLDER_VALUES.has(import.meta.env.VITE_FINNHUB_API_KEY || '') ? 'active' : 'inactive', color: 'emerald' },
    { num: 5, name: 'Simulated',     note: 'Last resort fallback', status: 'fallback', color: 'slate' },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={15} className="text-orange-400" />
        <h3 className="text-sm font-semibold text-white">Data Source Priority Chain</h3>
      </div>
      <div className="space-y-2">
        {sources.map((s, i) => (
          <div key={s.num} className="relative">
            <div className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3',
              s.status === 'always'    ? 'border-orange-800/50 bg-orange-950/20' :
              s.status === 'active'    ? 'border-orange-800/40 bg-orange-950/15' :
              s.status === 'fallback'  ? 'border-zinc-700/50 bg-black/30' :
              'border-zinc-800 bg-black/30 opacity-50'
            )}>
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0',
                s.status === 'always'   ? 'bg-orange-500/20 text-orange-400' :
                s.status === 'active'   ? 'bg-orange-500/20 text-orange-400' :
                s.status === 'fallback' ? 'bg-zinc-700 text-zinc-400' :
                'bg-zinc-800 text-zinc-600'
              )}>
                {s.num}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-white">{s.name}</div>
                <div className="text-[10px] text-zinc-500 font-mono">{s.note}</div>
              </div>
              <div className={cn(
                'text-[9px] font-bold uppercase rounded-full px-2 py-0.5',
                s.status === 'always'   ? 'bg-orange-500/15 text-orange-400' :
                s.status === 'active'   ? 'bg-orange-500/15 text-orange-400' :
                s.status === 'fallback' ? 'bg-zinc-700 text-zinc-400' :
                'bg-zinc-800 text-zinc-600'
              )}>
                {s.status === 'always' ? '✓ Always On' : s.status === 'active' ? '✓ Configured' : s.status === 'fallback' ? 'Fallback' : '✗ Not Set'}
              </div>
            </div>
            {i < sources.length - 1 && (
              <div className="flex justify-center py-0.5">
                <div className="text-[10px] text-zinc-700">↓ if unavailable</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Env File Instructions ─────────────────────────────────────────────────────
function EnvInstructions() {
  const [copied, setCopied] = useState(false);

  const envContent = `# CLARA Environment Configuration
# Add this to your .env file in the project root

# Alpha Vantage — https://www.alphavantage.co/support/#api-key
VITE_ALPHA_VANTAGE_API_KEY=your_key_here

# Twelve Data — https://twelvedata.com/pricing
VITE_TWELVEDATA_API_KEY=your_key_here

# Finnhub — https://finnhub.io/register
VITE_FINNHUB_API_KEY=your_key_here

# EmailJS — https://emailjs.com
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key`;

  function handleCopy() {
    navigator.clipboard.writeText(envContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-black/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">.env File Setup (Persistent — Recommended)</h3>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer"
        >
          {copied ? '✓ Copied!' : 'Copy Template'}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 mb-3">
        For permanent key configuration, add these variables to your <code className="text-amber-400 font-mono">.env</code> file
        in the project root, then rebuild. Keys saved via the UI above are stored in browser localStorage and work immediately
        but reset if storage is cleared.
      </p>
      <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-black p-4 text-[10px] text-zinc-400 font-mono leading-relaxed">
        {envContent}
      </pre>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ApiSettingsPanel() {
  const [activeGroup, setActiveGroup] = useState<'market' | 'email' | 'all'>('market');

  const marketApis = APIS.filter(a => !a.id.startsWith('emailjs'));
  const emailApis  = APIS.filter(a => a.id.startsWith('emailjs'));
  const shownApis  = activeGroup === 'market' ? marketApis : activeGroup === 'email' ? emailApis : APIS;

  const configuredCount = APIS.filter(a => isKeyConfigured(a, getRuntimeKey(a.id))).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">API Configuration</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage API keys for live market data, technical indicators, and email alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold',
            configuredCount > 2 ? 'bg-orange-500/15 text-orange-400' : 'bg-amber-500/15 text-amber-400',
          )}>
            {configuredCount > 2 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {configuredCount} / {APIS.length} Keys Configured
          </div>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-2">
        {([['market', 'Market Data APIs'], ['email', 'Email Alert APIs'], ['all', 'All APIs']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveGroup(id)}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer',
              activeGroup === id
                ? 'bg-orange-600 text-white'
                : 'border border-zinc-700 bg-black text-zinc-400 hover:text-white',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status + Priority side-by-side */}
      <div className="grid grid-cols-2 gap-4">
        <SourcePriorityDiagram />
        <AVRateMeter />
      </div>

      {/* API Cards */}
      <div className="grid grid-cols-1 gap-4">
        {shownApis.map(api => (
          <ApiCard key={api.id} api={api} />
        ))}
      </div>

      {/* .env instructions */}
      <EnvInstructions />
    </div>
  );
}
