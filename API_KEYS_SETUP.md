# API Keys Setup Guide

CLARA requires API keys for various services to enable full functionality. This guide explains what keys are needed and where to get them.

## Required API Keys

### 1. News & Web Scraping

#### NewsAPI (Recommended)
- **Purpose**: Financial news scraping and headlines
- **Free Tier**: 100 requests/day
- **Get Key**: https://newsapi.org/register
- **Environment Variable**: `VITE_NEWS_API_KEY`
- **Used In**: `src/services/newsService.ts`, `src/services/webScraperService.ts`

#### Alpha Vantage News Sentiment
- **Purpose**: News with built-in sentiment analysis
- **Free Tier**: 25 requests/day
- **Get Key**: https://www.alphavantage.co/support/#api-key
- **Environment Variable**: `VITE_ALPHA_VANTAGE_API_KEY`
- **Used In**: `src/services/newsService.ts`, `src/services/webScraperService.ts`

### 2. Stock Data

#### Alpha Vantage
- **Purpose**: Real-time stock quotes, technical indicators, company data
- **Free Tier**: 25 requests/day, 5 requests/minute
- **Get Key**: https://www.alphavantage.co/support/#api-key
- **Environment Variable**: `VITE_ALPHA_VANTAGE_API_KEY`
- **Used In**: `src/services/alphaVantageService.ts`, `src/hooks/useStockData.ts`

#### Twelve Data (Backup)
- **Purpose**: Backup stock quotes, batch symbol queries
- **Free Tier**: 800 requests/day, 8 requests/minute
- **Get Key**: https://twelvedata.com/pricing
- **Environment Variable**: `VITE_TWELVEDATA_API_KEY`
- **Used In**: `src/services/alphaVantageService.ts`

#### Finnhub (Tertiary)
- **Purpose**: Additional quote source, earnings data
- **Free Tier**: 60 requests/minute
- **Get Key**: https://finnhub.io/register
- **Environment Variable**: `VITE_FINNHUB_API_KEY`
- **Used In**: `src/services/alphaVantageService.ts`

### 3. Email Services

#### EmailJS (For AI Digest Agent)
- **Purpose**: Browser-side email sending for daily digest
- **Free Tier**: 200 emails/month
- **Get Keys**: https://www.emailjs.com
  - Create an account
  - Create an email service (Gmail, Outlook, etc.)
  - Create an email template
  - Get your public key from dashboard
- **Environment Variables**:
  - `VITE_EMAILJS_SERVICE_ID`
  - `VITE_EMAILJS_TEMPLATE_ID`
  - `VITE_EMAILJS_PUBLIC_KEY`
- **Used In**: `src/hooks/useDailyDigest.ts`, `src/services/emailAlertService.ts`

## Setup Instructions

### Step 1: Create `.env` file

Create a `.env` file in the project root (same directory as `package.json`):

```bash
# Copy the example file
cp .env.example .env
```

### Step 2: Add your API keys

Edit the `.env` file and add your keys:

```env
# News & Web Scraping
VITE_NEWS_API_KEY=your_news_api_key_here
VITE_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# Stock Data (Optional - for live quotes)
VITE_TWELVEDATA_API_KEY=your_twelvedata_key_here
VITE_FINNHUB_API_KEY=your_finnhub_key_here

# Email Services (for AI Digest Agent)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

### Step 3: Restart Development Server

After adding keys, restart your development server:

```bash
npm run dev
```

## Current Implementation Status

### ✅ Working (with API keys):
- News fetching via NewsAPI
- News sentiment via Alpha Vantage
- Stock quotes via Alpha Vantage/Twelve Data/Finnhub
- Email alerts via EmailJS

### ⚠️ Currently Using Mock Data:
- **Web Scraping**: The `webScraperService.ts` currently uses mock data converted from `liveEvents` in `mockData.ts`
- **RSS Feeds**: Direct RSS scraping is not implemented due to CORS restrictions in browsers
- **Real Web Scraping**: Would require:
  - Backend proxy endpoint (to bypass CORS)
  - OR a web scraping service like ScraperAPI/ScrapingBee
  - OR server-side RSS parsing

## Optional: Advanced Web Scraping

If you want to implement actual web scraping (beyond RSS feeds), you can use:

### ScraperAPI
- **Free Tier**: 1,000 requests/month
- **Get Key**: https://www.scraperapi.com
- **Use Case**: Scrape financial news websites directly

### ScrapingBee
- **Free Tier**: 1,000 requests/month  
- **Get Key**: https://www.scrapingbee.com
- **Use Case**: JavaScript-rendered content scraping

These would require additional implementation in `webScraperService.ts` and a backend endpoint to handle the scraping (to avoid exposing API keys in the frontend).

## Backend API Keys

The backend also requires API keys (see `backend/config.py`):
- Alpha Vantage (same key as frontend)
- Twelve Data (same key as frontend)
- Finnhub (same key as frontend)
- IBM watsonx (for AI analysis)
- SendGrid/SMTP (for server-side emails)

These are configured in `backend/.env` (separate from frontend `.env`).

## Troubleshooting

### "No events loaded" or "Using mock data"
- Check that your API keys are set correctly in `.env`
- Verify keys are valid by testing them directly
- Check browser console for API errors
- NewsAPI free tier has rate limits (100/day)

### EmailJS not working
- Ensure all three EmailJS variables are set
- Verify your EmailJS service and template are configured
- Check EmailJS dashboard for usage limits

### CORS errors
- Some APIs require backend proxying
- The code uses `api.allorigins.win` as a CORS proxy for some requests
- For production, implement proper backend endpoints
