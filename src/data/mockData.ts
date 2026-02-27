// ── Mock Data for CLARA Dashboard ──

export interface CLARAEvent {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  relevanceScore: number;
  sentiment: number; // -1 to 1
  novelty: number; // 0-100
  sectors: string[];
  status: 'new' | 'processing' | 'translated' | 'simulated';
  category: 'geopolitical' | 'macro' | 'earnings' | 'policy' | 'commodity' | 'credit';
}

export interface ShockScenario {
  factor: string;
  baseCase: number;
  adverseCase: number;
  severeCase: number;
  confidence: number;
  probability: number;
  analogRef: string;
}

export interface PortfolioImpact {
  metric: string;
  current: number;
  stressed: number;
  change: number;
  breached: boolean;
  limit: number;
}

export interface HedgeRecommendation {
  instrument: string;
  type: string;
  notional: string;
  cost: string;
  effectiveness: number;
  residualTail: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RegimeState {
  label: string;
  vixPercentile: number;
  movePercentile: number;
  creditSpread: number;
  liquidityScore: number;
  correlationCluster: number;
  shockMultiplier: number;
}

export interface HistoricalAnalog {
  name: string;
  date: string;
  semanticSim: number;
  structuralSim: number;
  marketSim: number;
  overallScore: number;
  spxShock: number;
  vixShock: number;
}

export interface AuditEntry {
  timestamp: string;
  component: string;
  action: string;
  confidence: number;
  status: 'pass' | 'warning' | 'flag';
}

export const liveEvents: CLARAEvent[] = [
  { id: 'EVT-001', title: 'China announces retaliatory tariffs on US semiconductor exports', source: 'Reuters', timestamp: '2 min ago', relevanceScore: 94, sentiment: -0.82, novelty: 88, sectors: ['Technology', 'Semiconductors'], status: 'simulated', category: 'geopolitical' },
  { id: 'EVT-002', title: 'ECB signals potential emergency rate cut amid bank stress', source: 'Bloomberg', timestamp: '8 min ago', relevanceScore: 89, sentiment: -0.65, novelty: 76, sectors: ['Financials', 'Euro Sovereign'], status: 'translated', category: 'policy' },
  { id: 'EVT-003', title: 'Taiwan Strait military exercises escalate — shipping lanes disrupted', source: 'SCMP', timestamp: '14 min ago', relevanceScore: 97, sentiment: -0.91, novelty: 95, sectors: ['Supply Chain', 'Semiconductors', 'Energy'], status: 'processing', category: 'geopolitical' },
  { id: 'EVT-004', title: 'US CPI prints 5.2% — above consensus of 4.8%', source: 'BLS', timestamp: '22 min ago', relevanceScore: 86, sentiment: -0.55, novelty: 62, sectors: ['Rates', 'Real Estate'], status: 'simulated', category: 'macro' },
  { id: 'EVT-005', title: 'Major European bank reports unexpected trading losses', source: 'FT', timestamp: '31 min ago', relevanceScore: 78, sentiment: -0.72, novelty: 71, sectors: ['Financials', 'Credit'], status: 'translated', category: 'credit' },
  { id: 'EVT-006', title: 'OPEC+ extends production cuts through Q2 2025', source: 'OPEC', timestamp: '45 min ago', relevanceScore: 72, sentiment: 0.15, novelty: 41, sectors: ['Energy', 'Commodities'], status: 'simulated', category: 'commodity' },
  { id: 'EVT-007', title: 'Fed Governor hints at yield curve control if recession deepens', source: 'CNBC', timestamp: '1h ago', relevanceScore: 81, sentiment: -0.38, novelty: 84, sectors: ['Rates', 'Equity'], status: 'simulated', category: 'policy' },
  { id: 'EVT-008', title: 'Japan intervenes in FX market — USD/JPY drops 3%', source: 'Nikkei', timestamp: '1h 15m ago', relevanceScore: 75, sentiment: -0.42, novelty: 58, sectors: ['FX', 'Asia Equity'], status: 'simulated', category: 'macro' },
];

export const shockMatrix: ShockScenario[] = [
  { factor: 'S&P 500', baseCase: -2.1, adverseCase: -5.8, severeCase: -9.4, confidence: 78, probability: 0.35, analogRef: 'US-China Trade War 2018' },
  { factor: 'US 10Y Yield', baseCase: 0.15, adverseCase: 0.42, severeCase: 0.68, confidence: 72, probability: 0.28, analogRef: 'Taper Tantrum 2013' },
  { factor: 'VIX', baseCase: 8.5, adverseCase: 18.2, severeCase: 32.0, confidence: 81, probability: 0.40, analogRef: 'COVID Shock 2020' },
  { factor: 'EUR/USD', baseCase: -0.8, adverseCase: -2.4, severeCase: -4.1, confidence: 65, probability: 0.22, analogRef: 'Euro Crisis 2011' },
  { factor: 'Crude Oil (WTI)', baseCase: 4.2, adverseCase: 12.5, severeCase: 22.0, confidence: 70, probability: 0.30, analogRef: 'Gulf War 1990' },
  { factor: 'IG Credit Spread', baseCase: 15, adverseCase: 45, severeCase: 85, confidence: 74, probability: 0.25, analogRef: 'March 2020 Credit' },
  { factor: 'USD/JPY', baseCase: -1.2, adverseCase: -3.5, severeCase: -5.8, confidence: 68, probability: 0.20, analogRef: 'BOJ Intervention 2022' },
  { factor: 'SOX Index', baseCase: -4.5, adverseCase: -12.0, severeCase: -20.5, confidence: 82, probability: 0.38, analogRef: 'Chip Embargo 2022' },
];

export const portfolioImpact: PortfolioImpact[] = [
  { metric: '1-Day VaR (95%)', current: 12.4, stressed: 28.7, change: 131.5, breached: true, limit: 25.0 },
  { metric: '10-Day VaR (99%)', current: 38.2, stressed: 72.1, change: 88.7, breached: true, limit: 65.0 },
  { metric: 'Expected Shortfall', current: 18.6, stressed: 45.3, change: 143.5, breached: true, limit: 40.0 },
  { metric: 'Tail Loss Prob (>3σ)', current: 2.1, stressed: 8.4, change: 300.0, breached: true, limit: 5.0 },
  { metric: 'Max Drawdown', current: 4.2, stressed: 11.8, change: 180.9, breached: false, limit: 15.0 },
  { metric: 'Incremental VaR', current: 3.1, stressed: 9.4, change: 203.2, breached: false, limit: 10.0 },
];

export const hedgeRecommendations: HedgeRecommendation[] = [
  { instrument: 'SPX Put Spread 4200/4000', type: 'Options', notional: '$45M', cost: '$1.2M', effectiveness: 82, residualTail: 3.2, priority: 'high' },
  { instrument: 'ES Mini Futures Short', type: 'Futures', notional: '$30M', cost: '$85K', effectiveness: 71, residualTail: 5.1, priority: 'high' },
  { instrument: 'CDX IG Protection', type: 'Credit Index', notional: '$25M', cost: '$340K', effectiveness: 68, residualTail: 4.8, priority: 'medium' },
  { instrument: 'USD/JPY Forward', type: 'FX Forward', notional: '$15M', cost: '$120K', effectiveness: 58, residualTail: 6.2, priority: 'medium' },
  { instrument: 'SMH Put (Semi ETF)', type: 'Options', notional: '$20M', cost: '$890K', effectiveness: 76, residualTail: 3.9, priority: 'high' },
  { instrument: 'TLT Call Spread', type: 'Options', notional: '$10M', cost: '$210K', effectiveness: 52, residualTail: 7.1, priority: 'low' },
];

export const currentRegime: RegimeState = {
  label: 'Crisis Contagion',
  vixPercentile: 92,
  movePercentile: 87,
  creditSpread: 185,
  liquidityScore: 34,
  correlationCluster: 0.78,
  shockMultiplier: 1.85,
};

export const historicalAnalogs: HistoricalAnalog[] = [
  { name: 'US-China Trade War', date: 'Sep 2018', semanticSim: 0.92, structuralSim: 0.85, marketSim: 0.78, overallScore: 0.87, spxShock: -6.8, vixShock: 45.2 },
  { name: 'COVID Market Crash', date: 'Mar 2020', semanticSim: 0.68, structuralSim: 0.72, marketSim: 0.91, overallScore: 0.76, spxShock: -33.9, vixShock: 285.0 },
  { name: 'Chip Export Ban', date: 'Oct 2022', semanticSim: 0.88, structuralSim: 0.90, marketSim: 0.74, overallScore: 0.84, spxShock: -4.2, vixShock: 22.1 },
  { name: 'Taper Tantrum', date: 'May 2013', semanticSim: 0.55, structuralSim: 0.61, marketSim: 0.68, overallScore: 0.61, spxShock: -5.6, vixShock: 38.5 },
  { name: 'Euro Debt Crisis', date: 'Nov 2011', semanticSim: 0.48, structuralSim: 0.52, marketSim: 0.65, overallScore: 0.54, spxShock: -19.4, vixShock: 115.0 },
];

export const auditTrail: AuditEntry[] = [
  { timestamp: '14:32:01', component: 'Event Intelligence', action: 'EVT-003 classified as geopolitical — relevance 97%', confidence: 97, status: 'pass' },
  { timestamp: '14:32:18', component: 'NFTE', action: 'Shock vector generated — 8 factors affected', confidence: 81, status: 'pass' },
  { timestamp: '14:32:22', component: 'Analog Engine', action: 'Top analog: US-China Trade War 2018 (sim=0.87)', confidence: 87, status: 'pass' },
  { timestamp: '14:32:25', component: 'Regime Engine', action: 'Regime: Crisis Contagion — multiplier 1.85x', confidence: 92, status: 'warning' },
  { timestamp: '14:32:44', component: 'Risk Engine', action: '100K MC paths completed — 4 limit breaches', confidence: 88, status: 'flag' },
  { timestamp: '14:32:58', component: 'Hedge Engine', action: '6 hedge proposals — total cost $2.8M', confidence: 76, status: 'pass' },
  { timestamp: '14:33:01', component: 'Governance', action: 'Audit packet generated — SR 11-7 compliant', confidence: 95, status: 'pass' },
  { timestamp: '14:33:05', component: 'Bayesian Update', action: 'Posterior shock distribution updated (EVT-001 + EVT-003)', confidence: 82, status: 'pass' },
];

export const varTimeSeries = [
  { time: '09:30', var95: 12.4, var99: 38.2, es: 18.6, limit: 25 },
  { time: '10:00', var95: 13.1, var99: 39.8, es: 19.2, limit: 25 },
  { time: '10:30', var95: 14.8, var99: 42.1, es: 21.5, limit: 25 },
  { time: '11:00', var95: 16.2, var99: 45.6, es: 24.1, limit: 25 },
  { time: '11:30', var95: 18.9, var99: 50.2, es: 28.4, limit: 25 },
  { time: '12:00', var95: 20.4, var99: 54.8, es: 31.2, limit: 25 },
  { time: '12:30', var95: 22.1, var99: 58.3, es: 34.7, limit: 25 },
  { time: '13:00', var95: 24.8, var99: 62.1, es: 38.5, limit: 25 },
  { time: '13:30', var95: 26.3, var99: 66.4, es: 41.2, limit: 25 },
  { time: '14:00', var95: 27.5, var99: 69.8, es: 43.8, limit: 25 },
  { time: '14:30', var95: 28.7, var99: 72.1, es: 45.3, limit: 25 },
];

export const riskContributors = [
  { name: 'NVDA', contribution: 18.2, sector: 'Semiconductors' },
  { name: 'AAPL', contribution: 12.4, sector: 'Technology' },
  { name: 'US 10Y', contribution: 11.8, sector: 'Rates' },
  { name: 'JPM', contribution: 8.6, sector: 'Financials' },
  { name: 'EUR/USD', contribution: 7.2, sector: 'FX' },
  { name: 'CDX IG', contribution: 6.9, sector: 'Credit' },
  { name: 'XOM', contribution: 5.4, sector: 'Energy' },
  { name: 'TSMC', contribution: 5.1, sector: 'Semiconductors' },
];

export const monteCarloDistribution = [
  { bin: '-15%+', count: 120, cumProb: 0.12 },
  { bin: '-12%', count: 280, cumProb: 2.92 },
  { bin: '-10%', count: 520, cumProb: 8.12 },
  { bin: '-8%', count: 1200, cumProb: 20.12 },
  { bin: '-6%', count: 2800, cumProb: 48.12 },
  { bin: '-4%', count: 4200, cumProb: 90.12 },
  { bin: '-2%', count: 3500, cumProb: 125.12 },
  { bin: '0%', count: 2100, cumProb: 146.12 },
  { bin: '+2%', count: 800, cumProb: 154.12 },
  { bin: '+4%', count: 280, cumProb: 156.92 },
  { bin: '+6%+', count: 100, cumProb: 157.92 },
];

export const correlationData = [
  { x: 'SPX', y: 'NDX', normal: 0.85, stressed: 0.96 },
  { x: 'SPX', y: 'HYG', normal: 0.62, stressed: 0.89 },
  { x: 'SPX', y: 'UST', normal: -0.35, stressed: -0.12 },
  { x: 'SPX', y: 'VIX', normal: -0.78, stressed: -0.92 },
  { x: 'NDX', y: 'SOX', normal: 0.88, stressed: 0.97 },
  { x: 'HYG', y: 'CDX', normal: -0.72, stressed: -0.91 },
];

export const systemMetrics = {
  eventsProcessed: 1247,
  avgLatency: '4.2 min',
  uptime: '99.97%',
  modelsValidated: 312,
  activeAlerts: 4,
  lastCycleTime: '5:42',
  mcPaths: '100K',
  regimeChanges: 3,
};
