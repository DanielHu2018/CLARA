/**
 * CLARA — Web Scraper Service
 * Scrapes financial news from RSS feeds and news APIs, converts to ScrapedEvent format
 * 
 * API Keys Required:
 * - VITE_NEWS_API_KEY: For NewsAPI (https://newsapi.org/register) - Free: 100 req/day
 * - VITE_ALPHA_VANTAGE_API_KEY: For Alpha Vantage News Sentiment - Free: 25 req/day
 * 
 * Optional Web Scraping Services (for direct RSS scraping):
 * - ScraperAPI: https://www.scraperapi.com - Free: 1,000 req/month
 * - ScrapingBee: https://www.scrapingbee.com - Free: 1,000 req/month
 */

import { fetchNews } from './newsService';

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

// RSS Feed URLs for financial news (no API key required, but CORS may be an issue)
const RSS_FEEDS = [
  'https://feeds.reuters.com/reuters/businessNews',
  'https://feeds.bloomberg.com/markets/news.rss',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  'https://feeds.marketwatch.com/marketwatch/marketsheadlines/',
];

/**
 * Scrapes financial news from RSS feeds and news APIs
 * Falls back to NewsAPI/Alpha Vantage if RSS scraping fails due to CORS
 */
export async function scrapeFinancialNews(): Promise<ScrapedEvent[]> {
  try {
    // Try to fetch from NewsAPI/Alpha Vantage first (has sentiment built-in)
    const { items, source } = await fetchNews();
    
    if (items.length > 0) {
      return items.map((item, i) => convertNewsItemToScrapedEvent(item, i));
    }
    
    // If APIs fail, try RSS feeds (may fail due to CORS in browser)
    // In production, this should be done server-side
    const rssEvents = await scrapeRSSFeeds();
    if (rssEvents.length > 0) return rssEvents;
    
    return [];
  } catch (error) {
    console.error('[WebScraper] Failed to scrape news:', error);
    return [];
  }
}

/**
 * Converts NewsItem to ScrapedEvent format
 */
function convertNewsItemToScrapedEvent(item: {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  relevance: number;
  tickers: string[];
  category: string;
}, index: number): ScrapedEvent {
  const riskImpact: 'high' | 'medium' | 'low' = 
    item.relevance >= 85 ? 'high' :
    item.relevance >= 70 ? 'medium' : 'low';

  return {
    id: item.id || `scraped-${index}-${Date.now()}`,
    title: item.title,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    category: item.category.toLowerCase() || 'market',
    sentiment: item.sentiment,
    sentimentScore: item.sentimentScore,
    relevanceScore: item.relevance,
    novelty: 50 + Math.floor(Math.random() * 50), // Placeholder - would need NLP analysis
    riskImpact,
    sectors: extractSectors(item.title, item.category),
    entities: {
      tickers: item.tickers || [],
      orgs: extractOrganizations(item.title),
      geos: extractGeographies(item.title),
      instruments: [],
    },
    processed: false,
  };
}

/**
 * Attempts to scrape RSS feeds (may fail due to CORS in browser)
 * In production, this should be done server-side via backend API
 */
async function scrapeRSSFeeds(): Promise<ScrapedEvent[]> {
  // Note: Direct RSS scraping from browser will likely fail due to CORS
  // This should be implemented as a backend endpoint that proxies RSS feeds
  // For now, return empty array - the useDailyDigest hook uses mock data
  return [];
}

// Helper functions for entity extraction
function extractSectors(title: string, category: string): string[] {
  const sectors: string[] = [];
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('tech') || titleLower.includes('semiconductor') || titleLower.includes('ai')) {
    sectors.push('Technology');
  }
  if (titleLower.includes('bank') || titleLower.includes('financial') || titleLower.includes('credit')) {
    sectors.push('Financials');
  }
  if (titleLower.includes('oil') || titleLower.includes('energy') || titleLower.includes('crude')) {
    sectors.push('Energy');
  }
  if (titleLower.includes('fed') || titleLower.includes('rate') || titleLower.includes('inflation')) {
    sectors.push('Rates');
  }
  if (titleLower.includes('china') || titleLower.includes('trade') || titleLower.includes('tariff')) {
    sectors.push('Geopolitical');
  }
  
  return sectors.length > 0 ? sectors : ['Markets'];
}

function extractOrganizations(text: string): string[] {
  const orgs: string[] = [];
  const knownOrgs = ['Fed', 'ECB', 'OPEC', 'SEC', 'FDA', 'Treasury', 'Commerce'];
  knownOrgs.forEach(org => {
    if (text.toLowerCase().includes(org.toLowerCase())) {
      orgs.push(org);
    }
  });
  return orgs;
}

function extractGeographies(text: string): string[] {
  const geos: string[] = [];
  const knownGeos = ['US', 'China', 'Europe', 'Taiwan', 'Japan', 'UK', 'Middle East'];
  knownGeos.forEach(geo => {
    if (text.toLowerCase().includes(geo.toLowerCase())) {
      geos.push(geo);
    }
  });
  return geos;
}
