import { useState } from 'react';
import { cn } from '@/utils/cn';
import { signIn, signUp } from './authStore';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Brain, TrendingUp, Shield, Zap } from 'lucide-react';
import { ScrollAnimatedBackground } from '@/components/ScrollAnimatedBackground';

interface AuthPageProps {
  onAuth: () => void;
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        const r = await signUp(name, email, password);
        if (!r.ok) { setError(r.error || 'Sign-up failed.'); setLoading(false); return; }
        setSuccess('Account created! Logging you in...');
        setTimeout(onAuth, 800);
      } else {
        const r = await signIn(email, password);
        if (!r.ok) { setError(r.error || 'Sign-in failed.'); setLoading(false); return; }
        onAuth();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, label: 'Multiple Portfolios', desc: 'Track and compare unlimited portfolios side-by-side' },
    { icon: Brain, label: 'AI Chatbot', desc: 'CLARA answers your market and risk questions in real time' },
    { icon: Shield, label: 'Price Alerts', desc: 'Automated email alerts when your targets hit' },
    { icon: Zap, label: 'Live Data', desc: 'Real-time quotes, news feed and Alpha Vantage integration' },
  ];

  // If auth form is not shown, display full-page marketing content
  if (!showAuthForm) {
    return (
      <div className="min-h-screen w-screen bg-black overflow-x-hidden relative">
        {/* Scroll-Animated Black Hole Background */}
        <ScrollAnimatedBackground />

        {/* Fixed Top Bar with Sign In Button */}
        <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-6 z-50 bg-black/80 backdrop-blur-sm border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src="/blackhole-icon.svg" alt="CLARA Logo" className="w-full h-full" />
            </div>
            <div>
              <div className="text-lg font-black tracking-wide text-white" style={{ fontFamily: 'Orbitron, Rajdhani, sans-serif' }}>CLARA</div>
              <div className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Clairvoyant Loss Avoidance & Risk Advisor</div>
            </div>
          </div>
          <button
            onClick={() => setShowAuthForm(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-6 py-2.5 text-sm font-bold text-white transition-all"
          >
            Sign In
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 pt-24">
          {/* Hero Section */}
          <section className="min-h-screen flex flex-col items-center justify-center px-8 py-20">
            <div className="space-y-8 text-center max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/40 bg-black/30 px-4 py-2 mb-6">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Institutional-Grade AI Risk Engine</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-black text-white leading-tight" style={{ fontFamily: 'Times New Roman' }}>
                The New Risk<br />
                <span className="bg-gradient-to-r from-zinc-300 to-white bg-clip-text text-transparent" style={{ fontFamily: 'Times New Roman' }}>Operating System</span>
              </h1>
              
              <p className="text-zinc-200 text-lg leading-relaxed max-w-3xl mx-auto" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,1)' }}>
                CLARA autonomously ingests global events, translates narratives into quantitative risk factors,
                simulates portfolio impact in real time, and proposes optimized hedges — all with full audit trail.
              </p>

              <button
                onClick={() => { setShowAuthForm(true); setMode('signup'); }}
                className="mt-12 rounded-xl bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 px-8 py-4 text-base font-bold text-white shadow-lg shadow-zinc-900/30 transition-all"
              >
                Get Started
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-32 px-8 border-t border-zinc-900">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-white mb-4">Built for Modern Risk Management</h2>
                <p className="text-zinc-200 text-lg max-w-2xl mx-auto">
                  Enterprise-grade tools that transform how you understand and manage portfolio risk
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map(f => (
                  <div key={f.label} className="rounded-xl border border-zinc-800 bg-black/60 backdrop-blur-sm p-6 hover:border-zinc-700 transition-all">
                    <f.icon size={24} className="text-zinc-400 mb-4" />
                    <div className="text-base font-bold text-white mb-2">{f.label}</div>
                    <div className="text-sm text-zinc-500 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Capabilities Section */}
          <section className="py-32 px-8 border-t border-zinc-900">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-white mb-4">Advanced Risk Analytics</h2>
                <p className="text-zinc-200 text-lg max-w-2xl mx-auto">
                  Comprehensive suite of quantitative risk tools powered by AI
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="rounded-2xl border border-zinc-800 bg-black/60 backdrop-blur-sm p-8">
                  <div className="text-orange-400 font-bold mb-2">Monte Carlo Simulation</div>
                  <h3 className="text-2xl font-black text-white mb-4">100K Path Simulation Engine</h3>
                  <p className="text-zinc-400 mb-6">
                    Run sophisticated Monte Carlo simulations with 100,000 paths to model portfolio outcomes under various market scenarios. 
                    Calculate VaR and Expected Shortfall with institutional-grade precision.
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="rounded-lg border border-zinc-800 bg-black/40 px-4 py-2">
                      <div className="text-zinc-500">VaR 95%</div>
                      <div className="text-white font-bold">$2.4M</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black/40 px-4 py-2">
                      <div className="text-zinc-500">VaR 99%</div>
                      <div className="text-white font-bold">$3.8M</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black/40 px-4 py-2">
                      <div className="text-zinc-500">ES</div>
                      <div className="text-white font-bold">$4.2M</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/60 backdrop-blur-sm p-8">
                  <div className="text-orange-400 font-bold mb-2">Historical Analogs</div>
                  <h3 className="text-2xl font-black text-white mb-4">Pattern Recognition AI</h3>
                  <p className="text-zinc-400 mb-6">
                    AI-powered engine that identifies historical market regimes similar to current conditions. 
                    Learn from past crises to anticipate future risks with semantic and structural similarity matching.
                  </p>
                  <div className="space-y-2">
                    {['2008 Financial Crisis', '2020 COVID Crash', '2022 Rate Shock'].map((event, i) => (
                      <div key={event} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-4 py-2 text-sm">
                        <span className="text-zinc-300">{event}</span>
                        <span className="text-orange-400 font-bold">{[87, 82, 76][i]}% match</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/60 backdrop-blur-sm p-8">
                  <div className="text-orange-400 font-bold mb-2">Shock Matrix</div>
                  <h3 className="text-2xl font-black text-white mb-4">Stress Testing Framework</h3>
                  <p className="text-zinc-400 mb-6">
                    Apply regulatory-grade stress scenarios across multiple risk factors. 
                    Test your portfolio against adverse and severe market shocks to understand tail risk exposure.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-center">
                      <div className="text-zinc-500">Equities</div>
                      <div className="text-red-400 font-bold">-35%</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-center">
                      <div className="text-zinc-500">Rates</div>
                      <div className="text-red-400 font-bold">+200bp</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-center">
                      <div className="text-zinc-500">Vol</div>
                      <div className="text-orange-400 font-bold">+150%</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/60 backdrop-blur-sm p-8">
                  <div className="text-orange-400 font-bold mb-2">Hedge Engine</div>
                  <h3 className="text-2xl font-black text-white mb-4">Automated Hedge Optimization</h3>
                  <p className="text-zinc-400 mb-6">
                    AI-driven recommendations for optimal hedging strategies. 
                    Reduce tail risk exposure while minimizing cost and preserving upside potential.
                  </p>
                  <div className="space-y-2">
                    {[
                      { instrument: 'SPY Puts', priority: 'Critical', cost: '$45K' },
                      { instrument: 'VIX Calls', priority: 'High', cost: '$28K' },
                      { instrument: 'TLT Position', priority: 'Medium', cost: '$12K' }
                    ].map(hedge => (
                      <div key={hedge.instrument} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-4 py-2 text-sm">
                        <span className="text-zinc-300">{hedge.instrument}</span>
                        <div className="flex gap-3">
                          <span className={hedge.priority === 'Critical' ? 'text-red-400' : hedge.priority === 'High' ? 'text-orange-400' : 'text-amber-400'}>{hedge.priority}</span>
                          <span className="text-zinc-500">{hedge.cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-32 px-8 border-t border-zinc-900">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-white mb-4">Enterprise Performance</h2>
                <p className="text-zinc-200 text-lg max-w-2xl mx-auto">
                  Built for scale, speed, and reliability
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { value: '100K', label: 'Monte Carlo Paths', desc: 'Per simulation run' },
                  { value: '<6min', label: 'Full Cycle Time', desc: 'End-to-end execution' },
                  { value: '99.9%', label: 'Uptime SLA', desc: 'Production availability' },
                  { value: 'SR 11-7', label: 'Regulatory Compliant', desc: 'Fed stress testing' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl border border-zinc-800 bg-black/60 backdrop-blur-sm p-6">
                    <div className="text-3xl font-black text-white font-mono mb-2">{s.value}</div>
                    <div className="text-sm font-bold text-zinc-300 mb-1">{s.label}</div>
                    <div className="text-xs text-zinc-600">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-32 px-8 border-t border-zinc-900">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl font-black text-white mb-6">Ready to Transform Your Risk Management?</h2>
              <p className="text-zinc-200 text-lg mb-12 max-w-2xl mx-auto">
                Join institutional investors using CLARA to navigate market uncertainty with confidence
              </p>
              <button
                onClick={() => { setShowAuthForm(true); setMode('signup'); }}
                className="rounded-xl bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 px-10 py-5 text-lg font-bold text-white shadow-lg shadow-zinc-900/30 transition-all"
              >
                Sign Up
              </button>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 px-8 border-t border-zinc-900 bg-black/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center">
                    <img src="/blackhole-icon.svg" alt="CLARA Logo" className="w-full h-full" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white" style={{ fontFamily: 'Orbitron, Rajdhani, sans-serif' }}>CLARA</div>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Clairvoyant Loss Avoidance & Risk Advisor</div>
                  </div>
                </div>
                <div className="text-xs text-zinc-700 text-center">
                  CLARA v2.4.1 · SR 11-7 Compliant · IBM watsonx Granite · Classification: CONFIDENTIAL
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // Show auth form (side-by-side layout)
  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden">
      {/* Left Panel — Auth Form */}
      <div className="flex flex-1 items-center justify-center p-8 relative">
        {/* Back Button */}
        <button
          onClick={() => setShowAuthForm(false)}
          className="absolute top-6 left-6 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center">
              <img src="/blackhole-icon.svg" alt="CLARA Logo" className="w-full h-full" />
            </div>
            <div className="text-lg font-black text-white" style={{ fontFamily: 'Orbitron, Rajdhani, sans-serif' }}>CLARA</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-2">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-zinc-400">
              {mode === 'signin'
                ? 'Sign in to access your portfolios and risk engine.'
                : 'Start tracking portfolios with AI-powered risk analysis.'}
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-xl border border-zinc-800 bg-black/50 p-1 mb-6">
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
                  mode === m ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 focus:outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-green-900/40 bg-green-950/30 px-4 py-3 text-sm text-green-400">
                <CheckCircle2 size={14} className="shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 disabled:opacity-50 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-zinc-900/30 transition-all"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === 'signin' ? 'Sign In to CLARA' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-600">
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
              className="text-white hover:text-zinc-300 font-semibold transition-colors"
            >
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <p className="mt-8 text-center text-[10px] text-zinc-700">
            CLARA v2.4.1 · SR 11-7 Compliant · IBM watsonx Granite · Classification: CONFIDENTIAL
          </p>
        </div>
      </div>

      {/* Right Panel — Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between items-end p-12 bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-black tracking-wide text-white" style={{ fontFamily: 'Orbitron, Rajdhani, sans-serif' }}>CLARA</div>
            <div className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Clairvoyant Loss Avoidance & Risk Advisor</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center">
            <img src="/blackhole-icon.svg" alt="CLARA Logo" className="w-full h-full" />
          </div>
        </div>

        {/* Hero */}
        <div className="space-y-6 text-right">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/40 bg-black/30 px-3 py-1.5 mb-5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Institutional-Grade AI Risk Engine</span>
            </div>
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              The New Risk<br />
              <span className="bg-gradient-to-r from-zinc-300 to-white bg-clip-text text-transparent">Operating System</span>
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md ml-auto">
              CLARA autonomously ingests global events, translates narratives into quantitative risk factors,
              simulates portfolio impact in real time, and proposes optimized hedges — all with full audit trail.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(f => (
              <div key={f.label} className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-left">
                <f.icon size={16} className="text-zinc-400 mb-2" />
                <div className="text-xs font-bold text-white mb-1">{f.label}</div>
                <div className="text-[10px] text-zinc-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="flex gap-8">
          {[
            { value: '100K', label: 'MC Paths' },
            { value: '<6m', label: 'Full Cycle' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: 'SR 11-7', label: 'Compliant' },
          ].map(s => (
            <div key={s.label} className="text-right">
              <div className="text-xl font-black text-zinc-300 font-mono">{s.value}</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
