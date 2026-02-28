/**
 * CLARA — AI Alert Agent Hook
 *
 * Continuously monitors live holdings against their computed price targets.
 * When a target is crossed it:
 *   1. Adds an in-app notification (visible in the UI immediately)
 *   2. Sends an email via EmailJS (if configured)
 *   3. Logs the event to the audit trail
 *   4. Respects a 4-hour per-symbol cooldown so you're not spammed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  sendAlertEmail,
  canSendAlert,
  markAlertSent,
  resetAlertCooldown,
  isEmailConfigured,
  type AlertType,
  type AlertLog,
} from '@/services/emailAlertService';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AlertRule {
  id: string;
  symbol: string;
  enabled: boolean;
  watchSellTarget: boolean;
  watchStopLoss: boolean;
  watchTrailingStop: boolean;
  watchBullTarget: boolean;
}

export interface InAppAlert {
  id: string;
  timestamp: Date;
  type: AlertType;
  symbol: string;
  company: string;
  message: string;
  triggerPrice: number;
  currentPrice: number;
  severity: 'info' | 'warning' | 'critical' | 'success';
  acknowledged: boolean;
  emailSent: boolean;
}

export interface MonitoredHolding {
  id: string;
  symbol: string;
  company: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  sellTarget: number;
  stopLoss: number;
  trailingStop: number;
  bullTarget: number;
  gainLoss: number;
  gainLossPct: number;
  marketValue: number;
}

export interface AlertAgentConfig {
  userEmail: string;
  enabled: boolean;
  checkIntervalMs: number;   // how often to poll (default 30s)
  alertOnSellTarget: boolean;
  alertOnStopLoss: boolean;
  alertOnTrailingStop: boolean;
  alertOnBullTarget: boolean;
  sendDailySummary: boolean;
  dailySummaryTime: string;  // HH:MM format
}

// ── Default config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AlertAgentConfig = {
  userEmail: '',
  enabled: false,
  checkIntervalMs: 30_000,
  alertOnSellTarget: true,
  alertOnStopLoss: true,
  alertOnTrailingStop: true,
  alertOnBullTarget: false,
  sendDailySummary: false,
  dailySummaryTime: '16:00',
};

const CONFIG_KEY = 'CLARA_alert_config_v1';
const LOGS_KEY   = 'CLARA_alert_logs_v1';

function loadConfig(): AlertAgentConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(c: AlertAgentConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

function loadLogs(): AlertLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((l: AlertLog) => ({ ...l, timestamp: new Date(l.timestamp) }));
    }
  } catch { /* ignore */ }
  return [];
}

function saveLogs(logs: AlertLog[]) {
  try { localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(-200))); } catch { /* ignore */ }
}

function alertSeverity(type: AlertType): InAppAlert['severity'] {
  switch (type) {
    case 'STOP_LOSS_HIT':     return 'critical';
    case 'TRAILING_STOP_HIT': return 'warning';
    case 'SELL_TARGET_HIT':   return 'success';
    case 'BULL_TARGET_HIT':   return 'success';
    case 'DAILY_SUMMARY':     return 'info';
  }
}

function alertMessage(type: AlertType, symbol: string, price: number): string {
  const p = `$${price.toFixed(2)}`;
  switch (type) {
    case 'SELL_TARGET_HIT':   return `${symbol} has reached its sell target at ${p}. Consider taking profits.`;
    case 'STOP_LOSS_HIT':     return `${symbol} has breached its stop loss at ${p}. Review your position immediately.`;
    case 'TRAILING_STOP_HIT': return `${symbol} has hit its trailing stop at ${p}. Consider reducing exposure.`;
    case 'BULL_TARGET_HIT':   return `${symbol} has reached the bull case target at ${p}. Excellent performance — take profits?`;
    case 'DAILY_SUMMARY':     return `Daily portfolio summary ready.`;
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAlertAgent() {
  const [config, setConfigState] = useState<AlertAgentConfig>(loadConfig);
  const [inAppAlerts, setInAppAlerts] = useState<InAppAlert[]>([]);
  const [emailLogs, setEmailLogs]   = useState<AlertLog[]>(loadLogs);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdingsRef = useRef<MonitoredHolding[]>([]);
  const configRef   = useRef<AlertAgentConfig>(config);

  // Keep refs in sync
  useEffect(() => { configRef.current = config; }, [config]);

  const updateConfig = useCallback((updates: Partial<AlertAgentConfig>) => {
    setConfigState(prev => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      configRef.current = next;
      return next;
    });
  }, []);

  // Register current holdings with the agent
  const setMonitoredHoldings = useCallback((holdings: MonitoredHolding[]) => {
    holdingsRef.current = holdings;
  }, []);

  // Fire an alert (in-app + email)
  const fireAlert = useCallback(async (
    type: AlertType,
    holding: MonitoredHolding,
    triggerPrice: number,
    totalPortfolioValue: number
  ) => {
    if (!canSendAlert(holding.symbol, type)) return;
    markAlertSent(holding.symbol, type);

    // In-app notification
    const inApp: InAppAlert = {
      id: `${holding.symbol}-${type}-${Date.now()}`,
      timestamp: new Date(),
      type,
      symbol: holding.symbol,
      company: holding.company,
      message: alertMessage(type, holding.symbol, triggerPrice),
      triggerPrice,
      currentPrice: holding.currentPrice,
      severity: alertSeverity(type),
      acknowledged: false,
      emailSent: false,
    };

    setInAppAlerts(prev => [inApp, ...prev].slice(0, 100));

    // Email
    const cfg = configRef.current;
    if (cfg.userEmail && cfg.enabled) {
      const log = await sendAlertEmail({
        toEmail: cfg.userEmail,
        alertType: type,
        symbol: holding.symbol,
        company: holding.company,
        triggerPrice,
        currentPrice: holding.currentPrice,
        avgCost: holding.avgCost,
        shares: holding.shares,
        gainLoss: holding.gainLoss,
        gainLossPct: holding.gainLossPct,
        portfolioValue: totalPortfolioValue,
        action: alertMessage(type, holding.symbol, triggerPrice),
      });

      setEmailLogs(prev => {
        const next = [log, ...prev].slice(0, 200);
        saveLogs(next);
        return next;
      });

      // Update in-app alert with email sent status
      setInAppAlerts(prev =>
        prev.map(a => a.id === inApp.id ? { ...a, emailSent: log.sent } : a)
      );
    }
  }, []);

  // Check all holdings against their targets
  const runCheck = useCallback(async () => {
    const cfg = configRef.current;
    const holdings = holdingsRef.current;
    if (!cfg.enabled || holdings.length === 0) return;

    const totalPortfolioValue = holdings.reduce((s, h) => s + h.marketValue, 0);

    for (const h of holdings) {
      const price = h.currentPrice;

      // Sell target crossed upward
      if (cfg.alertOnSellTarget && price >= h.sellTarget) {
        await fireAlert('SELL_TARGET_HIT', h, h.sellTarget, totalPortfolioValue);
      }

      // Stop loss crossed downward
      if (cfg.alertOnStopLoss && price <= h.stopLoss) {
        await fireAlert('STOP_LOSS_HIT', h, h.stopLoss, totalPortfolioValue);
      }

      // Trailing stop crossed downward
      if (cfg.alertOnTrailingStop && price <= h.trailingStop) {
        await fireAlert('TRAILING_STOP_HIT', h, h.trailingStop, totalPortfolioValue);
      }

      // Bull target crossed upward
      if (cfg.alertOnBullTarget && price >= h.bullTarget) {
        await fireAlert('BULL_TARGET_HIT', h, h.bullTarget, totalPortfolioValue);
      }
    }
  }, [fireAlert]);

  // Start / stop polling loop
  useEffect(() => {
    if (config.enabled) {
      setAgentStatus('running');
      runCheck(); // immediate first check
      intervalRef.current = setInterval(runCheck, config.checkIntervalMs);
    } else {
      setAgentStatus(config.userEmail ? 'paused' : 'idle');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config.enabled, config.checkIntervalMs, runCheck]);

  const acknowledgeAlert = useCallback((id: string) => {
    setInAppAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setInAppAlerts([]);
  }, []);

  const resetCooldown = useCallback((symbol: string, type: AlertType) => {
    resetAlertCooldown(symbol, type);
  }, []);

  const testAlert = useCallback(async (symbol: string) => {
    const h = holdingsRef.current.find(x => x.symbol === symbol);
    if (!h) return;
    const totalPortfolioValue = holdingsRef.current.reduce((s, x) => s + x.marketValue, 0);
    resetAlertCooldown(symbol, 'SELL_TARGET_HIT');
    await fireAlert('SELL_TARGET_HIT', h, h.sellTarget, totalPortfolioValue);
  }, [fireAlert]);

  const unacknowledgedCount = inAppAlerts.filter(a => !a.acknowledged).length;

  return {
    config,
    updateConfig,
    setMonitoredHoldings,
    inAppAlerts,
    emailLogs,
    agentStatus,
    acknowledgeAlert,
    clearAllAlerts,
    resetCooldown,
    testAlert,
    unacknowledgedCount,
    isEmailConfigured: isEmailConfigured(),
  };
}
