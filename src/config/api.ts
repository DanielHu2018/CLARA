/**
 * CLARA API Configuration
 * Centralized API URL management for easy deployment
 */

// Get API URL from environment variable or default to localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Stocks
  stockQuote: (symbol: string) => `${API_BASE_URL}/api/stocks/quote/${symbol}`,
  stockQuotes: `${API_BASE_URL}/api/stocks/quotes`,
  stockHistory: (symbol: string) => `${API_BASE_URL}/api/stocks/history/${symbol}`,
  stockOverview: (symbol: string) => `${API_BASE_URL}/api/stocks/overview/${symbol}`,
  stockSearch: `${API_BASE_URL}/api/stocks/search`,
  stockNews: `${API_BASE_URL}/api/stocks/news`,
  stockStatus: `${API_BASE_URL}/api/stocks/status`,
  
  // Portfolio
  portfolio: `${API_BASE_URL}/api/portfolio`,
  
  // Alerts
  alerts: `${API_BASE_URL}/api/alerts`,
  
  // Risk
  risk: `${API_BASE_URL}/api/risk`,
  
  // Regime
  regime: `${API_BASE_URL}/api/regime`,
  
  // Hedges
  hedges: `${API_BASE_URL}/api/hedges`,
  
  // Analogs
  analogs: `${API_BASE_URL}/api/analogs`,
  
  // Simulation
  simulation: `${API_BASE_URL}/api/simulation`,
  
  // Audit
  audit: `${API_BASE_URL}/api/audit`,
  
  // Health
  health: `${API_BASE_URL}/api/health`,
  
  // 10-K
  tenK: `${API_BASE_URL}/api/10k`,
  
  // Root
  root: `${API_BASE_URL}/`,
  status: `${API_BASE_URL}/api/status`,
};

export default API_ENDPOINTS;
