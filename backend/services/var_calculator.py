"""
Clara — Enhanced VaR/ES Calculator
Supports multiple distributions, configurable confidence levels, and Watson AI recommendations.
"""

import math
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from scipy import stats
from datetime import datetime

from models.schemas import (
    EnrichedPosition,
    VaRConfig,
    VaRResult,
    MultiVaRResult,
    DistributionType
)
from config import settings
from services.watsonx_service import watsonx_service

logger = logging.getLogger(__name__)


class VaRCalculator:
    """
    Enhanced VaR/ES calculator with:
    - Multiple probability distributions
    - Configurable confidence levels
    - Watson AI distribution recommendation
    - Statistical tests for distribution fitting
    """
    
    def __init__(self):
        self.default_confidence_levels = settings.VAR_CONFIDENCE_LEVELS
        self.default_time_horizons = settings.VAR_TIME_HORIZONS
    
    def calculate_portfolio_returns(
        self, 
        positions: List[EnrichedPosition]
    ) -> Tuple[float, float, float]:
        """
        Calculate portfolio-level statistics.
        
        Returns:
            Tuple of (total_value, portfolio_beta, daily_volatility)
        """
        total_value = sum(p.market_value for p in positions)
        if not total_value:
            return 0.0, 1.0, 0.0126
        
        portfolio_beta = sum(p.beta * p.market_value for p in positions) / total_value
        
        # Daily volatility (annualized 20% → daily ~1.26%)
        daily_vol = 0.0126 * portfolio_beta
        
        return total_value, portfolio_beta, daily_vol
    
    def run_statistical_tests(
        self, 
        returns: List[float]
    ) -> Dict[str, Any]:
        """
        Run statistical tests on return data to determine distribution fit.
        
        Tests:
        - Jarque-Bera (normality)
        - Shapiro-Wilk (normality)
        - Kurtosis (fat tails)
        - Skewness (asymmetry)
        
        Returns:
            Dictionary of test results
        """
        if len(returns) < 20:
            logger.warning("Insufficient data for statistical tests")
            return {
                "sample_size": len(returns),
                "sufficient_data": False
            }
        
        returns_array = np.array(returns)
        
        # Normality tests
        try:
            jb_stat, jb_pvalue = stats.jarque_bera(returns_array)
            sw_stat, sw_pvalue = stats.shapiro(returns_array)
        except Exception as e:
            logger.error(f"Error in normality tests: {e}")
            jb_pvalue = sw_pvalue = 0.5
        
        # Moments
        kurtosis = stats.kurtosis(returns_array)
        skewness = stats.skew(returns_array)
        
        # Interpretation
        is_normal = (jb_pvalue > 0.05 and sw_pvalue > 0.05)
        has_fat_tails = (kurtosis > 1.0)
        is_skewed = (abs(skewness) > 0.5)
        
        return {
            "sample_size": len(returns),
            "sufficient_data": True,
            "normality_pvalue": float(jb_pvalue),
            "shapiro_pvalue": float(sw_pvalue),
            "kurtosis": float(kurtosis),
            "skewness": float(skewness),
            "is_normal": is_normal,
            "has_fat_tails": has_fat_tails,
            "is_skewed": is_skewed,
            "mean": float(np.mean(returns_array)),
            "std": float(np.std(returns_array))
        }
    
    async def select_distribution(
        self,
        returns: List[float],
        use_watson: bool = True
    ) -> Tuple[DistributionType, Dict[str, Any]]:
        """
        Select optimal distribution based on statistical tests and Watson AI.
        
        Returns:
            Tuple of (DistributionType, recommendation_details)
        """
        # Run statistical tests
        tests = self.run_statistical_tests(returns)
        
        if not tests.get('sufficient_data'):
            return DistributionType.NORMAL, {
                "distribution": "normal",
                "rationale": "Insufficient data for distribution fitting",
                "confidence": 0.5
            }
        
        # Rule-based selection
        if tests['is_normal'] and not tests['has_fat_tails']:
            rule_based = DistributionType.NORMAL
        elif tests['has_fat_tails']:
            rule_based = DistributionType.STUDENT_T
        elif tests['is_skewed'] and tests['skewness'] > 0:
            rule_based = DistributionType.LOGNORMAL
        else:
            rule_based = DistributionType.NORMAL
        
        # Use Watson AI if enabled
        if use_watson and watsonx_service.enabled:
            try:
                watson_rec = await watsonx_service.recommend_distribution(
                    returns, 
                    tests
                )
                
                # Convert Watson recommendation to DistributionType
                dist_map = {
                    'normal': DistributionType.NORMAL,
                    'student_t': DistributionType.STUDENT_T,
                    'lognormal': DistributionType.LOGNORMAL,
                    'exponential': DistributionType.EXPONENTIAL
                }
                
                watson_dist = dist_map.get(
                    watson_rec.get('distribution', 'normal'),
                    DistributionType.NORMAL
                )
                
                return watson_dist, watson_rec
                
            except Exception as e:
                logger.warning(f"Watson distribution recommendation failed: {e}")
        
        # Fallback to rule-based
        return rule_based, {
            "distribution": rule_based.value,
            "rationale": f"Rule-based selection: {'normal' if tests['is_normal'] else 'fat-tailed' if tests['has_fat_tails'] else 'skewed'}",
            "confidence": 0.7,
            "statistical_tests": tests
        }
    
    def calculate_var_quantile(
        self,
        volatility: float,
        confidence_level: float,
        distribution: DistributionType,
        df: int = 5  # degrees of freedom for Student-t
    ) -> float:
        """
        Calculate VaR quantile based on distribution type.
        
        Args:
            volatility: Daily volatility
            confidence_level: Confidence level (e.g., 0.95)
            distribution: Distribution type
            df: Degrees of freedom for Student-t
            
        Returns:
            VaR multiplier (z-score equivalent)
        """
        alpha = 1 - confidence_level
        
        if distribution == DistributionType.NORMAL:
            # Standard normal quantile
            return stats.norm.ppf(alpha)
        
        elif distribution == DistributionType.STUDENT_T:
            # Student-t quantile (fat tails)
            return stats.t.ppf(alpha, df)
        
        elif distribution == DistributionType.LOGNORMAL:
            # Log-normal approximation
            # For small volatilities, use normal approximation
            return stats.norm.ppf(alpha) * 1.1  # Slightly wider
        
        elif distribution == DistributionType.EXPONENTIAL:
            # Exponential (extreme value)
            return stats.expon.ppf(alpha)
        
        else:
            # Default to normal
            return stats.norm.ppf(alpha)
    
    def calculate_expected_shortfall(
        self,
        var_amount: float,
        volatility: float,
        confidence_level: float,
        distribution: DistributionType
    ) -> float:
        """
        Calculate Expected Shortfall (CVaR) for given VaR.
        
        ES is the expected loss given that VaR threshold is breached.
        """
        alpha = 1 - confidence_level
        
        if distribution == DistributionType.NORMAL:
            # ES for normal distribution
            z_alpha = stats.norm.ppf(alpha)
            phi_z = stats.norm.pdf(z_alpha)
            es_multiplier = phi_z / alpha
            return abs(var_amount * es_multiplier / abs(z_alpha))
        
        elif distribution == DistributionType.STUDENT_T:
            # ES for Student-t (approximation)
            return abs(var_amount * 1.2)  # Roughly 20% higher for fat tails
        
        else:
            # General approximation
            return abs(var_amount * 1.25)
    
    async def compute_multi_var(
        self,
        positions: List[EnrichedPosition],
        config: Optional[VaRConfig] = None,
        historical_returns: Optional[List[float]] = None
    ) -> MultiVaRResult:
        """
        Compute VaR/ES for multiple confidence levels and time horizons.
        
        Args:
            positions: List of portfolio positions
            config: VaR configuration (uses defaults if None)
            historical_returns: Optional historical return data for distribution fitting
            
        Returns:
            MultiVaRResult with all VaR/ES calculations
        """
        if config is None:
            config = VaRConfig()
        
        # Calculate portfolio statistics
        total_value, portfolio_beta, daily_vol = self.calculate_portfolio_returns(positions)
        
        if total_value == 0:
            return MultiVaRResult(
                portfolio_id="empty",
                results=[],
                distribution_recommendation=None
            )
        
        # Select distribution
        distribution = config.distribution
        distribution_rec = None
        
        if config.use_watson_recommendation and historical_returns:
            distribution, distribution_rec = await self.select_distribution(
                historical_returns,
                use_watson=True
            )
        elif config.distribution == DistributionType.NORMAL and historical_returns:
            # Auto-select based on statistical tests only
            distribution, distribution_rec = await self.select_distribution(
                historical_returns,
                use_watson=False
            )
        
        # Run statistical tests if we have historical data
        statistical_tests = None
        if historical_returns:
            statistical_tests = self.run_statistical_tests(historical_returns)
        
        # Calculate VaR/ES for all confidence levels and time horizons
        results = []
        
        for confidence_level in config.confidence_levels:
            for time_horizon in config.time_horizons:
                # Get quantile for this confidence level and distribution
                quantile = self.calculate_var_quantile(
                    daily_vol,
                    confidence_level,
                    distribution
                )
                
                # Calculate VaR
                var_1d = abs(total_value * daily_vol * quantile)
                
                # Scale to time horizon (square root of time)
                var_amount = var_1d * math.sqrt(time_horizon)
                
                # Calculate ES
                es_amount = self.calculate_expected_shortfall(
                    var_amount,
                    daily_vol,
                    confidence_level,
                    distribution
                )
                
                # Create result
                result = VaRResult(
                    confidence_level=confidence_level,
                    time_horizon=time_horizon,
                    var_amount=round(var_amount, 2),
                    es_amount=round(es_amount, 2),
                    distribution_used=distribution.value,
                    percentile=round((1 - confidence_level) * 100, 2)
                )
                results.append(result)
        
        return MultiVaRResult(
            portfolio_id="default",
            calculation_time=datetime.utcnow(),
            results=results,
            distribution_recommendation=distribution_rec,
            statistical_tests=statistical_tests
        )
    
    def generate_simulated_returns(
        self,
        positions: List[EnrichedPosition],
        n_samples: int = 252  # 1 year of daily returns
    ) -> List[float]:
        """
        Generate simulated historical returns for testing.
        
        In production, this would be replaced with actual historical data.
        """
        total_value, portfolio_beta, daily_vol = self.calculate_portfolio_returns(positions)
        
        # Simulate returns with some kurtosis (fat tails)
        returns = []
        for _ in range(n_samples):
            # Mix of normal and occasional large moves
            if np.random.random() < 0.95:
                ret = np.random.normal(0, daily_vol)
            else:
                # Fat tail event
                ret = np.random.normal(0, daily_vol * 3)
            returns.append(ret)
        
        return returns


# Global calculator instance
var_calculator = VaRCalculator()
