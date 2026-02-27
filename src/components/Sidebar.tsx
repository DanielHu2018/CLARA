import { cn } from '@/utils/cn';
import {
  Activity, AlertTriangle, BarChart3, Brain,
  LineChart, FileText, History, LayoutDashboard,
  Radio, Shield, TrendingDown, Zap, LogOut, FileSearch,
} from 'lucide-react';
import type { AuthSession } from '@/auth/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Command Center' },
  { icon: LineChart,       label: 'Live Markets' },
  { icon: Radio,           label: 'Event Feed' },
  { icon: Zap,             label: 'Shock Matrix' },
  { icon: TrendingDown,    label: 'Portfolio Risk' },
  { icon: Shield,          label: 'Hedge Engine' },
  { icon: Brain,           label: 'Regime Analysis' },
  { icon: History,         label: 'Historical Analogs' },
  { icon: BarChart3,       label: 'Simulation' },
  { icon: FileSearch,      label: '10-K Analysis' },
  { icon: AlertTriangle,   label: 'Alerts', badge: 4 },
  { icon: FileText,        label: 'Audit Trail' },
  { icon: Activity,        label: 'System Health' },
];

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session?: AuthSession | null;
  onSignOut?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, session, onSignOut }: SidebarProps) {
  return (
    <div className="flex h-screen w-64 flex-col border-r border-zinc-900 bg-black text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-zinc-900 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center">
          <img src="/blackhole-icon.svg" alt="CLARA Logo" className="w-full h-full" />
        </div>
        <div>
          <div className="text-base font-bold tracking-wide" style={{ fontFamily: 'Orbitron, Rajdhani, sans-serif' }}>CLARA</div>
          <div className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
            Clairvoyant Loss Avoidance & Risk Advisor
          </div>
        </div>
      </div>

      {/* User Profile */}
      {session && (
        <div className="mx-4 mt-4 rounded-xl border border-zinc-800 bg-black/80 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
              style={{ background: session.avatarColor }}
            >
              {session.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{session.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{session.email}</div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign out"
                className="shrink-0 rounded-lg p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="mx-4 mt-3 rounded-lg border border-zinc-800/50 bg-black/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wide">System Active</span>
        </div>
        <div className="mt-1 text-[10px] text-zinc-500">Cycle: 5m 42s • 100K MC paths</div>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.label;
          return (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-black text-white font-medium border border-zinc-800/50'
                  : 'text-zinc-400 hover:bg-black hover:text-zinc-200'
              )}
            >
              <item.icon size={17} className={isActive ? 'text-white' : ''} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Regime Badge */}
      <div className="mx-4 mb-4 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-3">
        <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">Current Regime</div>
        <div className="mt-1 text-sm font-bold text-amber-300">Crisis Contagion</div>
        <div className="mt-1 text-[10px] text-zinc-500">Shock Multiplier: 1.85×</div>
      </div>
    </div>
  );
}
