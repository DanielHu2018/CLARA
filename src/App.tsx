import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { LiveNewsTicker } from '@/components/LiveNewsTicker';
import { ChatBot } from '@/components/ChatBot';
import { AuthPage } from '@/auth/AuthPage';
import { CommandCenter } from '@/pages/CommandCenter';
import { LiveMarketsPage } from '@/pages/LiveMarketsPage';
import { EventFeedPage } from '@/pages/EventFeedPage';
import { ShockMatrixPage } from '@/pages/ShockMatrixPage';
import { PortfolioRiskPage } from '@/pages/PortfolioRiskPage';
import { HedgeEnginePage } from '@/pages/HedgeEnginePage';
import { RegimeAnalysisPage } from '@/pages/RegimeAnalysisPage';
import { HistoricalAnalogsPage } from '@/pages/HistoricalAnalogsPage';
import { SimulationPage } from '@/pages/SimulationPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { AuditTrailPage } from '@/pages/AuditTrailPage';
import { SystemHealthPage } from '@/pages/SystemHealthPage';
import { TenKAnalysisPage } from '@/pages/TenKAnalysisPage';
import { getCurrentSession, signOut, type AuthSession } from '@/auth/authStore';

const tabComponents: Record<string, React.ComponentType<{ setActiveTab?: (tab: string) => void }>> = {
  'Live Markets':       LiveMarketsPage,
  'Event Feed':         EventFeedPage,
  'Shock Matrix':       ShockMatrixPage,
  'Hedge Engine':       HedgeEnginePage,
  'Regime Analysis':    RegimeAnalysisPage,
  'Historical Analogs': HistoricalAnalogsPage,
  'Simulation':         SimulationPage,
  '10-K Analysis':      TenKAnalysisPage,
  'Alerts':             AlertsPage,
  'Audit Trail':        AuditTrailPage,
  'System Health':      SystemHealthPage,
};

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getCurrentSession());
  const [activeTab, setActiveTab] = useState('Command Center');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Re-check session on mount
  useEffect(() => {
    setSession(getCurrentSession());
  }, []);

  const handleAuth = () => {
    setSession(getCurrentSession());
  };

  const handleSignOut = () => {
    signOut();
    setSession(null);
    setActiveTab('Command Center');
  };

  // Not authenticated — show auth page
  if (!session) {
    return <AuthPage onAuth={handleAuth} />;
  }

  const PageComponent = tabComponents[activeTab];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
      {/* ── Sidebar (Desktop) ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} session={session} onSignOut={handleSignOut} />
      </div>

      {/* ── Mobile Sidebar Overlay ─────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }} 
              session={session} 
              onSignOut={handleSignOut} 
            />
          </div>
        </>
      )}

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* ══ LIVE TICKER (stocks + news) ══════════════════════════════════════ */}
        <LiveNewsTicker />

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <Header 
          activeTab={activeTab} 
          session={session} 
          onSignOut={handleSignOut}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        {/* ── Scrollable page content ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:pr-16">
          {activeTab === 'Command Center' ? (
            <CommandCenter setActiveTab={setActiveTab} />
          ) : activeTab === 'Portfolio Risk' ? (
            <PortfolioRiskPage userId={session.userId} userName={session.name} />
          ) : PageComponent ? (
            <PageComponent setActiveTab={setActiveTab} />
          ) : (
            <div className="flex h-96 items-center justify-center">
              <p className="text-zinc-600">Tab not found</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/50 px-3 sm:px-5 py-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] text-zinc-500">
              <span>Clara v2.4.1</span>
              <span className="hidden sm:inline">•</span>
              <span>IBM watsonx Granite</span>
              <span className="hidden sm:inline">•</span>
              <span>SR 11-7 Compliant</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Model Governance: Active</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] text-zinc-500">
              <span>
                Logged in as{' '}
                <span className="text-white font-semibold">{session.name}</span>
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">CONFIDENTIAL</span>
            </div>
          </div>
        </main>
      </div>

      {/* ── AI Chat Side Panel ─────────────────────────────────────────────── */}
      <ChatBot session={session} />
    </div>
  );
}
