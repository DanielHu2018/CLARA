# CLARA - Requirements: Files and Packages

**Project:** CLARA (Clairvoyant Loss Avoidance & Risk Advisor)  
**Version:** 1.0.0

---

## Required Packages

### Frontend (Node.js/npm)

Install with: `npm install`

**Dependencies:**
```json
{
  "@emailjs/browser": "^4.4.1",
  "@types/bcryptjs": "^2.4.6",
  "bcryptjs": "^3.0.3",
  "clsx": "2.1.1",
  "lucide-react": "^0.575.0",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "recharts": "^3.7.0",
  "tailwind-merge": "3.4.0"
}
```

**Dev Dependencies:**
```json
{
  "@tailwindcss/vite": "4.1.17",
  "@types/node": "^22.0.0",
  "@types/react": "19.2.7",
  "@types/react-dom": "19.2.3",
  "@vitejs/plugin-react": "5.1.1",
  "tailwindcss": "4.1.17",
  "typescript": "5.9.3",
  "vite": "7.2.4",
  "vite-plugin-singlefile": "2.3.0"
}
```

### Backend (Python)

Install with: `pip install -r requirements.txt`

**Required Python Packages:**
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
ibm-watsonx-ai>=0.1.0
beautifulsoup4>=4.12.0
lxml>=4.9.0
scipy>=1.11.0
numpy>=1.24.0
pandas>=2.0.0
httpx>=0.25.0
aiohttp>=3.9.0
python-multipart>=0.0.6
```

**Python Version:** 3.10 or higher

---

## Required Files and Directory Structure

### Root Directory Files
```
CLARA-main/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── .env (create from .env.example)
└── README.md (optional)
```

### Backend Directory
```
backend/
├── main.py
├── config.py
├── .env.example
├── models/
│   └── schemas.py
├── routers/
│   ├── alerts.py
│   ├── analogs.py
│   ├── audit.py
│   ├── hedges.py
│   ├── portfolio.py
│   ├── regime.py
│   ├── risk.py
│   ├── simulation.py
│   ├── stocks.py
│   ├── system_health.py
│   └── ten_k_risks.py
└── services/
    ├── alert_agent.py
    ├── alpha_vantage.py
    ├── breach_monitor.py
    ├── capiq_service.py
    ├── coso_classifier.py
    ├── email_service.py
    ├── portfolio_engine.py
    ├── risk_heatmap_service.py
    ├── sec_edgar_service.py
    ├── sensitivity_analyzer.py
    ├── stock_data.py
    ├── var_calculator.py
    └── watsonx_service.py
```

### Frontend Source Directory
```
src/
├── main.tsx
├── App.tsx
├── index.css
├── vite-env.d.ts
├── auth/
│   ├── AuthPage.tsx
│   └── authStore.ts
├── components/
│   ├── AlertAgentPanel.tsx
│   ├── AnalogPanel.tsx
│   ├── ApiSettingsPanel.tsx
│   ├── AuditTrail.tsx
│   ├── ChatBot.tsx
│   ├── CorrelationPanel.tsx
│   ├── EventFeed.tsx
│   ├── Header.tsx
│   ├── HedgePanel.tsx
│   ├── KPICards.tsx
│   ├── LiveNewsTicker.tsx
│   ├── MarketTicker.tsx
│   ├── MonteCarloChart.tsx
│   ├── PortfolioImpactPanel.tsx
│   ├── RegimePanel.tsx
│   ├── RiskContributors.tsx
│   ├── RiskHeatMap.tsx
│   ├── RunCycleModal.tsx
│   ├── ScrollAnimatedBackground.tsx
│   ├── SensitivityChart.tsx
│   ├── SettingsModal.tsx
│   ├── ShockMatrix.tsx
│   ├── Sidebar.tsx
│   └── VaRChart.tsx
├── pages/
│   ├── AlertsPage.tsx
│   ├── AuditTrailPage.tsx
│   ├── CommandCenter.tsx
│   ├── EventFeedPage.tsx
│   ├── HedgeEnginePage.tsx
│   ├── HistoricalAnalogsPage.tsx
│   ├── LiveMarketsPage.tsx
│   ├── PortfolioRiskPage.tsx
│   ├── RegimeAnalysisPage.tsx
│   ├── ShockMatrixPage.tsx
│   ├── SimulationPage.tsx
│   ├── SystemHealthPage.tsx
│   └── TenKAnalysisPage.tsx
├── hooks/
│   ├── useAlertAgent.ts
│   ├── useDailyDigest.ts
│   ├── useMultiPortfolio.ts
│   ├── usePortfolioData.ts
│   └── useStockData.ts
├── services/
│   ├── alphaVantageService.ts
│   ├── emailAlertService.ts
│   ├── exportService.ts
│   ├── newsService.ts
│   └── webScraperService.ts
├── data/
│   └── mockData.ts
└── utils/
    └── cn.ts
```

### Public Assets Directory
```
public/
├── blackhole-animation.gif
├── blackhole-animation.mp4
├── blackhole-icon.svg
└── frames/
    ├── frame_001_delay-0.04s.jpg
    ├── frame_002_delay-0.04s.jpg
    └── ... (102 frame files)
```

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Backend Environment Variables
```bash
# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# Twelve Data API (optional)
TWELVEDATA_API_KEY=your_twelvedata_key_here

# Finnhub API (optional)
FINNHUB_API_KEY=your_finnhub_key_here

# EmailJS (for browser-side email)
EMAILJS_SERVICE_ID=your_service_id_here
EMAILJS_TEMPLATE_ID=your_template_id_here
EMAILJS_PUBLIC_KEY=your_public_key_here

# SendGrid (for server-side email, optional)
SENDGRID_API_KEY=your_sendgrid_key_here
SENDGRID_FROM_EMAIL=CLARA@yourdomain.com
SENDGRID_FROM_NAME=CLARA Alert Agent

# SMTP Fallback (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_USE_TLS=true

# IBM watsonx.ai
WATSONX_API_KEY=your_watsonx_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-instruct-v2

# IBM Watson Discovery (optional)
WATSON_DISCOVERY_API_KEY=your_watson_discovery_key_here
WATSON_DISCOVERY_URL=https://api.us-south.discovery.watson.cloud.ibm.com
WATSON_DISCOVERY_ENVIRONMENT_ID=your_environment_id_here

# SEC EDGAR (required for 10-K analysis)
SEC_EDGAR_USER_AGENT=YourCompany/YourApp (your.email@example.com)

# Cap IQ (Phase 2, optional)
CAPIQ_API_KEY=your_capiq_key_here
CAPIQ_ENABLED=false

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/clara_db

# Redis (if using caching)
REDIS_URL=redis://localhost:6379/0
```

### Frontend Environment Variables
Create a `.env` file in the root directory (same as backend):
```bash
# EmailJS (same as backend)
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here

# API Base URL
VITE_API_BASE_URL=http://localhost:8000
```

---

## Installation Steps

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Install Backend Dependencies
```bash
cd backend
pip install fastapi uvicorn pydantic pydantic-settings python-dotenv
pip install ibm-watsonx-ai beautifulsoup4 lxml scipy numpy pandas httpx aiohttp python-multipart
```

Or create `backend/requirements.txt`:
```txt
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
ibm-watsonx-ai>=0.1.0
beautifulsoup4>=4.12.0
lxml>=4.9.0
scipy>=1.11.0
numpy>=1.24.0
pandas>=2.0.0
httpx>=0.25.0
aiohttp>=3.9.0
python-multipart>=0.0.6
```

Then install:
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Copy example file
cp backend/.env.example backend/.env

# Edit .env file with your API keys
nano backend/.env  # or use your preferred editor
```

### 4. Run Development Servers

**Frontend:**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Backend:**
```bash
cd backend
uvicorn main:app --reload
# Runs on http://localhost:8000
```

---

## System Requirements

### Minimum Requirements
- **Node.js:** 18.0.0 or higher
- **Python:** 3.10 or higher
- **npm:** 9.0.0 or higher
- **pip:** 23.0.0 or higher

### Recommended Requirements
- **Node.js:** 20.0.0 or higher
- **Python:** 3.11 or higher
- **RAM:** 8GB minimum, 16GB recommended
- **Disk Space:** 2GB free space
- **Internet:** Required for API integrations

---

## API Keys Required

### Required (Core Functionality)
1. **Alpha Vantage API Key** - For stock market data
   - Get free key at: https://www.alphavantage.co/support/#api-key

2. **SEC EDGAR User Agent** - For 10-K filing access
   - Format: `YourCompany/YourApp (your.email@example.com)`
   - No registration needed, just provide contact info

3. **IBM Watson AI** - For risk analysis and AI features
   - Get key at: https://cloud.ibm.com/catalog/services/watsonx-ai

### Optional (Enhanced Features)
4. **EmailJS** - For email notifications
   - Get keys at: https://www.emailjs.com/

5. **Twelve Data API** - Alternative market data source
   - Get key at: https://twelvedata.com/

6. **Finnhub API** - Alternative market data source
   - Get key at: https://finnhub.io/

---

## File Count Summary

- **Backend Python Files:** 25 files
- **Frontend TypeScript/React Files:** 50+ files
- **Public Assets:** 105 files (including animation frames)
- **Configuration Files:** 5 files
- **Total Project Files:** 180+ files

---

## Quick Start Checklist

- [ ] Install Node.js and Python
- [ ] Clone repository
- [ ] Run `npm install` in root directory
- [ ] Run `pip install -r backend/requirements.txt`
- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Add API keys to `.env` file
- [ ] Start backend: `cd backend && uvicorn main:app --reload`
- [ ] Start frontend: `npm run dev`
- [ ] Open browser to http://localhost:5173

---

**Last Updated:** February 2026
