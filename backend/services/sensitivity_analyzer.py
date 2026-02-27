"""
Clara — Sensitivity Analysis Engine
One-factor-at-a-time perturbation analysis for VaR sensitivity.
"""

import logging
from typing import List, Dict, Any
import copy

from models.schemas import (
    EnrichedPosition,
    SensitivityFactor,
    SensitivityResult,
    TornadoDiagramData
)
from services.var_calculator import var_calculator

logger = logging.getLogger(__name__)


class SensitivityAnalyzer:
    """
    Sensitivity analysis engine for portfolio risk metrics.
    
    Analyzes how VaR changes when individual risk factors are perturbed.
    """
    
    def __init__(self):
        self.default_perturbation = 0.20  # ±20%
    
    async def analyze_factor_sensitivity(
        self,
        positions: List[EnrichedPosition],
        factor: SensitivityFactor,
        confidence_level: float = 0.95
    ) -> SensitivityResult:
        """
        Analyze sensitivity of VaR to a single risk factor.
        
        Args:
            positions: Portfolio positions
            factor: Risk factor to perturb
            confidence_level: VaR confidence level
            
        Returns:
            SensitivityResult with VaR impact range
        """
        # Calculate base VaR
        base_multi_var = await var_calculator.compute_multi_var(positions)
        base_var = next(
            (r.var_amount for r in base_multi_var.results 
             if r.confidence_level == confidence_level and r.time_horizon == 1),
            0.0
        )
        
        # Perturb factor down
        positions_low = self._perturb_positions(
            positions, 
            factor.factor_name, 
            -factor.perturbation_range
        )
        low_multi_var = await var_calculator.compute_multi_var(positions_low)
        low_var = next(
            (r.var_amount for r in low_multi_var.results 
             if r.confidence_level == confidence_level and r.time_horizon == 1),
            0.0
        )
        
        # Perturb factor up
        positions_high = self._perturb_positions(
            positions, 
            factor.factor_name, 
            factor.perturbation_range
        )
        high_multi_var = await var_calculator.compute_multi_var(positions_high)
        high_var = next(
            (r.var_amount for r in high_multi_var.results 
             if r.confidence_level == confidence_level and r.time_horizon == 1),
            0.0
        )
        
        # Calculate impact
        impact_range = high_var - low_var
        impact_pct = (impact_range / base_var * 100) if base_var > 0 else 0.0
        
        return SensitivityResult(
            factor_name=factor.factor_name,
            base_var=base_var,
            low_var=low_var,
            high_var=high_var,
            impact_range=abs(impact_range),
            impact_pct=abs(impact_pct)
        )
    
    def _perturb_positions(
        self,
        positions: List[EnrichedPosition],
        factor_name: str,
        perturbation: float
    ) -> List[EnrichedPosition]:
        """
        Create perturbed copy of positions based on factor.
        
        Supported factors:
        - equity_vol: Portfolio volatility
        - correlation: Inter-asset correlation
        - beta: Systematic risk
        - concentration: Position concentration
        """
        perturbed = []
        
        for pos in positions:
            # Create a copy
            pos_dict = pos.model_dump()
            
            if factor_name == 'equity_vol':
                # Perturb beta (proxy for volatility)
                pos_dict['beta'] = pos.beta * (1 + perturbation)
            
            elif factor_name == 'beta':
                # Direct beta perturbation
                pos_dict['beta'] = pos.beta * (1 + perturbation)
            
            elif factor_name == 'correlation':
                # Increase/decrease beta (proxy for correlation)
                pos_dict['beta'] = pos.beta * (1 + perturbation * 0.5)
            
            elif factor_name == 'concentration':
                # Perturb position sizes
                pos_dict['market_value'] = pos.market_value * (1 + perturbation)
            
            elif factor_name == 'rates':
                # Interest rate sensitivity (affects financial stocks more)
                if pos.sector in ['Financial Services', 'Real Estate']:
                    pos_dict['beta'] = pos.beta * (1 + perturbation * 1.5)
                else:
                    pos_dict['beta'] = pos.beta * (1 + perturbation * 0.5)
            
            perturbed.append(EnrichedPosition(**pos_dict))
        
        return perturbed
    
    async def run_full_sensitivity_analysis(
        self,
        positions: List[EnrichedPosition],
        factors: List[str] = None,
        confidence_level: float = 0.95,
        perturbation_range: float = 0.20
    ) -> TornadoDiagramData:
        """
        Run sensitivity analysis for multiple factors.
        
        Args:
            positions: Portfolio positions
            factors: List of factor names (uses default set if None)
            confidence_level: VaR confidence level
            perturbation_range: Perturbation range (±%)
            
        Returns:
            TornadoDiagramData with sorted results
        """
        if factors is None:
            factors = [
                'equity_vol',
                'beta',
                'correlation',
                'concentration',
                'rates'
            ]
        
        # Calculate base VaR
        base_multi_var = await var_calculator.compute_multi_var(positions)
        base_var = next(
            (r.var_amount for r in base_multi_var.results 
             if r.confidence_level == confidence_level and r.time_horizon == 1),
            0.0
        )
        
        # Analyze each factor
        results = []
        for factor_name in factors:
            logger.info(f"Analyzing sensitivity to {factor_name}")
            
            factor = SensitivityFactor(
                factor_name=factor_name,
                base_value=1.0,
                perturbation_range=perturbation_range
            )
            
            result = await self.analyze_factor_sensitivity(
                positions,
                factor,
                confidence_level
            )
            results.append(result)
        
        # Sort by impact (descending)
        results.sort(key=lambda x: x.impact_range, reverse=True)
        
        return TornadoDiagramData(
            portfolio_id="default",
            factors=results,
            base_var=base_var,
            sorted_by_impact=True
        )
    
    def get_factor_description(self, factor_name: str) -> str:
        """Get human-readable description of a risk factor"""
        descriptions = {
            'equity_vol': 'Equity market volatility',
            'beta': 'Systematic risk (beta)',
            'correlation': 'Inter-asset correlation',
            'concentration': 'Position concentration',
            'rates': 'Interest rate sensitivity',
            'credit_spread': 'Credit spread widening',
            'fx': 'Foreign exchange rates',
            'commodity': 'Commodity prices'
        }
        return descriptions.get(factor_name, factor_name)


# Global analyzer instance
sensitivity_analyzer = SensitivityAnalyzer()
