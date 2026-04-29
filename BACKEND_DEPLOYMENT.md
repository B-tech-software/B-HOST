# Deploy Backend to Google Cloud Run (Free Tier)

## Prerequisites
1. Google account (free)
2. GitHub repo pushed (you already have it)

## Step-by-step Deployment

### 1. Create Google Cloud Project
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Click project dropdown → "New Project"
- Name it: `linkup`
- Click Create (wait ~1 minute)

### 2. Enable Cloud Run API
- In console, search: "Cloud Run API"
- Click "Enable"

### 3. Deploy from GitHub
- In Cloud Run console, click "Create Service"
- Select "Continuously deploy from a Git repository"
- Click "Set up with Cloud Build"
- Authorize GitHub
- Select repo: `B-tech-software/B-HOST`
- Select branch: `main`
- Path to Dockerfile: `backend-flask/Dockerfile`

### 4. Configure Service
- Service name: `linkup`
- Region: `us-central1` (or nearest to you)
- Authentication: "Allow unauthenticated invocations" (for frontend access)
- Memory: `256 MB`
- CPU: `1`
- Timeout: `3600` seconds

### 5. Set Environment Variables
In "Runtime settings" → "Runtime environment variables", add:
```
FIREBASE_PROJECT_ID=linkup-bf61a
```
(Add other Firebase secrets if needed from your `.env` file)

### 6. Deploy
- Click "Create"
- Wait 2-5 minutes for build & deploy
- Once done, you'll see a public URL like: `https://linkup-xxxxx.run.app`

### 7. Update Netlify Frontend
- Copy your Cloud Run URL
- In both Netlify sites (B-HOST and B-host-GateScanner-app), update env var:
  - `VITE_API_BASE_URL=https://linkup-xxxxx.run.app`
  - `VITE_API_URL=https://linkup-xxxxx.run.app`
- Click "Trigger deploy"

## Free Tier Details
- **2 million requests/month free**
- **360,000 GB-seconds free** (enough for small projects)
- **Auto-scales to zero** (no charge when not used)
- **Fully managed** (no server maintenance)

## After First Deploy
- Every push to `main` branch auto-redeploys
- View logs: Cloud Run console → Service → Logs tab

That's it! Your backend is now live on Google Cloud Run. 🚀
