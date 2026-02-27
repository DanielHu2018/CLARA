/**
 * CLARA — Multi-Portfolio Manager
 * Supports multiple named portfolios per user.
 * Each user gets their own isolated storage namespace.
 */

import { useState, useCallback } from 'react';

export interface Holding {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  note?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  holdings: Holding[];
}

const PORTFOLIO_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

function storageKey(userId: string) {
  return `CLARA_portfolios_${userId}_v2`;
}

function loadPortfolios(userId: string): Portfolio[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function savePortfolios(userId: string, portfolios: Portfolio[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(portfolios));
  } catch { /* ignore */ }
}

export function useMultiPortfolio(userId: string) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => loadPortfolios(userId));
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(() => {
    const loaded = loadPortfolios(userId);
    return loaded[0]?.id ?? null;
  });

  const persist = useCallback((updated: Portfolio[]) => {
    setPortfolios(updated);
    savePortfolios(userId, updated);
  }, [userId]);

  const createPortfolio = useCallback((name: string, description?: string) => {
    const existing = loadPortfolios(userId);
    const portfolio: Portfolio = {
      id: `port_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: name.trim() || `Portfolio ${existing.length + 1}`,
      description: description?.trim(),
      color: PORTFOLIO_COLORS[existing.length % PORTFOLIO_COLORS.length],
      createdAt: new Date().toISOString(),
      holdings: [],
    };
    const updated = [...existing, portfolio];
    persist(updated);
    setActivePortfolioId(portfolio.id);
    return portfolio.id;
  }, [userId, persist]);

  const deletePortfolio = useCallback((id: string) => {
    const existing = loadPortfolios(userId);
    const updated = existing.filter(p => p.id !== id);
    persist(updated);
    if (activePortfolioId === id) {
      setActivePortfolioId(updated[0]?.id ?? null);
    }
  }, [userId, activePortfolioId, persist]);

  const renamePortfolio = useCallback((id: string, name: string) => {
    const existing = loadPortfolios(userId);
    const updated = existing.map(p => p.id === id ? { ...p, name: name.trim() } : p);
    persist(updated);
  }, [userId, persist]);

  const addHolding = useCallback((portfolioId: string, holding: Holding) => {
    const existing = loadPortfolios(userId);
    const updated = existing.map(p => {
      if (p.id !== portfolioId) return p;
      const dup = p.holdings.find(h => h.symbol === holding.symbol);
      if (dup) {
        const totalShares = dup.shares + holding.shares;
        const avgCost = (dup.shares * dup.avgCost + holding.shares * holding.avgCost) / totalShares;
        return {
          ...p,
          holdings: p.holdings.map(h =>
            h.id === dup.id ? { ...h, shares: totalShares, avgCost: +avgCost.toFixed(4) } : h
          ),
        };
      }
      return { ...p, holdings: [...p.holdings, holding] };
    });
    persist(updated);
  }, [userId, persist]);

  const removeHolding = useCallback((portfolioId: string, holdingId: string) => {
    const existing = loadPortfolios(userId);
    const updated = existing.map(p =>
      p.id === portfolioId
        ? { ...p, holdings: p.holdings.filter(h => h.id !== holdingId) }
        : p
    );
    persist(updated);
  }, [userId, persist]);

  const updateHolding = useCallback((portfolioId: string, holdingId: string, changes: Partial<Holding>) => {
    const existing = loadPortfolios(userId);
    const updated = existing.map(p =>
      p.id === portfolioId
        ? { ...p, holdings: p.holdings.map(h => h.id === holdingId ? { ...h, ...changes } : h) }
        : p
    );
    persist(updated);
  }, [userId, persist]);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) ?? null;

  return {
    portfolios,
    activePortfolioId,
    activePortfolio,
    setActivePortfolioId,
    createPortfolio,
    deletePortfolio,
    renamePortfolio,
    addHolding,
    removeHolding,
    updateHolding,
  };
}
