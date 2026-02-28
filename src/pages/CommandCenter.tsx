import { KPICards } from '@/components/KPICards';
import { EventFeed } from '@/components/EventFeed';
import { VaRChart } from '@/components/VaRChart';
import { MonteCarloChart } from '@/components/MonteCarloChart';
import { RiskContributors } from '@/components/RiskContributors';
import { ShockMatrix } from '@/components/ShockMatrix';
import { PortfolioImpactPanel } from '@/components/PortfolioImpactPanel';
import { RegimePanel } from '@/components/RegimePanel';
import { HedgePanel } from '@/components/HedgePanel';
import { AnalogPanel } from '@/components/AnalogPanel';
import { CorrelationPanel } from '@/components/CorrelationPanel';
import { AuditTrail } from '@/components/AuditTrail';
import { MarketTicker } from '@/components/MarketTicker';

interface Props {
  setActiveTab: (tab: string) => void;
}

export function CommandCenter({ setActiveTab }: Props) {
  return (
    <>
      {/* Executive Alert Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
          <span className="text-red-400 text-lg font-bold">!</span>
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Critical Alert — 4 Limit Breaches Detected</div>
          <div className="text-[11px] text-red-300/70 mt-0.5">
            Taiwan Strait escalation + China tariffs compound scenario. VaR 95% at $28.7M (limit $25M).
            Regime: Crisis Contagion (1.85× multiplier). Immediate hedge action recommended.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('Alerts')} className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-900/50 transition-colors cursor-pointer">
            View Breaches
          </button>
          <button onClick={() => setActiveTab('Hedge Engine')} className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500 transition-colors cursor-pointer">
            Execute Hedges
          </button>
        </div>
      </div>

      {/* Live Market Ticker */}
      <MarketTicker onViewAll={() => setActiveTab('Live Markets')} />

      <KPICards />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <EventFeed />
        </div>
        <div className="col-span-7 space-y-4">
          <VaRChart />
          <div className="grid grid-cols-2 gap-4">
            <MonteCarloChart />
            <RiskContributors />
          </div>
        </div>
      </div>

      <ShockMatrix />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <PortfolioImpactPanel />
        </div>
        <div className="col-span-5">
          <RegimePanel />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <HedgePanel />
        </div>
        <div className="col-span-7">
          <AnalogPanel />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <CorrelationPanel />
        </div>
        <div className="col-span-7">
          <AuditTrail />
        </div>
      </div>
    </>
  );
}
