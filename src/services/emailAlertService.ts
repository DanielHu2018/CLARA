/**
 * CLARA — Email Alert Service
 * Uses EmailJS to send browser-side emails (no backend required).
 *
 * Keys are read from environment variables (.env):
 *   VITE_EMAILJS_SERVICE_ID
 *   VITE_EMAILJS_TEMPLATE_ID
 *   VITE_EMAILJS_PUBLIC_KEY
 *
 * How to set up EmailJS:
 *   1. Go to https://www.emailjs.com and create a free account
 *   2. Add an Email Service (Gmail, Outlook, etc.) → note the Service ID
 *   3. Create a template with these variables:
 *        {{to_email}}, {{subject}}, {{alert_type}}, {{symbol}}, {{company}},
 *        {{trigger_price}}, {{current_price}}, {{pct_change}},
 *        {{gain_loss}}, {{action}}, {{portfolio_value}}, {{timestamp}}
 *   4. Copy your Public Key from Account → API Keys
 *   5. Paste everything into your .env file
 */

import emailjs from '@emailjs/browser';

// ── Config pulled from .env ────────────────────────────────────────────────
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string;

export type AlertType =
  | 'SELL_TARGET_HIT'
  | 'STOP_LOSS_HIT'
  | 'TRAILING_STOP_HIT'
  | 'BULL_TARGET_HIT'
  | 'DAILY_SUMMARY';

export interface AlertPayload {
  toEmail: string;
  alertType: AlertType;
  symbol: string;
  company: string;
  triggerPrice: number;   // the price level that was crossed
  currentPrice: number;   // live market price right now
  avgCost: number;
  shares: number;
  gainLoss: number;
  gainLossPct: number;
  portfolioValue: number;
  action: string;         // human-readable recommended action
}

export interface AlertLog {
  id: string;
  timestamp: Date;
  type: AlertType;
  symbol: string;
  triggerPrice: number;
  currentPrice: number;
  sent: boolean;
  emailAddress: string;
  errorMessage?: string;
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function alertTypeLabel(t: AlertType) {
  switch (t) {
    case 'SELL_TARGET_HIT':    return '🎯 Sell Target Reached';
    case 'STOP_LOSS_HIT':      return '🛑 Stop Loss Triggered';
    case 'TRAILING_STOP_HIT':  return '⚠️ Trailing Stop Triggered';
    case 'BULL_TARGET_HIT':    return '🚀 Bull Case Target Hit';
    case 'DAILY_SUMMARY':      return '📊 Daily Portfolio Summary';
    default:                   return 'Price Alert';
  }
}

function actionText(t: AlertType): string {
  switch (t) {
    case 'SELL_TARGET_HIT':   return 'Consider selling at or near this level. Review your position and consult your exit strategy.';
    case 'STOP_LOSS_HIT':     return 'URGENT: Your stop loss has been triggered. Consider exiting this position immediately to limit further losses.';
    case 'TRAILING_STOP_HIT': return 'Your trailing stop has been hit. Review current market conditions and consider reducing exposure.';
    case 'BULL_TARGET_HIT':   return 'Your bull case target has been reached. Consider taking full or partial profits at this level.';
    case 'DAILY_SUMMARY':     return 'Review your portfolio performance for the day.';
  }
}

/**
 * Returns true if EmailJS is configured (all three env vars are set and non-placeholder).
 */
export function isEmailConfigured(): boolean {
  return (
    !!SERVICE_ID  && SERVICE_ID  !== 'your_service_id_here'  &&
    !!TEMPLATE_ID && TEMPLATE_ID !== 'your_template_id_here' &&
    !!PUBLIC_KEY  && PUBLIC_KEY  !== 'your_public_key_here'
  );
}

/**
 * Sends a single price-alert email via EmailJS.
 * Returns an AlertLog entry regardless of success/failure.
 */
export async function sendAlertEmail(payload: AlertPayload): Promise<AlertLog> {
  const timestamp = new Date();
  const log: AlertLog = {
    id: `${payload.symbol}-${payload.alertType}-${Date.now()}`,
    timestamp,
    type: payload.alertType,
    symbol: payload.symbol,
    triggerPrice: payload.triggerPrice,
    currentPrice: payload.currentPrice,
    sent: false,
    emailAddress: payload.toEmail,
  };

  if (!isEmailConfigured()) {
    log.errorMessage = 'EmailJS not configured — add keys to .env file';
    console.warn('[CLARA Alert] EmailJS keys not set. Email NOT sent.', payload);
    return log;
  }

  const templateParams = {
    to_email:       payload.toEmail,
    subject:        `CLARA Alert: ${alertTypeLabel(payload.alertType)} — ${payload.symbol}`,
    alert_type:     alertTypeLabel(payload.alertType),
    symbol:         payload.symbol,
    company:        payload.company,
    trigger_price:  formatCurrency(payload.triggerPrice),
    current_price:  formatCurrency(payload.currentPrice),
    avg_cost:       formatCurrency(payload.avgCost),
    shares:         payload.shares.toString(),
    pct_change:     `${payload.gainLossPct >= 0 ? '+' : ''}${payload.gainLossPct.toFixed(2)}%`,
    gain_loss:      `${payload.gainLoss >= 0 ? '+' : ''}${formatCurrency(payload.gainLoss)}`,
    portfolio_value: formatCurrency(payload.portfolioValue),
    action:         actionText(payload.alertType),
    recommended:    payload.action,
    timestamp:      timestamp.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
    CLARA_version:  'CLARA v1.0 · Clairvoyant Loss Avoidance & Risk Advisor',
  };

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    log.sent = true;
    console.info(`[CLARA Alert] ✅ Email sent → ${payload.toEmail} for ${payload.symbol} ${payload.alertType}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.errorMessage = msg;
    console.error('[CLARA Alert] ❌ Email failed:', msg);
  }

  return log;
}

// ── Alert deduplication ─────────────────────────────────────────────────────
// Prevents the same alert firing more than once per cooldown period.
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

const sentAlerts = new Map<string, number>(); // key → last sent timestamp

export function canSendAlert(symbol: string, type: AlertType): boolean {
  const key = `${symbol}::${type}`;
  const last = sentAlerts.get(key);
  if (!last) return true;
  return Date.now() - last > COOLDOWN_MS;
}

export function markAlertSent(symbol: string, type: AlertType): void {
  const key = `${symbol}::${type}`;
  sentAlerts.set(key, Date.now());
}

export function resetAlertCooldown(symbol: string, type: AlertType): void {
  const key = `${symbol}::${type}`;
  sentAlerts.delete(key);
}

// ── Daily summary ───────────────────────────────────────────────────────────
export async function sendDailySummary(
  toEmail: string,
  portfolioValue: number,
  totalGainLoss: number,
  totalGainLossPct: number,
  dayGainLoss: number,
  topHoldings: { symbol: string; gainLossPct: number }[]
): Promise<AlertLog> {
  const timestamp = new Date();
  const log: AlertLog = {
    id: `SUMMARY-${Date.now()}`,
    timestamp,
    type: 'DAILY_SUMMARY',
    symbol: 'PORTFOLIO',
    triggerPrice: 0,
    currentPrice: portfolioValue,
    sent: false,
    emailAddress: toEmail,
  };

  if (!isEmailConfigured()) {
    log.errorMessage = 'EmailJS not configured';
    return log;
  }

  const topStr = topHoldings
    .slice(0, 5)
    .map(h => `${h.symbol}: ${h.gainLossPct >= 0 ? '+' : ''}${h.gainLossPct.toFixed(1)}%`)
    .join(', ');

  const templateParams = {
    to_email:        toEmail,
    subject:         `CLARA Daily Summary — Portfolio ${totalGainLossPct >= 0 ? '▲' : '▼'} ${Math.abs(totalGainLossPct).toFixed(2)}%`,
    alert_type:      '📊 Daily Portfolio Summary',
    symbol:          'YOUR PORTFOLIO',
    company:         'All Holdings',
    trigger_price:   'N/A',
    current_price:   formatCurrency(portfolioValue),
    avg_cost:        'N/A',
    shares:          'N/A',
    pct_change:      `${totalGainLossPct >= 0 ? '+' : ''}${totalGainLossPct.toFixed(2)}%`,
    gain_loss:       `${totalGainLoss >= 0 ? '+' : ''}${formatCurrency(totalGainLoss)}`,
    portfolio_value: formatCurrency(portfolioValue),
    action:          `Today's P&L: ${dayGainLoss >= 0 ? '+' : ''}${formatCurrency(dayGainLoss)}. Top movers: ${topStr}`,
    recommended:     'Review your positions and adjust targets as needed.',
    timestamp:       timestamp.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }),
    CLARA_version:   'CLARA v1.0 · Clairvoyant Loss Avoidance & Risk Advisor',
  };

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    log.sent = true;
  } catch (err: unknown) {
    log.errorMessage = err instanceof Error ? err.message : String(err);
  }

  return log;
}
