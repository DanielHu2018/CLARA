/**
 * CLARA — Daily Digest Hook
 * Manages AI digest agent configuration and web scraping
 */

import { useState, useCallback, useEffect } from 'react';
import { liveEvents } from '@/data/mockData';
import type { ScrapedEvent } from '@/services/webScraperService';
import { scrapeFinancialNews } from '@/services/webScraperService';

export interface DigestConfig {
  enabled: boolean;
  recipientEmail: string;
  sendTime: string;
  timezone: string;
  minRelevanceScore: number;
  includeHighRiskOnly: boolean;
}

export interface DigestLog {
  id: string;
  recipient: string;
  eventCount: number;
  highRiskCount: number;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  trigger: 'scheduled' | 'manual';
  error?: string;
}

const DEFAULT_CONFIG: DigestConfig = {
  enabled: false,
  recipientEmail: '',
  sendTime: '08:00',
  timezone: 'EST',
  minRelevanceScore: 70,
  includeHighRiskOnly: false,
};

const CONFIG_KEY = 'CLARA_digest_config_v1';
const LOGS_KEY = 'CLARA_digest_logs_v1';

function loadConfig(): DigestConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

function saveConfig(c: DigestConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  } catch {}
}

function loadLogs(): DigestLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLogs(logs: DigestLog[]) {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch {}
}

// Convert CLARAEvent to ScrapedEvent
function convertToScrapedEvent(event: typeof liveEvents[0]): ScrapedEvent {
  const riskImpact: 'high' | 'medium' | 'low' = 
    event.relevanceScore >= 90 ? 'high' :
    event.relevanceScore >= 75 ? 'medium' : 'low';
  
  const sentiment: 'positive' | 'negative' | 'neutral' =
    event.sentiment > 0.1 ? 'positive' :
    event.sentiment < -0.1 ? 'negative' : 'neutral';

  return {
    id: event.id,
    title: event.title,
    source: event.source,
    url: '#',
    publishedAt: new Date().toISOString(),
    category: event.category,
    sentiment,
    sentimentScore: event.sentiment,
    relevanceScore: event.relevanceScore,
    novelty: event.novelty,
    riskImpact,
    sectors: event.sectors,
    entities: {
      tickers: [],
      orgs: [],
      geos: [],
      instruments: [],
    },
    processed: event.status === 'simulated',
  };
}

export function useDailyDigest() {
  const [config, setConfig] = useState<DigestConfig>(loadConfig);
  const [logs, setLogs] = useState<DigestLog[]>(loadLogs);
  const [events, setEvents] = useState<ScrapedEvent[]>([]);
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [scrapeSource, setScrapeSource] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const updateConfig = useCallback((updates: Partial<DigestConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const runScrape = useCallback(async () => {
    setScraping(true);
    setScrapeStatus('idle');
    
    try {
      // Try to scrape real news first
      const scraped = await scrapeFinancialNews();
      
      if (scraped.length > 0) {
        setEvents(scraped);
        setScrapeSource('NewsAPI / Alpha Vantage');
        setScrapeStatus('done');
      } else {
        // Fallback to mock data if scraping fails or no API keys
        const mockScraped = liveEvents.map(convertToScrapedEvent);
        setEvents(mockScraped);
        setScrapeSource('CLARA Mock Feed (No API keys configured)');
        setScrapeStatus('done');
      }
    } catch (error) {
      console.error('[useDailyDigest] Scraping failed:', error);
      // Fallback to mock data on error
      const mockScraped = liveEvents.map(convertToScrapedEvent);
      setEvents(mockScraped);
      setScrapeSource('CLARA Mock Feed (Error)');
      setScrapeStatus('error');
    } finally {
      setScraping(false);
    }
  }, []);

  const sendDigest = useCallback(async (trigger: 'scheduled' | 'manual') => {
    if (!config.recipientEmail) return;
    
    setSending(true);
    const filtered = events.filter(e => {
      if (config.includeHighRiskOnly && e.riskImpact !== 'high') return false;
      return e.relevanceScore >= config.minRelevanceScore;
    });

    const log: DigestLog = {
      id: Date.now().toString(),
      recipient: config.recipientEmail,
      eventCount: filtered.length,
      highRiskCount: filtered.filter(e => e.riskImpact === 'high').length,
      sentAt: new Date().toISOString(),
      status: 'sent',
      trigger,
    };

    // Simulate email send
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setLogs(prev => {
      const updated = [log, ...prev].slice(0, 50);
      saveLogs(updated);
      return updated;
    });
    setLastSent(log.sentAt);
    setSending(false);
  }, [config, events]);

  const isEmailConfigured = Boolean(
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  );

  return {
    config,
    updateConfig,
    logs,
    events,
    scraping,
    runScrape,
    scrapeStatus,
    scrapeSource,
    sending,
    lastSent,
    isEmailConfigured,
    sendDigest,
  };
}
