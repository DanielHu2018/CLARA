"""
Clara — Risk Heat Map Service
Generates heat map data for risk visualization (likelihood × impact).
"""

import logging
from typing import List, Dict, Any
import hashlib
from models.schemas import TenKRiskFactor, HeatMapPoint, HeatMapData

logger = logging.getLogger(__name__)


class RiskHeatMapService:
    """Service for generating risk heat map visualizations"""
    
    def __init__(self):
        self.severity_thresholds = {
            'low': 0.33,
            'medium': 0.67,
            'high': 1.0
        }
    
    def calculate_severity(self, likelihood: float, impact: float) -> str:
        """
        Calculate risk severity based on likelihood and impact.
        
        Severity zones:
        - Low: likelihood × impact < 0.33
        - Medium: 0.33 <= likelihood × impact < 0.67
        - High: likelihood × impact >= 0.67
        
        Args:
            likelihood: Risk likelihood (0-1)
            impact: Risk impact (0-1)
            
        Returns:
            Severity level: 'low', 'medium', or 'high'
        """
        risk_score = likelihood * impact
        
        if risk_score < self.severity_thresholds['low']:
            return 'low'
        elif risk_score < self.severity_thresholds['medium']:
            return 'medium'
        else:
            return 'high'
    
    def estimate_likelihood_impact(self, risk_text: str) -> tuple[float, float]:
        """
        Estimate likelihood and impact from risk text using keyword analysis.
        
        This is a simple heuristic-based approach. In production, this could be
        enhanced with ML models or Watson AI.
        
        Args:
            risk_text: Risk statement text
            
        Returns:
            Tuple of (likelihood, impact) both in range 0-1
        """
        text_lower = risk_text.lower()
        
        # Likelihood indicators
        high_likelihood_keywords = [
            'likely', 'probable', 'expected', 'anticipated', 'ongoing',
            'continue', 'persistent', 'recurring', 'frequent'
        ]
        low_likelihood_keywords = [
            'unlikely', 'remote', 'rare', 'potential', 'possible',
            'could', 'might', 'may'
        ]
        
        # Impact indicators
        high_impact_keywords = [
            'material', 'significant', 'substantial', 'severe', 'critical',
            'major', 'adversely affect', 'materially adversely', 'harm',
            'damage', 'loss', 'failure', 'bankruptcy', 'default'
        ]
        low_impact_keywords = [
            'minor', 'limited', 'minimal', 'slight', 'modest'
        ]
        
        # Calculate likelihood score
        likelihood_score = 0.5  # Default to medium
        high_likelihood_count = sum(1 for kw in high_likelihood_keywords if kw in text_lower)
        low_likelihood_count = sum(1 for kw in low_likelihood_keywords if kw in text_lower)
        
        if high_likelihood_count > low_likelihood_count:
            likelihood_score = min(0.5 + (high_likelihood_count * 0.1), 0.9)
        elif low_likelihood_count > high_likelihood_count:
            likelihood_score = max(0.5 - (low_likelihood_count * 0.1), 0.2)
        
        # Calculate impact score
        impact_score = 0.5  # Default to medium
        high_impact_count = sum(1 for kw in high_impact_keywords if kw in text_lower)
        low_impact_count = sum(1 for kw in low_impact_keywords if kw in text_lower)
        
        if high_impact_count > low_impact_count:
            impact_score = min(0.5 + (high_impact_count * 0.1), 0.95)
        elif low_impact_count > high_impact_count:
            impact_score = max(0.5 - (low_impact_count * 0.1), 0.2)
        
        # Add some randomness to avoid clustering (±10%)
        import random
        likelihood_score += random.uniform(-0.05, 0.05)
        impact_score += random.uniform(-0.05, 0.05)
        
        # Clamp to valid range
        likelihood_score = max(0.1, min(0.95, likelihood_score))
        impact_score = max(0.1, min(0.95, impact_score))
        
        return likelihood_score, impact_score
    
    def generate_heat_map(
        self, 
        risks: List[TenKRiskFactor],
        auto_estimate: bool = True
    ) -> HeatMapData:
        """
        Generate heat map data from risk factors.
        
        Args:
            risks: List of TenKRiskFactor objects
            auto_estimate: Whether to auto-estimate likelihood/impact if not provided
            
        Returns:
            HeatMapData object with plottable points
        """
        if not risks:
            return HeatMapData(
                ticker="",
                points=[],
                zones={"low": 0, "medium": 0, "high": 0}
            )
        
        ticker = risks[0].company_ticker
        points = []
        zone_counts = {"low": 0, "medium": 0, "high": 0}
        
        for risk in risks:
            # Use provided likelihood/impact or estimate
            if auto_estimate or risk.likelihood == 0.5:
                likelihood, impact = self.estimate_likelihood_impact(risk.risk_text)
            else:
                likelihood = risk.likelihood
                impact = risk.impact
            
            # Calculate severity
            severity = self.calculate_severity(likelihood, impact)
            zone_counts[severity] += 1
            
            # Create label (first 50 chars of risk text)
            label = risk.risk_text[:50] + "..." if len(risk.risk_text) > 50 else risk.risk_text
            
            # Get primary COSO category
            coso_category = risk.coso_classifications[0] if risk.coso_classifications else "operational"
            
            # Create heat map point
            point = HeatMapPoint(
                risk_id=risk.risk_id,
                x=likelihood * 100,  # Convert to percentage
                y=impact * 100,
                label=label,
                coso_category=coso_category,
                severity=severity,
                risk_text=risk.risk_text
            )
            points.append(point)
        
        return HeatMapData(
            ticker=ticker,
            points=points,
            zones=zone_counts
        )
    
    def filter_by_coso(
        self, 
        heat_map_data: HeatMapData, 
        categories: List[str]
    ) -> HeatMapData:
        """
        Filter heat map data by COSO categories.
        
        Args:
            heat_map_data: Original heat map data
            categories: List of COSO categories to include
            
        Returns:
            Filtered HeatMapData
        """
        filtered_points = [
            point for point in heat_map_data.points
            if point.coso_category in categories
        ]
        
        # Recalculate zone counts
        zone_counts = {"low": 0, "medium": 0, "high": 0}
        for point in filtered_points:
            zone_counts[point.severity] += 1
        
        return HeatMapData(
            ticker=heat_map_data.ticker,
            points=filtered_points,
            zones=zone_counts
        )
    
    def filter_by_severity(
        self, 
        heat_map_data: HeatMapData, 
        min_severity: str = "low"
    ) -> HeatMapData:
        """
        Filter heat map data by minimum severity level.
        
        Args:
            heat_map_data: Original heat map data
            min_severity: Minimum severity ('low', 'medium', 'high')
            
        Returns:
            Filtered HeatMapData
        """
        severity_order = {'low': 0, 'medium': 1, 'high': 2}
        min_level = severity_order.get(min_severity, 0)
        
        filtered_points = [
            point for point in heat_map_data.points
            if severity_order.get(point.severity, 0) >= min_level
        ]
        
        # Recalculate zone counts
        zone_counts = {"low": 0, "medium": 0, "high": 0}
        for point in filtered_points:
            zone_counts[point.severity] += 1
        
        return HeatMapData(
            ticker=heat_map_data.ticker,
            points=filtered_points,
            zones=zone_counts
        )
    
    def get_top_risks(
        self, 
        heat_map_data: HeatMapData, 
        n: int = 10
    ) -> List[HeatMapPoint]:
        """
        Get top N risks by severity score (likelihood × impact).
        
        Args:
            heat_map_data: Heat map data
            n: Number of top risks to return
            
        Returns:
            List of top HeatMapPoint objects
        """
        # Sort by risk score (x * y)
        sorted_points = sorted(
            heat_map_data.points,
            key=lambda p: (p.x / 100) * (p.y / 100),
            reverse=True
        )
        
        return sorted_points[:n]


# Global service instance
risk_heatmap_service = RiskHeatMapService()
