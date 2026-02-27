"""
Clara — SEC EDGAR Service
Fetches and parses 10-K filings from SEC EDGAR API.
"""

import httpx
import re
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from bs4 import BeautifulSoup
import asyncio

from config import settings
from models.schemas import TenKFiling, TenKRiskFactor

logger = logging.getLogger(__name__)


class SECEdgarService:
    """Service for fetching and parsing SEC EDGAR 10-K filings"""
    
    def __init__(self):
        self.base_url = settings.SEC_EDGAR_BASE_URL
        self.user_agent = settings.SEC_EDGAR_USER_AGENT
        self.rate_limit = settings.SEC_EDGAR_RATE_LIMIT
        self._last_request_time = 0.0
        
    async def _rate_limited_request(self, url: str) -> Optional[httpx.Response]:
        """Make rate-limited HTTP request to SEC EDGAR"""
        # Ensure we don't exceed rate limit (10 req/sec)
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self._last_request_time
        min_interval = 1.0 / self.rate_limit
        
        if time_since_last < min_interval:
            await asyncio.sleep(min_interval - time_since_last)
        
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json, text/html"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers)
                self._last_request_time = asyncio.get_event_loop().time()
                response.raise_for_status()
                return response
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching {url}: {e}")
            return None
    
    async def get_cik_from_ticker(self, ticker: str) -> Optional[str]:
        """
        Convert stock ticker to CIK (Central Index Key).
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            CIK string (10 digits, zero-padded) or None
        """
        try:
            # Hardcoded CIK mapping for common tickers (SEC API endpoint changed)
            # In production, use a more comprehensive mapping or SEC's search API
            cik_map = {
                'AAPL': '0000320193',
                'MSFT': '0000789019',
                'NVDA': '0001045810',
                'GOOGL': '0001652044',
                'GOOG': '0001652044',
                'AMZN': '0001018724',
                'META': '0001326801',
                'TSLA': '0001318605',
                'BRK.B': '0001067983',
                'V': '0001403161',
                'JPM': '0000019617',
                'WMT': '0000104169',
                'MA': '0001141391',
                'PG': '0000080424',
                'JNJ': '0000200406',
                'UNH': '0000731766',
                'HD': '0000354950',
                'BAC': '0000070858',
                'XOM': '0000034088',
                'CVX': '0000093410',
            }
            
            ticker_upper = ticker.upper()
            cik = cik_map.get(ticker_upper)
            
            if cik:
                return cik
            
            # Fallback: try SEC's company tickers exchange endpoint
            url = "https://www.sec.gov/files/company_tickers_exchange.json"
            response = await self._rate_limited_request(url)
            
            if response:
                data = response.json()
                # Search in the data structure
                for entry in data.get('data', []):
                    if len(entry) > 2 and entry[2].upper() == ticker_upper:
                        cik = str(entry[0]).zfill(10)
                        return cik
            
            logger.warning(f"CIK not found for ticker: {ticker}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting CIK for {ticker}: {e}")
            return None
    
    async def fetch_company_filings(self, cik: str) -> Optional[Dict[str, Any]]:
        """
        Fetch all filings for a company by CIK.
        
        Args:
            cik: Company CIK (10 digits)
            
        Returns:
            Dictionary of filing metadata
        """
        try:
            url = f"{self.base_url}/submissions/CIK{cik}.json"
            response = await self._rate_limited_request(url)
            
            if not response:
                return None
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error fetching filings for CIK {cik}: {e}")
            return None
    
    async def fetch_10k_filing(self, ticker: str, year: Optional[int] = None) -> Optional[TenKFiling]:
        """
        Fetch the most recent (or specific year) 10-K filing for a company.
        
        Args:
            ticker: Stock ticker symbol
            year: Optional fiscal year (e.g., 2024)
            
        Returns:
            TenKFiling object or None
        """
        try:
            # Get CIK
            cik = await self.get_cik_from_ticker(ticker)
            if not cik:
                logger.error(f"Could not find CIK for ticker: {ticker}")
                return None
            
            # Get company filings
            filings_data = await self.fetch_company_filings(cik)
            if not filings_data:
                return None
            
            # Find 10-K filings
            recent_filings = filings_data.get('filings', {}).get('recent', {})
            forms = recent_filings.get('form', [])
            accession_numbers = recent_filings.get('accessionNumber', [])
            filing_dates = recent_filings.get('filingDate', [])
            primary_documents = recent_filings.get('primaryDocument', [])
            
            # Search for 10-K
            for i, form in enumerate(forms):
                if form == '10-K':
                    filing_date = datetime.strptime(filing_dates[i], '%Y-%m-%d').date()
                    fiscal_year = filing_date.year
                    
                    # If year specified, check if it matches
                    if year and fiscal_year != year:
                        continue
                    
                    accession = accession_numbers[i].replace('-', '')
                    primary_doc = primary_documents[i]
                    
                    # Construct document URL
                    doc_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession}/{primary_doc}"
                    
                    filing = TenKFiling(
                        ticker=ticker.upper(),
                        cik=cik,
                        accession_number=accession_numbers[i],
                        filing_date=filing_date,
                        fiscal_year=fiscal_year,
                        fiscal_period="FY",
                        document_url=doc_url
                    )
                    
                    return filing
            
            logger.warning(f"No 10-K filing found for {ticker}" + (f" in {year}" if year else ""))
            return None
            
        except Exception as e:
            logger.error(f"Error fetching 10-K for {ticker}: {e}")
            return None
    
    async def download_filing_html(self, filing: TenKFiling) -> Optional[str]:
        """
        Download the full HTML content of a 10-K filing.
        
        Args:
            filing: TenKFiling object with document_url
            
        Returns:
            HTML content as string or None
        """
        try:
            response = await self._rate_limited_request(filing.document_url)
            if not response:
                return None
            
            return response.text
            
        except Exception as e:
            logger.error(f"Error downloading filing HTML: {e}")
            return None
    
    async def parse_risk_factors(self, filing_html: str) -> Optional[str]:
        """
        Extract Item 1A (Risk Factors) section from 10-K HTML.
        
        Args:
            filing_html: Full HTML content of 10-K filing
            
        Returns:
            Text content of Item 1A or None
        """
        try:
            soup = BeautifulSoup(filing_html, 'html.parser')
            
            # Remove script and style tags
            for tag in soup(['script', 'style', 'header', 'footer']):
                tag.decompose()
            
            # Strategy 1: Look for specific HTML elements with Item 1A
            # Many modern 10-Ks use span/div tags with specific text
            item_1a_element = None
            
            # Search for elements containing "Item 1A" or "ITEM 1A"
            for element in soup.find_all(['span', 'div', 'p', 'td', 'a']):
                text = element.get_text().strip()
                if re.match(r'^\s*ITEM\s+1A[\.\s]*(?:RISK\s+FACTORS?)?\s*$', text, re.IGNORECASE):
                    item_1a_element = element
                    logger.info(f"Found Item 1A element: {element.name}")
                    break
            
            # Strategy 2: If we found the Item 1A marker, extract content until Item 1B or Item 2
            if item_1a_element:
                risk_text_parts = []
                current = item_1a_element.find_next()
                
                while current:
                    text = current.get_text().strip()
                    
                    # Stop if we hit Item 1B or Item 2
                    if re.match(r'^\s*ITEM\s+(1B|2)[\.\s]', text, re.IGNORECASE):
                        break
                    
                    # Collect text from relevant elements
                    if current.name in ['p', 'div', 'span', 'td'] and len(text) > 20:
                        risk_text_parts.append(text)
                    
                    current = current.find_next()
                    
                    # Safety limit
                    if len(risk_text_parts) > 500:
                        break
                
                if risk_text_parts:
                    risk_text = ' '.join(risk_text_parts)
                    logger.info(f"Extracted {len(risk_text)} characters from HTML elements")
                    return risk_text
            
            # Strategy 3: Fall back to regex on full text
            full_text = soup.get_text()
            logger.info(f"Extracted full text, length before cleaning: {len(full_text)}")
            full_text = re.sub(r'\s+', ' ', full_text)
            logger.info(f"Full text length after cleaning: {len(full_text)}")
            
            # Check if "Item 1A" or "ITEM 1A" exists anywhere in the text
            if 'item 1a' in full_text.lower():
                logger.info("Found 'Item 1A' in text (case-insensitive)")
            else:
                logger.warning("'Item 1A' not found in text at all!")
            
            patterns = [
                r'ITEM\s+1A[\.\s:]*RISK\s+FACTORS(.*?)(?:ITEM\s+1B|ITEM\s+2)',
                r'Item\s+1A[\.\s:]*Risk\s+Factors(.*?)(?:Item\s+1B|Item\s+2)',
                r'ITEM\s+1A[\.\s]+(.*?)ITEM\s+(?:1B|2)',
                r'Item\s+1A[\.\s]+(.*?)Item\s+(?:1B|2)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, full_text, re.IGNORECASE | re.DOTALL)
                if match:
                    risk_text = match.group(1).strip()
                    if len(risk_text) > 500:
                        logger.info(f"Found Item 1A with {len(risk_text)} characters using regex")
                        return risk_text
            
            logger.warning(f"Could not find Item 1A in filing. Full text length: {len(full_text)}")
            # Log a sample of the text to help debug
            sample = full_text[:1000].replace('\n', ' ')
            logger.warning(f"Sample text: {sample}")
            
            # Fallback: If we have substantial text, return it anyway
            # This allows the system to work even if parsing isn't perfect
            if len(full_text) > 5000:
                logger.info("Using fallback: returning full text as Item 1A")
                return full_text
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing risk factors: {e}", exc_info=True)
            return None
    
    def extract_risk_paragraphs(self, item_1a_text: str) -> List[str]:
        """
        Split Item 1A text into individual risk paragraphs.
        
        Args:
            item_1a_text: Full text of Item 1A section
            
        Returns:
            List of risk paragraph strings
        """
        try:
            if not item_1a_text or len(item_1a_text) < 500:
                logger.warning("Item 1A text too short or empty")
                return []
            
            paragraphs = []
            
            # Strategy 1: Look for common risk headers/patterns
            # Many companies use headers like "We may...", "Our business...", "If we...", etc.
            risk_patterns = [
                r'(?:^|\. )([A-Z][^.]{20,}(?:risk|could|may|might|uncertain)[^.]{20,}\.)',
                r'(?:^|\n)([A-Z][^\n]{50,}\.)',
            ]
            
            for pattern in risk_patterns:
                matches = re.findall(pattern, item_1a_text, re.MULTILINE)
                if matches and len(matches) > 3:
                    paragraphs = [m.strip() for m in matches if len(m.strip()) > 100]
                    if paragraphs:
                        break
            
            # Strategy 2: Split by sentence boundaries if we have long text
            if not paragraphs and len(item_1a_text) > 2000:
                # Split into chunks of ~500-1000 characters at sentence boundaries
                sentences = re.split(r'(?<=[.!?])\s+', item_1a_text)
                current_chunk = ""
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) < 1000:
                        current_chunk += " " + sentence
                    else:
                        if len(current_chunk.strip()) > 100:
                            paragraphs.append(current_chunk.strip())
                        current_chunk = sentence
                if len(current_chunk.strip()) > 100:
                    paragraphs.append(current_chunk.strip())
            
            # Strategy 3: If nothing else works, just chunk the text
            if not paragraphs:
                chunk_size = 800
                for i in range(0, len(item_1a_text), chunk_size):
                    chunk = item_1a_text[i:i+chunk_size].strip()
                    if len(chunk) > 100:
                        paragraphs.append(chunk)
            
            # Limit to reasonable number and size
            paragraphs = [p[:2000] for p in paragraphs[:30]]
            
            logger.info(f"Extracted {len(paragraphs)} risk paragraphs")
            return paragraphs
            
        except Exception as e:
            logger.error(f"Error extracting risk paragraphs: {e}")
            return []
    
    async def compare_filings(
        self, 
        ticker: str, 
        year1: int, 
        year2: int
    ) -> Dict[str, Any]:
        """
        Compare two 10-K filings to identify new, removed, or changed risks.
        
        Args:
            ticker: Stock ticker
            year1: First fiscal year
            year2: Second fiscal year
            
        Returns:
            Comparison dictionary with new/removed/changed risks
        """
        try:
            # Fetch both filings
            filing1 = await self.fetch_10k_filing(ticker, year1)
            filing2 = await self.fetch_10k_filing(ticker, year2)
            
            if not filing1 or not filing2:
                return {
                    "error": "Could not fetch one or both filings",
                    "year1": year1,
                    "year2": year2
                }
            
            # Download and parse both
            html1 = await self.download_filing_html(filing1)
            html2 = await self.download_filing_html(filing2)
            
            if not html1 or not html2:
                return {
                    "error": "Could not download filing HTML",
                    "year1": year1,
                    "year2": year2
                }
            
            text1 = await self.parse_risk_factors(html1)
            text2 = await self.parse_risk_factors(html2)
            
            if not text1 or not text2:
                return {
                    "error": "Could not parse risk factors",
                    "year1": year1,
                    "year2": year2
                }
            
            # Extract paragraphs
            risks1 = set(self.extract_risk_paragraphs(text1))
            risks2 = set(self.extract_risk_paragraphs(text2))
            
            # Simple comparison (can be enhanced with semantic similarity)
            new_risks = list(risks2 - risks1)
            removed_risks = list(risks1 - risks2)
            
            return {
                "ticker": ticker,
                "year1": year1,
                "year2": year2,
                "new_risks_count": len(new_risks),
                "removed_risks_count": len(removed_risks),
                "new_risks": new_risks[:10],  # Top 10
                "removed_risks": removed_risks[:10],
                "summary": f"Found {len(new_risks)} new risks and {len(removed_risks)} removed risks between {year1} and {year2}"
            }
            
        except Exception as e:
            logger.error(f"Error comparing filings: {e}")
            return {
                "error": str(e),
                "year1": year1,
                "year2": year2
            }


# Global service instance
sec_edgar_service = SECEdgarService()
