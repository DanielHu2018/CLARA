/**
 * CLARA — Portfolio Context
 * Shares selected portfolio holdings across all tabs
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgCost: number;
}

interface PortfolioContextType {
  selectedHoldings: PortfolioHolding[];
  setSelectedHoldings: (holdings: PortfolioHolding[]) => void;
  getSelectedSymbols: () => string[];
  hasSelections: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [selectedHoldings, setSelectedHoldings] = useState<PortfolioHolding[]>([]);

  const getSelectedSymbols = useCallback(() => {
    return selectedHoldings.map(h => h.symbol);
  }, [selectedHoldings]);

  const hasSelections = selectedHoldings.length > 0;

  return (
    <PortfolioContext.Provider value={{
      selectedHoldings,
      setSelectedHoldings,
      getSelectedSymbols,
      hasSelections,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within PortfolioProvider');
  }
  return context;
}
