import { useState } from 'react';
import { Search, FileText, TrendingUp, AlertCircle, Download, ExternalLink, Loader2 } from 'lucide-react';
import { RiskHeatMap } from '../components/RiskHeatMap';

interface TenKRisk {
  risk_id: string;
  company_ticker: string;
  filing_date: string;
  fiscal_year: number;
  risk_text: string;
  coso_classifications: string[];
  likelihood: number;
  impact: number;
  severity?: string;
  is_new_risk: boolean;
}

interface HeatMapPoint {
  risk_id: string;
  x: number;
  y: number;
  label: string;
  coso_category: string;
  severity: string;
  risk_text: string;
}

export function TenKAnalysisPage() {
  const [ticker, setTicker] = useState('');
  const [year, setYear] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [risks, setRisks] = useState<TenKRisk[]>([]);
  const [heatMapData, setHeatMapData] = useState<HeatMapPoint[]>([]);
  const [filingInfo, setFilingInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'heatmap'>('table');

  const handleAnalyze = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setRisks([]);
    setHeatMapData([]);
    setFilingInfo(null);

    try {
      const yearParam = year ? `?year=${year}` : '';
      const response = await fetch(`http://localhost:8000/api/10k/analyze${yearParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), year: year ? parseInt(year) : null })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze 10-K');
      }

      const data = await response.json();
      setFilingInfo({
        ticker: data.ticker,
        fiscal_year: data.fiscal_year,
        filing_date: data.filing_date,
        document_url: data.document_url,
        risks_count: data.risks_count
      });
      setRisks(data.risks);

      // Fetch heat map data
      await fetchHeatMap(data.ticker, data.fiscal_year);

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchHeatMap = async (tickerSymbol: string, fiscalYear: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/10k/heat-map/${tickerSymbol}?year=${fiscalYear}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setHeatMapData(data.points || []);
      }
    } catch (err) {
      console.error('Failed to fetch heat map:', err);
    }
  };

  const getSeverityColor = (likelihood: number, impact: number) => {
    const score = (likelihood * impact) / 10000;
    if (score >= 0.67) return 'text-red-400 bg-red-950/30';
    if (score >= 0.33) return 'text-amber-400 bg-amber-950/30';
    return 'text-green-400 bg-green-950/30';
  };

  const getSeverityLabel = (likelihood: number, impact: number) => {
    const score = (likelihood * impact) / 10000;
    if (score >= 0.67) return 'High';
    if (score >= 0.33) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">10-K Risk Analysis</h1>
        <p className="text-zinc-400">
          Analyze SEC 10-K filings to extract and classify risk factors using AI
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-black border border-zinc-900 rounded-lg p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Company Ticker
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="e.g., AAPL, MSFT, NVDA"
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Fiscal Year (Optional)
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2024"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !ticker.trim()}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded font-medium transition-colors flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Analyze 10-K
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900 rounded flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Filing Info */}
      {filingInfo && (
        <div className="bg-black border border-zinc-900 rounded-lg p-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Company</p>
              <p className="text-lg font-semibold text-white">{filingInfo.ticker}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Fiscal Year</p>
              <p className="text-lg font-semibold text-white">{filingInfo.fiscal_year}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Filing Date</p>
              <p className="text-lg font-semibold text-white">
                {new Date(filingInfo.filing_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">Risks Identified</p>
              <p className="text-lg font-semibold text-green-400">{filingInfo.risks_count}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-900">
            <a
              href={filingInfo.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Original 10-K Filing on SEC.gov
            </a>
          </div>
        </div>
      )}

      {/* Results */}
      {risks.length > 0 && (
        <div className="bg-black border border-zinc-900 rounded-lg">
          {/* Tabs */}
          <div className="border-b border-zinc-900 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('table')}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'table'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Risk Table
              </button>
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'heatmap'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Heat Map
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'table' && (
              <div className="space-y-3">
                {risks.map((risk, index) => (
                  <div
                    key={risk.risk_id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-zinc-500">#{index + 1}</span>
                        <div className="flex gap-2">
                          {risk.coso_classifications.map(cat => (
                            <span
                              key={cat}
                              className="px-2 py-1 text-xs font-medium bg-zinc-800 text-zinc-300 rounded capitalize"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                        {risk.is_new_risk && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-950/30 text-green-400 rounded">
                            AI Generated
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded ${
                        getSeverityColor(risk.likelihood * 100, risk.impact * 100)
                      }`}>
                        {getSeverityLabel(risk.likelihood * 100, risk.impact * 100)} Risk
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                      {risk.risk_text}
                    </p>
                    <div className="flex items-center gap-6 text-xs text-zinc-500">
                      <div>
                        <span>Likelihood:</span>
                        <span className="ml-2 text-white font-medium">
                          {(risk.likelihood * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span>Impact:</span>
                        <span className="ml-2 text-white font-medium">
                          {(risk.impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'heatmap' && heatMapData.length > 0 && (
              <RiskHeatMap
                data={heatMapData}
                ticker={filingInfo.ticker}
              />
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analyzing && risks.length === 0 && !error && (
        <div className="bg-black border border-zinc-900 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Analysis Yet</h3>
          <p className="text-zinc-500 max-w-md mx-auto">
            Enter a company ticker above to analyze their most recent 10-K filing and extract risk factors.
          </p>
        </div>
      )}
    </div>
  );
}
