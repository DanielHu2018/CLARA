"""
Clara — COSO Framework Classifier
Classifies risks into COSO Enterprise Risk Management categories.
"""

import logging
from typing import List, Dict, Any
from models.schemas import COSOCategory
from services.watsonx_service import watsonx_service

logger = logging.getLogger(__name__)


class COSOClassifier:
    """
    Classifier for COSO Enterprise Risk Management framework.
    
    COSO Categories:
    - Strategic: Market competition, innovation, M&A, reputation, business model
    - Operational: Supply chain, IT systems, human capital, business continuity
    - Financial: Credit, liquidity, market risk, FX exposure, capital adequacy
    - Compliance: Regulatory, legal, tax, environmental, data privacy
    """
    
    def __init__(self):
        self.taxonomy = self._build_taxonomy()
    
    def _build_taxonomy(self) -> Dict[str, List[str]]:
        """Build keyword taxonomy for each COSO category"""
        return {
            COSOCategory.STRATEGIC: [
                'market', 'competition', 'competitive', 'competitor', 'market share',
                'innovation', 'technology disruption', 'disruptive',
                'merger', 'acquisition', 'M&A', 'integration',
                'reputation', 'brand', 'customer loyalty', 'market position',
                'strategy', 'strategic', 'business model', 'revenue model',
                'product development', 'new products', 'product line',
                'customer demand', 'market demand', 'consumer preferences',
                'pricing pressure', 'price competition',
                'intellectual property', 'patents', 'trade secrets',
                'key personnel', 'management team', 'succession planning'
            ],
            COSOCategory.OPERATIONAL: [
                'supply chain', 'supplier', 'vendor', 'procurement',
                'manufacturing', 'production', 'operations', 'operational',
                'it system', 'information technology', 'cybersecurity', 'cyber attack',
                'data breach', 'system failure', 'technology infrastructure',
                'employee', 'workforce', 'human capital', 'labor',
                'talent retention', 'hiring', 'training',
                'business continuity', 'disaster recovery', 'disruption',
                'quality control', 'product quality', 'defects',
                'capacity', 'scalability', 'efficiency',
                'logistics', 'distribution', 'inventory',
                'facilities', 'equipment', 'maintenance',
                'process', 'procedures', 'internal controls'
            ],
            COSOCategory.FINANCIAL: [
                'credit', 'credit risk', 'counterparty', 'default',
                'liquidity', 'cash flow', 'working capital',
                'market risk', 'interest rate', 'currency', 'foreign exchange', 'fx',
                'commodity price', 'price volatility',
                'capital', 'capital adequacy', 'leverage', 'debt',
                'funding', 'financing', 'refinancing',
                'financial condition', 'financial performance',
                'revenue', 'profitability', 'margins',
                'impairment', 'write-down', 'goodwill',
                'pension', 'benefit obligations',
                'hedging', 'derivatives', 'financial instruments',
                'accounting', 'financial reporting', 'estimates'
            ],
            COSOCategory.COMPLIANCE: [
                'regulatory', 'regulation', 'regulator', 'compliance',
                'legal', 'litigation', 'lawsuit', 'claims',
                'law', 'legislation', 'statutory',
                'tax', 'taxation', 'tax authority',
                'environmental', 'esg', 'sustainability', 'climate',
                'data privacy', 'gdpr', 'privacy laws',
                'anti-corruption', 'bribery', 'sanctions',
                'licensing', 'permits', 'approvals',
                'government', 'governmental', 'political',
                'audit', 'examination', 'investigation',
                'penalty', 'fine', 'enforcement',
                'disclosure', 'reporting requirements'
            ]
        }
    
    async def classify_risk(
        self, 
        risk_text: str, 
        use_watson: bool = True
    ) -> List[str]:
        """
        Classify a risk statement into COSO categories.
        
        Args:
            risk_text: Risk statement text
            use_watson: Whether to use Watson AI for classification
            
        Returns:
            List of applicable COSO category strings (lowercase)
        """
        if use_watson and watsonx_service.enabled:
            try:
                categories = await watsonx_service.classify_risk_coso(risk_text)
                if categories:
                    return categories
            except Exception as e:
                logger.warning(f"Watson classification failed, falling back to keyword-based: {e}")
        
        # Fallback to keyword-based classification
        return self._keyword_classification(risk_text)
    
    def _keyword_classification(self, risk_text: str) -> List[str]:
        """
        Keyword-based COSO classification.
        
        Args:
            risk_text: Risk statement text
            
        Returns:
            List of applicable COSO categories
        """
        text_lower = risk_text.lower()
        category_scores = {cat: 0 for cat in COSOCategory}
        
        # Score each category based on keyword matches
        for category, keywords in self.taxonomy.items():
            for keyword in keywords:
                if keyword in text_lower:
                    category_scores[category] += 1
        
        # Return categories with at least one match
        matched_categories = [
            cat.value for cat, score in category_scores.items() if score > 0
        ]
        
        # If no matches, default to operational
        if not matched_categories:
            return [COSOCategory.OPERATIONAL.value]
        
        # If multiple matches, return top 2 by score
        sorted_cats = sorted(
            category_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        top_categories = [
            cat.value for cat, score in sorted_cats[:2] if score > 0
        ]
        
        return top_categories if top_categories else [COSOCategory.OPERATIONAL.value]
    
    async def classify_batch(
        self, 
        risk_texts: List[str], 
        use_watson: bool = True
    ) -> List[List[str]]:
        """
        Classify multiple risk statements.
        
        Args:
            risk_texts: List of risk statement texts
            use_watson: Whether to use Watson AI
            
        Returns:
            List of category lists (one per risk)
        """
        results = []
        for risk_text in risk_texts:
            categories = await self.classify_risk(risk_text, use_watson)
            results.append(categories)
        return results
    
    def get_category_description(self, category: str) -> str:
        """Get human-readable description of a COSO category"""
        descriptions = {
            COSOCategory.STRATEGIC: "Strategic risks affecting market position, competition, innovation, and business model",
            COSOCategory.OPERATIONAL: "Operational risks related to processes, systems, people, and business continuity",
            COSOCategory.FINANCIAL: "Financial risks including credit, liquidity, market risk, and capital adequacy",
            COSOCategory.COMPLIANCE: "Compliance risks from regulatory, legal, tax, and environmental requirements"
        }
        
        try:
            cat_enum = COSOCategory(category.lower())
            return descriptions.get(cat_enum, "Unknown category")
        except ValueError:
            return "Unknown category"
    
    def get_all_categories(self) -> List[Dict[str, str]]:
        """Get all COSO categories with descriptions"""
        return [
            {
                "value": cat.value,
                "label": cat.value.capitalize(),
                "description": self.get_category_description(cat.value)
            }
            for cat in COSOCategory
        ]


# Global classifier instance
coso_classifier = COSOClassifier()
