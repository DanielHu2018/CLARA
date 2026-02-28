import { cn } from '@/utils/cn';
import { useStockData } from '@/hooks/useStockData';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface MarketTickerProps {
  onViewAll?: () => void;
}

export function MarketTicker({ onViewAll }: MarketTickerProps) {
  const { stocks, loading } = useStockData();

  if (loading && stocks.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <RefreshCw size={14} className="animate-spin" />
          Loading live market data...
        </div>
      </div>
    );
  }

  const topMovers = [...stocks]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          <h3 className="text-sm font-semibold text-white">Live Market Data — Top Movers</h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-[10px] font-semibold text-orange-400 hover:text-orange-300 cursor-pointer transition-colors"
          >
            View All Markets →
          </button>
        )}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {topMovers.map(stock => (
          <div
            key={stock.symbol}
            className={cn(
              'rounded-lg border p-2.5 transition-colors',
              stock.changePercent >= 0
                ? 'border-orange-900/30 bg-orange-950/15'
                : 'border-red-900/30 bg-red-950/15'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">{stock.symbol}</span>
              {stock.changePercent >= 0 ? (
                <ArrowUpRight size={12} className="text-orange-400" />
              ) : (
                <ArrowDownRight size={12} className="text-red-400" />
              )}
            </div>
            <div className="text-sm font-bold font-mono text-white">${stock.price.toFixed(2)}</div>
            <div className={cn(
              'text-[10px] font-mono font-semibold mt-0.5',
              stock.changePercent >= 0 ? 'text-orange-400' : 'text-red-400'
            )}>
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{stock.sector}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
