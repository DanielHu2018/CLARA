import { API_BASE_URL } from '@/config/api';

export interface AIAnalysisResult {
  summary: string;
  confidence: number;
  key_risks: string[];
  recommended_actions: string[];
  assumptions: string[];
  missing_data: string[];
  needs_review: boolean;
  provider: string;
}

const API_BASE = API_BASE_URL;

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchHedgeAIAnalysis(): Promise<AIAnalysisResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/hedges/analysis`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await safeJson<AIAnalysisResult>(res);
  } catch {
    return null;
  }
}

export async function fetchPortfolioAIAnalysis(payload: Record<string, unknown>): Promise<AIAnalysisResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/portfolio/analysis-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await safeJson<AIAnalysisResult>(res);
  } catch {
    return null;
  }
}
