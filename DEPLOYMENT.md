# CLARA Deployment Guide

## Deploying to Vercel

CLARA is a full-stack application with a React/Vite frontend and FastAPI Python backend. Here are your deployment options:

### Option 1: Frontend Only on Vercel (Recommended)

Deploy just the frontend on Vercel and host the backend separately.

#### Steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**:
   ```bash
   vercel
   ```
   
3. **Deploy Backend Separately** on:
   - **Railway**: https://railway.app/ (easiest for Python)
   - **Render**: https://render.com/
   - **fly.io**: https://fly.io/
   - **Heroku**: https://heroku.com/

4. **Update Frontend API URL**:
   - After deploying backend, update the API URL in frontend code
   - Change `http://localhost:8000` to your backend URL
   - Files to update:
     - `src/hooks/useStockData.ts`
     - `src/services/newsService.ts`
     - Any other files making API calls

---

### Option 2: Full-Stack on Vercel (Frontend + Backend)

Deploy both frontend and backend together on Vercel using serverless functions.

#### Steps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings → Environment Variables
   - Add all variables from `backend/.env.example`:
     - `ALPHA_VANTAGE_API_KEY`
     - `TWELVEDATA_API_KEY`
     - `FINNHUB_API_KEY`
     - `SENDGRID_API_KEY`
     - `WATSONX_API_KEY`
     - `WATSONX_PROJECT_ID`
     - `GEMINI_API_KEY`
     - etc.

4. **Redeploy**:
   ```bash
   vercel --prod
   ```

#### Important Notes:

- **Serverless Limitations**: 
  - The alert monitoring agent won't run continuously (serverless functions are stateless)
  - Consider using Vercel Cron Jobs for periodic tasks
  
- **Cold Starts**: 
  - First request may be slow due to Python cold start
  - Subsequent requests will be faster

---

### Option 3: Docker Deployment (Most Flexible)

Deploy using Docker containers on any platform.

#### Create Dockerfile for Backend:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Deploy on:
- **Railway**: Connect GitHub repo, auto-deploys
- **Render**: Connect GitHub, auto-deploys
- **fly.io**: Use `fly launch` command
- **DigitalOcean App Platform**
- **AWS ECS / Google Cloud Run**

---

## Quick Start: Deploy Frontend to Vercel Now

### Using Vercel CLI:

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

### Using Vercel Dashboard:

1. Go to https://vercel.com/
2. Click "Add New" → "Project"
3. Import your GitHub repository: `DanielHu2018/CLARA`
4. Vercel will auto-detect Vite
5. Click "Deploy"

### After Deployment:

1. **Set up environment variables** in Vercel dashboard if using Option 2
2. **Update API URLs** in frontend code to point to your backend
3. **Test all features** to ensure everything works

---

## Recommended Architecture

For production, I recommend:

- **Frontend**: Vercel (fast, free tier, great for React/Vite)
- **Backend**: Railway or Render (easy Python deployment, free tier available)
- **Database**: If you add one later, use Railway PostgreSQL or Supabase

This separation gives you:
- Better scalability
- Easier debugging
- Independent scaling of frontend/backend
- No serverless limitations for background tasks

---

## Need Help?

If you encounter issues:
1. Check Vercel build logs
2. Verify all environment variables are set
3. Test API endpoints after deployment
4. Check CORS settings in backend (`main.py`)
