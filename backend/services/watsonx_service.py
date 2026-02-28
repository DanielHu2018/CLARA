"""
Clara — Watson AI Service Layer
Provides AI-powered risk analysis, distribution recommendations, and COSO classification.
"""

from typing import List, Dict, Optional, Any
import logging
from datetime import datetime

try:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    WATSONX_AVAILABLE = True
except ImportError:
    WATSONX_AVAILABLE = False
    logging.warning("ibm-watsonx-ai not installed. Watson features will be disabled.")

from config import settings

logger = logging.getLogger(__name__)


class WatsonXService:
    """Service for interacting with IBM watsonx.ai"""
    
    def __init__(self):
        self.client: Optional[Any] = None
        self.model: Optional[Any] = None
        self.enabled = False
        
        if not WATSONX_AVAILABLE:
            logger.warning("Watson AI SDK not available")
            return
            
        if not settings.WATSONX_API_KEY or not settings.WATSONX_PROJECT_ID:
            logger.warning("Watson AI credentials not configured")
            return
            
        try:
            self._initialize_client()
            self.enabled = True
            logger.info("Watson AI service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Watson AI: {e}")
            self.enabled = False
    
    def _initialize_client(self):
        """Initialize Watson AI client and model"""
        credentials = Credentials(
            url=settings.WATSONX_URL,
            api_key=settings.WATSONX_API_KEY
        )
        
        self.client = APIClient(credentials)
        
        # Initialize model inference with Granite 3
        self.model = ModelInference(
            model_id=settings.WATSONX_MODEL_ID,
            api_client=self.client,
            project_id=settings.WATSONX_PROJECT_ID,
            params={
                "decoding_method": "greedy",
                "max_new_tokens": 1500,
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 50
            }
        )
    
    async def generate_risks_from_10k(self, filing_text: str, company_ticker: str) -> List[str]:
        """
        Extract and generate risk factors from 10-K filing text using Watson AI.
        
        Args:
            filing_text: Raw text from Item 1A of 10-K filing
            company_ticker: Company stock ticker
            
        Returns:
            List of enhanced risk statements
        """
        if not self.enabled:
            logger.warning("Watson AI not enabled, returning empty list")
            return []
        
        try:
            prompt = f"""You are a financial risk analyst. Analyze the following 10-K Risk Factors section for {company_ticker} and:
1. Identify the top 10 most material risks
2. Summarize each risk in 1-2 clear sentences
3. Focus on quantifiable impacts and specific threats

10-K Risk Factors:
{filing_text[:8000]}

Provide your response as a numbered list of risk statements."""

            response = self.model.generate(prompt=prompt)
            
            if response and 'results' in response:
                generated_text = response['results'][0]['generated_text']
                # Parse numbered list
                risks = []
                for line in generated_text.split('\n'):
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith('-')):
                        # Remove numbering
                        risk_text = line.split('.', 1)[-1].strip() if '.' in line else line.strip('- ')
                        if len(risk_text) > 20:  # Filter out short/invalid entries
                            risks.append(risk_text)
                
                return risks[:10]  # Return top 10
            
            return []
            
        except Exception as e:
            logger.error(f"Error generating risks from 10-K: {e}")
            return []
    
    async def recommend_distribution(
        self, 
        historical_returns: List[float],
        statistical_tests: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Recommend optimal probability distribution for risk modeling.
        
        Args:
            historical_returns: List of historical return values
            statistical_tests: Results from statistical tests (normality, kurtosis, skewness)
            
        Returns:
            Dictionary with recommended distribution and rationale
        """
        if not self.enabled:
            return {
                "distribution": "normal",
                "rationale": "Watson AI not available, defaulting to normal distribution",
                "confidence": 0.5
            }
        
        try:
            # Prepare statistical summary
            stats_summary = f"""
Statistical Test Results:
- Normality test p-value: {statistical_tests.get('normality_pvalue', 'N/A')}
- Kurtosis: {statistical_tests.get('kurtosis', 'N/A')}
- Skewness: {statistical_tests.get('skewness', 'N/A')}
- Sample size: {len(historical_returns)}
"""

            prompt = f"""You are a quantitative risk analyst. Based on the following statistical properties of financial returns data, recommend the most appropriate probability distribution for Value-at-Risk (VaR) calculations.

{stats_summary}

Available distributions:
- normal: Standard normal distribution (good for symmetric, thin-tailed data)
- student_t: Student's t-distribution (good for fat-tailed data)
- lognormal: Log-normal distribution (good for right-skewed, positive-only data)
- exponential: Exponential distribution (good for extreme value modeling)

Provide your recommendation in this exact format:
DISTRIBUTION: [name]
CONFIDENCE: [0.0-1.0]
RATIONALE: [1-2 sentence explanation]"""

            response = self.model.generate(prompt=prompt)
            
            if response and 'results' in response:
                generated_text = response['results'][0]['generated_text']
                
                # Parse response
                result = {
                    "distribution": "normal",
                    "rationale": "Default fallback",
                    "confidence": 0.5
                }
                
                for line in generated_text.split('\n'):
                    if line.startswith('DISTRIBUTION:'):
                        dist = line.split(':', 1)[1].strip().lower()
                        if dist in ['normal', 'student_t', 'lognormal', 'exponential']:
                            result['distribution'] = dist
                    elif line.startswith('CONFIDENCE:'):
                        try:
                            conf = float(line.split(':', 1)[1].strip())
                            result['confidence'] = max(0.0, min(1.0, conf))
                        except:
                            pass
                    elif line.startswith('RATIONALE:'):
                        result['rationale'] = line.split(':', 1)[1].strip()
                
                return result
            
            return {
                "distribution": "normal",
                "rationale": "Unable to parse Watson response",
                "confidence": 0.5
            }
            
        except Exception as e:
            logger.error(f"Error recommending distribution: {e}")
            return {
                "distribution": "normal",
                "rationale": f"Error: {str(e)}",
                "confidence": 0.5
            }
    
    async def classify_risk_coso(self, risk_text: str) -> List[str]:
        """
        Classify a risk statement into COSO Enterprise Risk Management categories.
        
        Args:
            risk_text: Risk statement text
            
        Returns:
            List of applicable COSO categories (can be multiple)
        """
        if not self.enabled:
            # Fallback to keyword-based classification
            return self._fallback_coso_classification(risk_text)
        
        try:
            prompt = f"""You are a risk management expert. Classify the following risk statement into one or more COSO Enterprise Risk Management categories.

Risk Statement:
{risk_text}

COSO Categories:
- STRATEGIC: Market competition, innovation, M&A, reputation, business model risks
- OPERATIONAL: Supply chain, IT systems, human capital, business continuity, process failures
- FINANCIAL: Credit risk, liquidity, market risk, FX exposure, capital adequacy
- COMPLIANCE: Regulatory, legal, tax, environmental, data privacy

Provide ONLY the applicable category names (comma-separated if multiple apply). Example: "STRATEGIC, OPERATIONAL"

Classification:"""

            response = self.model.generate(prompt=prompt)
            
            if response and 'results' in response:
                generated_text = response['results'][0]['generated_text'].strip().upper()
                
                # Parse categories
                categories = []
                valid_categories = ['STRATEGIC', 'OPERATIONAL', 'FINANCIAL', 'COMPLIANCE']
                
                for cat in valid_categories:
                    if cat in generated_text:
                        categories.append(cat.lower())
                
                return categories if categories else ['operational']  # Default
            
            return ['operational']
            
        except Exception as e:
            logger.error(f"Error classifying risk with Watson: {e}")
            return self._fallback_coso_classification(risk_text)
    
    def _fallback_coso_classification(self, risk_text: str) -> List[str]:
        """Keyword-based COSO classification fallback"""
        text_lower = risk_text.lower()
        categories = []
        
        # Strategic keywords
        if any(kw in text_lower for kw in ['market', 'competition', 'innovation', 'reputation', 'brand', 'strategy', 'acquisition', 'merger']):
            categories.append('strategic')
        
        # Operational keywords
        if any(kw in text_lower for kw in ['supply chain', 'operations', 'manufacturing', 'it system', 'technology', 'employee', 'human capital', 'disruption']):
            categories.append('operational')
        
        # Financial keywords
        if any(kw in text_lower for kw in ['credit', 'liquidity', 'currency', 'interest rate', 'financial', 'capital', 'debt', 'cash flow']):
            categories.append('financial')
        
        # Compliance keywords
        if any(kw in text_lower for kw in ['regulatory', 'compliance', 'legal', 'law', 'regulation', 'tax', 'environmental', 'privacy', 'data protection']):
            categories.append('compliance')
        
        return categories if categories else ['operational']
    
    async def enhance_risk_description(self, risk_text: str) -> str:
        """
        Enhance a risk description with clearer language and quantifiable impacts.
        
        Args:
            risk_text: Original risk statement
            
        Returns:
            Enhanced risk statement
        """
        if not self.enabled:
            return risk_text
        
        try:
            prompt = f"""You are a financial risk analyst. Rewrite the following risk statement to be clearer, more concise, and focused on quantifiable impacts. Keep it to 2-3 sentences maximum.

Original Risk:
{risk_text}

Enhanced Risk:"""

            response = self.model.generate(prompt=prompt)
            
            if response and 'results' in response:
                enhanced = response['results'][0]['generated_text'].strip()
                return enhanced if len(enhanced) > 20 else risk_text
            
            return risk_text
            
        except Exception as e:
            logger.error(f"Error enhancing risk description: {e}")
            return risk_text


# Global service instance
watsonx_service = WatsonXService()
