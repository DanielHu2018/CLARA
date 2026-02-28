# 🚀 CLARA Deployment Checklist

Complete guide to deploy CLARA (Frontend + Backend)

---

## 📋 Pre-Deployment Checklist

- [ ] All API keys are ready (Alpha Vantage, Watsonx, Gemini, etc.)
- [ ] Code is committed and pushed to GitHub
- [ ] Railway account created (for backend)
- [ ] Vercel account created (for frontend)
- [ ] `.env` files configured locally and tested

---

## 🔧 Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to https://railway.app/
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository: `DanielHu2018/CLARA`
4. Railway will detect Python project

### 1.2 Configure Service

1. Click on your service
2. **Settings** → **Service** → Set **Root Directory**: `backend`
3. Verify **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 1.3 Add Environment Variables

Click **Variables** tab and add all from `backend/.env`:

```
ALPHA_VANTAGE_API_KEY=8JY3OYV16MK0T8PV
TWELVEDATA_API_KEY=your_key
FINNHUB_API_KEY=your_key
WATSONX_API_KEY=your_key
WATSONX_PROJECT_ID=your_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-instruct-v2
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.0-flash
AI_PROVIDER=auto
APP_ENV=production
LOG_LEVEL=INFO
ALERT_CHECK_INTERVAL_SECONDS=30
ALERT_COOLDOWN_HOURS=4
MONTE_CARLO_PATHS=10000
SEC_EDGAR_USER_AGENT=Clara-RiskPlatform contact@yourdomain.com
```

### 1.4 Deploy & Get URL

1. Click **"Deploy"**
2. Wait for build to complete
3. Go to **Settings** → **Networking** → **"Generate Domain"**
4. **Copy your backend URL**: `https://clara-backend-production.up.railway.app`

### 1.5 Test Backend

```bash
curl https://your-backend.up.railway.app/
# Should return: {"system":"CLARA","version":"1.0.0","status":"operational"}

# Test API docs
# Visit: https://your-backend.up.railway.app/docs
```

**✅ Backend deployed!**

---

## 🎨 Step 2: Configure Frontend for Production

### 2.1 Create Frontend Environment File

Create `.env` in the root directory:

```
VITE_API_URL=https://your-backend.up.railway.app
```

Replace `your-backend.up.railway.app` with your actual Railway URL.

### 2.2 Test Locally with Production Backend

```bash
npm run dev
```

Verify:
- Frontend loads at http://localhost:5173
- API calls go to Railway backend (check Network tab)
- Stock data loads
- News loads

---

## 🌐 Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### 3.2 Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No
- **Project name?** clara-risk (or your choice)
- **Directory?** ./
- **Override settings?** No

### 3.3 Add Environment Variable to Vercel

```bash
vercel env add VITE_API_URL
```

When prompted, enter: `https://your-backend.up.railway.app`

Select:
- Production: Yes
- Preview: Yes
- Development: No (use localhost for dev)

### 3.4 Deploy to Production

```bash
vercel --prod
```

### 3.5 Get Your Frontend URL

Vercel will output your production URL:
```
https://clara-risk.vercel.app
```

**✅ Frontend deployed!**

---

## 🔐 Step 4: Update Backend CORS

Update Railway environment variables to include your Vercel URL:

1. Go to Railway dashboard
2. Click your service → **Variables**
3. Verify `APP_ENV=production`
4. The backend already includes Vercel CORS support

---

## ✅ Step 5: Final Testing

### 5.1 Test Production Frontend

Visit your Vercel URL: `https://clara-risk.vercel.app`

Test all features:
- [ ] Stock data loads (check ticker at top)
- [ ] News updates
- [ ] Portfolio Risk analysis
- [ ] Live Markets tab
- [ ] Regime Analysis
- [ ] Hedge Engine
- [ ] Historical Analogs
- [ ] Monte Carlo Simulation
- [ ] 10-K Analysis
- [ ] Chat functionality

### 5.2 Check API Status

Visit: `https://your-backend.up.railway.app/api/stocks/status`

Should show:
```json
{
  "alpha_vantage": "configured",
  "yahoo_finance": "available",
  "twelvedata": "configured",
  "simulated": "available"
}
```

### 5.3 Monitor Logs

**Railway Backend Logs:**
1. Railway dashboard → Your service → **Deployments**
2. Click latest deployment → View logs
3. Watch for errors or warnings

**Vercel Frontend Logs:**
1. Vercel dashboard → Your project → **Deployments**
2. Click latest deployment → **Function Logs**

---

## 🐛 Troubleshooting

### Backend Issues

**Build fails:**
- Check `backend/requirements.txt` is correct
- Verify root directory is set to `backend`
- Check Railway logs for Python errors

**Service won't start:**
- Verify all environment variables are set
- Check `PORT` variable (Railway provides automatically)
- Review logs for startup errors

**API returns 404:**
- Verify endpoint URLs in frontend match backend routes
- Check Railway deployment is active
- Test with curl: `curl https://your-backend.up.railway.app/`

### Frontend Issues

**API calls fail (CORS):**
- Verify `VITE_API_URL` is set correctly in Vercel
- Check backend CORS settings include Vercel URL
- Review browser console for CORS errors

**Environment variables not working:**
- Redeploy: `vercel --prod`
- Verify variables are set for "Production" scope
- Check variable names start with `VITE_`

**Build fails:**
- Check `package.json` scripts
- Verify all dependencies are installed
- Review Vercel build logs

### Data Issues

**News not updating:**
- Check Alpha Vantage API key is valid
- Verify NEWS_SENTIMENT endpoint (may require premium)
- Check Railway logs for API errors

**Stock data shows "simulated":**
- Verify API keys are set in Railway
- Check API rate limits (Alpha Vantage: 25/day free tier)
- Test backend endpoint: `/api/stocks/status`

---

## 💰 Cost Estimates

### Railway (Backend)
- **Free tier**: $5 credit/month
- **Hobby**: $5/month (500 hours)
- **Pro**: $20/month (unlimited)
- **Estimated**: ~$5-10/month for CLARA

### Vercel (Frontend)
- **Hobby**: Free (100GB bandwidth, 100 builds/day)
- **Pro**: $20/month (1TB bandwidth)
- **Estimated**: Free tier sufficient for development

### Total: ~$5-10/month (or free with Railway credits)

---

## 🔄 Continuous Deployment

### Auto-Deploy on Git Push

**Railway:**
- Already configured! Push to `main` branch auto-deploys backend

**Vercel:**
- Already configured! Push to `main` branch auto-deploys frontend

### Manual Deploy

**Railway:**
```bash
git push origin main
# Railway auto-deploys
```

**Vercel:**
```bash
git push origin main
# Vercel auto-deploys
# Or manually: vercel --prod
```

---

## 📊 Monitoring

### Railway Dashboard
- View real-time logs
- Monitor resource usage (CPU, memory)
- Check deployment history
- View metrics and analytics

### Vercel Dashboard
- View deployment status
- Monitor build times
- Check function logs
- View analytics (page views, bandwidth)

### Health Checks

Set up monitoring:
1. **UptimeRobot** (free): Monitor backend uptime
2. **Sentry** (optional): Error tracking
3. **LogRocket** (optional): Frontend session replay

---

## 🎉 You're Done!

Your CLARA application is now live:
- **Frontend**: https://clara-risk.vercel.app
- **Backend**: https://clara-backend-production.up.railway.app
- **API Docs**: https://clara-backend-production.up.railway.app/docs

Share your deployment URLs and start analyzing risk! 🚀
