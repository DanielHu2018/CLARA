/**
 * CLARA — Web Scraper Service
 * Scrapes financial news from RSS feeds and converts to ScrapedEvent format
 */

export interface ScrapedEvent {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  relevanceScore: number; // 0-100
  novelty: number; // 0-100
  riskImpact: 'high' | 'medium' | 'low';
  sectors: string[];
  entities: {
    tickers: string[];
    orgs: string[];
    geos: string[];
    instruments: string[];
  };
  aiSummary?: string;
  processed: boolean;
}

// Stub implementation - converts mock events to ScrapedEvent format
export function scrapeFinancialNews(): Promise<ScrapedEvent[]> {
  // This would normally scrape RSS feeds, but for now returns empty array
  // The useDailyDigest hook will handle converting mock data
  return Promise.resolve([]);
}
