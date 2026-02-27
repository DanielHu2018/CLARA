import { useState, useMemo } from 'react';
import { Filter, AlertTriangle, Info } from 'lucide-react';

interface HeatMapPoint {
  risk_id: string;
  x: number;
  y: number;
  label: string;
  coso_category: string;
  severity: string;
  risk_text: string;
}

interface RiskHeatMapProps {
  data: HeatMapPoint[];
  ticker: string;
  onRiskClick?: (risk: HeatMapPoint) => void;
}

const COSO_CATEGORIES = [
  { value: 'strategic', label: 'Strategic', color: '#f59e0b' },
  { value: 'operational', label: 'Operational', color: '#3b82f6' },
  { value: 'financial', label: 'Financial', color: '#10b981' },
  { value: 'compliance', label: 'Compliance', color: '#8b5cf6' }
];

const SEVERITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444'
};

export function RiskHeatMap({ data, ticker, onRiskClick }: RiskHeatMapProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    COSO_CATEGORIES.map(c => c.value)
  );
  const [selectedRisk, setSelectedRisk] = useState<HeatMapPoint | null>(null);

  const filteredData = useMemo(() => {
    return data.filter(point => selectedCategories.includes(point.coso_category));
  }, [data, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handlePointClick = (point: HeatMapPoint) => {
    setSelectedRisk(point);
    onRiskClick?.(point);
  };


  const severityCounts = useMemo(() => {
    return {
      low: filteredData.filter(p => p.severity === 'low').length,
      medium: filteredData.filter(p => p.severity === 'medium').length,
      high: filteredData.filter(p => p.severity === 'high').length
    };
  }, [filteredData]);

  // Create heat map grid (5x5 cells)
  const heatMapGrid = useMemo(() => {
    const gridSize = 5;
    const cellSize = 100 / gridSize;
    const grid: { x: number; y: number; count: number; risks: HeatMapPoint[]; severity: string }[][] = [];

    // Initialize grid
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = { x: j, y: i, count: 0, risks: [], severity: 'low' };
      }
    }

    // Populate grid with risk data
    filteredData.forEach(point => {
      const cellX = Math.min(Math.floor(point.x / cellSize), gridSize - 1);
      const cellY = Math.min(Math.floor(point.y / cellSize), gridSize - 1);
      grid[cellY][cellX].count++;
      grid[cellY][cellX].risks.push(point);
      
      // Determine cell severity based on position and count
      const avgX = (cellX + 0.5) * cellSize;
      const avgY = (cellY + 0.5) * cellSize;
      const severityScore = (avgX + avgY) / 2;
      
      if (severityScore > 66) grid[cellY][cellX].severity = 'high';
      else if (severityScore > 33) grid[cellY][cellX].severity = 'medium';
      else grid[cellY][cellX].severity = 'low';
    });

    return grid;
  }, [filteredData]);

  const getCellColor = (count: number, severity: string) => {
    if (count === 0) return 'bg-zinc-900/30';
    
    const baseColors = {
      low: 'bg-green-500',
      medium: 'bg-amber-500',
      high: 'bg-red-500'
    };
    
    // Opacity based on count (more risks = more opaque)
    const opacity = Math.min(0.3 + (count * 0.15), 1);
    return `${baseColors[severity as keyof typeof baseColors]}/${Math.round(opacity * 100)}`;
  };

  return (
    <div className="bg-black border border-zinc-900 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Risk Heat Map</h3>
          <p className="text-sm text-zinc-400">{ticker} - Likelihood × Impact Analysis</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Severity Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-zinc-400">Low ({severityCounts.low})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <span className="text-zinc-400">Medium ({severityCounts.medium})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-zinc-400">High ({severityCounts.high})</span>
            </div>
          </div>
        </div>
      </div>

      {/* COSO Category Filters */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-900">
        <Filter className="w-4 h-4 text-zinc-500" />
        <span className="text-sm text-zinc-400 mr-2">Filter by COSO:</span>
        {COSO_CATEGORIES.map(category => (
          <button
            key={category.value}
            onClick={() => toggleCategory(category.value)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedCategories.includes(category.value)
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:border-zinc-800'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Heat Map Grid */}
      <div className="bg-zinc-900/50 rounded-lg p-6">
        <div className="relative">
          {/* Y-axis label */}
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-zinc-400 whitespace-nowrap">
            Impact (%)
          </div>

          {/* Grid */}
          <div className="grid grid-cols-5 gap-1 aspect-square">
            {heatMapGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`relative border border-zinc-800 rounded transition-all hover:border-zinc-600 cursor-pointer group ${getCellColor(cell.count, cell.severity)}`}
                  onClick={() => cell.risks.length > 0 && setSelectedRisk(cell.risks[0])}
                  title={`${cell.count} risk${cell.count !== 1 ? 's' : ''}`}
                >
                  {/* Cell count */}
                  {cell.count > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        {cell.count}
                      </span>
                    </div>
                  )}

                  {/* Hover tooltip */}
                  {cell.count > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-black border border-zinc-700 rounded-lg p-2 shadow-xl min-w-[200px]">
                        <p className="text-xs text-zinc-400 mb-1">
                          Likelihood: {colIndex * 20}-{(colIndex + 1) * 20}% | 
                          Impact: {(4 - rowIndex) * 20}-{(5 - rowIndex) * 20}%
                        </p>
                        <p className="text-sm text-white font-medium">
                          {cell.count} Risk{cell.count !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-1 text-xs text-zinc-500">
                          Click to view details
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            {[0, 20, 40, 60, 80].map((val, idx) => (
              <div key={idx} className="text-center text-xs text-zinc-400">
                {val}%
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-zinc-400 mt-1">
            Likelihood (%)
          </div>

          {/* Y-axis labels */}
          <div className="absolute -left-8 top-0 bottom-12 flex flex-col justify-between text-right">
            {[100, 80, 60, 40, 20, 0].map((val, idx) => (
              <div key={idx} className="text-xs text-zinc-400 -translate-y-1/2">
                {val}%
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Risk Density:</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-zinc-900/30 border border-zinc-800 rounded"></div>
            <span className="text-zinc-400">None</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-green-500/30 border border-zinc-800 rounded"></div>
            <span className="text-zinc-400">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-amber-500/60 border border-zinc-800 rounded"></div>
            <span className="text-zinc-400">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-red-500/90 border border-zinc-800 rounded"></div>
            <span className="text-zinc-400">High</span>
          </div>
        </div>
      </div>

      {/* Selected Risk Detail */}
      {selectedRisk && (
        <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                selectedRisk.severity === 'high' ? 'text-red-400' :
                selectedRisk.severity === 'medium' ? 'text-amber-400' :
                'text-green-400'
              }`} />
              <h4 className="text-sm font-semibold text-white">Risk Detail</h4>
            </div>
            <button
              onClick={() => setSelectedRisk(null)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-zinc-500">Category:</span>
              <span className="ml-2 text-sm text-white capitalize">{selectedRisk.coso_category}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500">Risk Statement:</span>
              <p className="mt-1 text-sm text-zinc-300 leading-relaxed">{selectedRisk.risk_text}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-zinc-800">
              <div>
                <span className="text-xs text-zinc-500">Likelihood</span>
                <p className="text-lg font-semibold text-white">{selectedRisk.x.toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Impact</span>
                <p className="text-lg font-semibold text-white">{selectedRisk.y.toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Severity</span>
                <p className={`text-lg font-semibold capitalize ${
                  selectedRisk.severity === 'high' ? 'text-red-400' :
                  selectedRisk.severity === 'medium' ? 'text-amber-400' :
                  'text-green-400'
                }`}>
                  {selectedRisk.severity}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-zinc-950/50 border border-zinc-900 rounded">
        <Info className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-zinc-500 leading-relaxed">
          Risk positioning based on likelihood of occurrence and potential impact. 
          High severity risks (upper right) require immediate attention and mitigation strategies.
        </p>
      </div>
    </div>
  );
}
