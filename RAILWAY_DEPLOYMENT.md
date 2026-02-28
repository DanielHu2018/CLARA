# 🚂 Deploy CLARA Backend on Railway

Railway is the easiest way to deploy your FastAPI backend with continuous background tasks.

## Step-by-Step Deployment

### 1. Create Railway Account

1. Go to https://railway.app/
2. Sign up with GitHub (recommended)
3. Authorize Railway to access your repositories

### 2. Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: **`DanielHu2018/CLARA`**
4. Railway will detect it's a Python project

### 3. Configure the Service

1. **Set Root Directory**:
   - Click on your service
   - Go to **Settings** → **Service**
   - Set **Root Directory**: `backend`
   - Railway will now only deploy the backend folder

2. **Verify Start Command** (should auto-detect):
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Railway automatically provides the `$PORT` variable

### 4. Add Environment Variables

Click **Variables** tab and add these (from your `backend/.env` file):

```
ALPHA_VANTAGE_API_KEY=8JY3OYV16MK0T8PV
TWELVEDATA_API_KEY=your_twelvedata_key_here
FINNHUB_API_KEY=your_finnhub_key_here
SENDGRID_API_KEY=your_sendgrid_key_here
SENDGRID_FROM_EMAIL=CLARA@yourdomain.com
SENDGRID_FROM_NAME=CLARA Alert Agent
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_USE_TLS=true
WATSONX_API_KEY=your_watsonx_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-instruct-v2
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.0-flash
AI_PROVIDER=auto
AI_TIMEOUT_SECONDS=20
WATSON_DISCOVERY_API_KEY=your_watson_discovery_key_here
WATSON_DISCOVERY_URL=https://api.us-south.discovery.watson.cloud.ibm.com
WATSON_DISCOVERY_ENV_ID=your_environment_id_here
APP_ENV=production
LOG_LEVEL=INFO
ALERT_CHECK_INTERVAL_SECONDS=30
ALERT_COOLDOWN_HOURS=4
MONTE_CARLO_PATHS=10000
SEC_EDGAR_USER_AGENT=Clara-RiskPlatform contact@yourdomain.com
```

**Important**: Replace placeholder values with your actual API keys!

### 5. Deploy

1. Click **"Deploy"**
2. Railway will:
   - Install dependencies from `requirements.txt`
   - Start your FastAPI server
   - Provide a public URL (e.g., `https://clara-backend-production.up.railway.app`)

### 6. Get Your Backend URL

After deployment:
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy your backend URL (e.g., `https://clara-backend-production.up.railway.app`)

---

## Update Frontend to Use Railway Backend

After deploying, you need to update the frontend to use your Railway backend URL instead of `localhost:8000`.

### Option A: Environment Variable (Recommended)

1. Create `.env` in the root directory:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   ```

2. Update frontend code to use this variable (I can help with this)

### Option B: Direct Update

Update these files to replace `http://localhost:8000` with your Railway URL:
- `src/hooks/useStockData.ts`
- `src/services/newsService.ts`
- Any other files making API calls

---

## Monitoring Your Deployment

### View Logs:
1. Click on your service in Railway
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. View real-time logs

### Check Health:
- Visit: `https://your-backend.up.railway.app/`
- Should return: `{"system":"CLARA","version":"1.0.0","status":"operational"}`
- API docs: `https://your-backend.up.railway.app/docs`

---

## Troubleshooting

### Build Fails:
- Check **Logs** tab for errors
- Verify `requirements.txt` is correct
- Ensure root directory is set to `backend`

### Service Won't Start:
- Check environment variables are set correctly
- Verify `PORT` variable is being used (Railway provides this automatically)
- Check logs for Python errors

### CORS Errors:
- Update `main.py` CORS settings to include your Vercel frontend URL
- Add your Vercel URL to `allow_origins` list

---

## Cost

Railway offers:
- **Free tier**: $5 credit/month (enough for development)
- **Pro**: $20/month for production apps
- Your backend should cost ~$5-10/month depending on usage

---

## Next Steps

After Railway backend is deployed:
1. Get your backend URL
2. Update frontend API URLs
3. Deploy frontend to Vercel
4. Test end-to-end
5. Monitor logs and performance

Need help with any of these steps? Let me know!
