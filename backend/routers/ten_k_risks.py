"""
Clara — 10-K Risk Analysis Router
API endpoints for SEC 10-K filing analysis and risk extraction.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging
from datetime import datetime
import hashlib

from models.schemas import (
    TenKAnalysisRequest,
    TenKComparisonRequest,
    TenKRiskFactor,
    TenKComparisonResult,
    HeatMapData
)
from services.sec_edgar_service import sec_edgar_service
from services.watsonx_service import watsonx_service
from services.coso_classifier import coso_classifier
from services.risk_heatmap_service import risk_heatmap_service

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory cache for parsed filings (in production, use Redis or database)
_filing_cache: dict = {}


@router.post("/analyze")
async def analyze_10k(request: TenKAnalysisRequest):
    """
    Fetch and analyze a 10-K filing for a company.
    
    Steps:
    1. Fetch 10-K filing from SEC EDGAR
    2. Parse Item 1A (Risk Factors)
    3. Extract individual risk statements
    4. Use Watson AI to enhance and generate additional risks
    5. Classify risks using COSO framework
    6. Calculate likelihood and impact
    
    Returns:
        Dictionary with filing metadata and extracted risks
    """
    try:
        ticker = request.ticker.upper()
        
        # Check cache first
        cache_key = f"{ticker}_{request.year or 'latest'}"
        if cache_key in _filing_cache:
            logger.info(f"Returning cached 10-K analysis for {cache_key}")
            return _filing_cache[cache_key]
        
        # Fetch 10-K filing
        logger.info(f"Fetching 10-K for {ticker}" + (f" year {request.year}" if request.year else ""))
        filing = await sec_edgar_service.fetch_10k_filing(ticker, request.year)
        
        if not filing:
            raise HTTPException(
                status_code=404,
                detail=f"10-K filing not found for {ticker}" + (f" in {request.year}" if request.year else "")
            )
        
        # Download HTML
        logger.info(f"Downloading 10-K HTML for {ticker}")
        html = await sec_edgar_service.download_filing_html(filing)
        
        if not html:
            raise HTTPException(
                status_code=500,
                detail="Failed to download 10-K filing HTML"
            )
        
        # Parse Item 1A
        logger.info(f"Parsing Item 1A for {ticker}, HTML length: {len(html)}")
        item_1a_text = await sec_edgar_service.parse_risk_factors(html)
        
        if not item_1a_text:
            logger.error(f"Failed to parse Item 1A from 10-K filing for {ticker}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse Item 1A from 10-K filing"
            )
        
        logger.info(f"Item 1A text length: {len(item_1a_text)}")
        
        # Extract risk paragraphs
        risk_paragraphs = sec_edgar_service.extract_risk_paragraphs(item_1a_text)
        logger.info(f"Extracted {len(risk_paragraphs)} risk paragraphs")
        
        # Use Watson AI to generate additional risks (if enabled)
        watson_risks = []
        if request.use_watson_enhancement and watsonx_service.enabled:
            logger.info("Generating enhanced risks with Watson AI")
            watson_risks = await watsonx_service.generate_risks_from_10k(
                item_1a_text, 
                ticker
            )
        
        # Combine extracted and Watson-generated risks
        all_risk_texts = risk_paragraphs[:20] + watson_risks  # Limit to 20 extracted + Watson risks
        
        # Create TenKRiskFactor objects
        risk_factors = []
        for i, risk_text in enumerate(all_risk_texts):
            # Generate risk ID
            risk_id = hashlib.md5(
                f"{ticker}_{filing.fiscal_year}_{i}_{risk_text[:50]}".encode()
            ).hexdigest()[:16]
            
            # Classify with COSO
            coso_categories = await coso_classifier.classify_risk(
                risk_text,
                use_watson=request.use_watson_enhancement
            )
            
            # Estimate likelihood and impact
            likelihood, impact = risk_heatmap_service.estimate_likelihood_impact(risk_text)
            
            # Create risk factor
            risk_factor = TenKRiskFactor(
                risk_id=risk_id,
                company_ticker=ticker,
                filing_date=filing.filing_date,
                fiscal_year=filing.fiscal_year,
                risk_text=risk_text,
                section_reference={"item": "1A", "accession": filing.accession_number},
                coso_classifications=coso_categories,
                likelihood=likelihood,
                impact=impact,
                is_new_risk=(i >= len(risk_paragraphs)),  # Watson-generated risks marked as new
                watson_enhanced_text=None
            )
            risk_factors.append(risk_factor)
        
        # Prepare response
        result = {
            "ticker": ticker,
            "filing_date": filing.filing_date.isoformat(),
            "fiscal_year": filing.fiscal_year,
            "accession_number": filing.accession_number,
            "document_url": filing.document_url,
            "risks_count": len(risk_factors),
            "risks": [risk.model_dump() for risk in risk_factors],
            "watson_enabled": watsonx_service.enabled and request.use_watson_enhancement,
            "parsed_at": datetime.utcnow().isoformat()
        }
        
        # Cache result
        _filing_cache[cache_key] = result
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing 10-K: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/risks/{ticker}")
async def get_risks(
    ticker: str,
    year: Optional[int] = Query(None, description="Fiscal year"),
    coso_category: Optional[str] = Query(None, description="Filter by COSO category"),
    min_severity: Optional[str] = Query(None, description="Minimum severity: low, medium, high")
):
    """
    Get extracted risks for a company.
    
    Returns cached analysis if available, otherwise triggers new analysis.
    """
    try:
        ticker = ticker.upper()
        cache_key = f"{ticker}_{year or 'latest'}"
        
        # Check if analysis exists in cache
        if cache_key not in _filing_cache:
            # Trigger analysis
            request = TenKAnalysisRequest(ticker=ticker, year=year)
            await analyze_10k(request)
        
        result = _filing_cache.get(cache_key)
        if not result:
            raise HTTPException(status_code=404, detail="No analysis found")
        
        risks = [TenKRiskFactor(**risk) for risk in result['risks']]
        
        # Apply filters
        if coso_category:
            risks = [r for r in risks if coso_category.lower() in r.coso_classifications]
        
        if min_severity:
            # Filter by severity based on likelihood × impact
            severity_map = {'low': 0.33, 'medium': 0.67, 'high': 1.0}
            min_score = severity_map.get(min_severity.lower(), 0.0)
            risks = [r for r in risks if (r.likelihood * r.impact) >= min_score]
        
        return {
            "ticker": ticker,
            "fiscal_year": result['fiscal_year'],
            "risks_count": len(risks),
            "risks": [risk.model_dump() for risk in risks]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting risks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare/{ticker}")
async def compare_years(
    ticker: str,
    year1: int = Query(..., description="First fiscal year"),
    year2: int = Query(..., description="Second fiscal year")
):
    """
    Compare 10-K filings between two years to identify new, removed, or changed risks.
    """
    try:
        ticker = ticker.upper()
        
        # Use SEC EDGAR service for comparison
        comparison = await sec_edgar_service.compare_filings(ticker, year1, year2)
        
        if "error" in comparison:
            raise HTTPException(status_code=500, detail=comparison["error"])
        
        return comparison
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing filings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/heat-map/{ticker}")
async def get_heat_map(
    ticker: str,
    year: Optional[int] = Query(None, description="Fiscal year"),
    coso_categories: Optional[str] = Query(None, description="Comma-separated COSO categories")
):
    """
    Generate risk heat map data (likelihood × impact visualization).
    """
    try:
        ticker = ticker.upper()
        cache_key = f"{ticker}_{year or 'latest'}"
        
        # Ensure analysis exists
        if cache_key not in _filing_cache:
            request = TenKAnalysisRequest(ticker=ticker, year=year)
            await analyze_10k(request)
        
        result = _filing_cache.get(cache_key)
        if not result:
            raise HTTPException(status_code=404, detail="No analysis found")
        
        # Convert to TenKRiskFactor objects
        risks = [TenKRiskFactor(**risk) for risk in result['risks']]
        
        # Generate heat map
        heat_map = risk_heatmap_service.generate_heat_map(risks, auto_estimate=True)
        
        # Apply COSO filter if specified
        if coso_categories:
            categories = [cat.strip().lower() for cat in coso_categories.split(',')]
            heat_map = risk_heatmap_service.filter_by_coso(heat_map, categories)
        
        return heat_map.model_dump()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating heat map: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/coso-categories")
async def get_coso_categories():
    """Get all COSO categories with descriptions."""
    return {
        "categories": coso_classifier.get_all_categories()
    }


@router.delete("/cache/{ticker}")
async def clear_cache(ticker: str):
    """Clear cached analysis for a ticker (admin endpoint)."""
    ticker = ticker.upper()
    cleared = []
    
    for key in list(_filing_cache.keys()):
        if key.startswith(ticker):
            del _filing_cache[key]
            cleared.append(key)
    
    return {
        "message": f"Cleared {len(cleared)} cached entries for {ticker}",
        "cleared": cleared
    }
