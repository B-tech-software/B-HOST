# Deployment Guide for B-Raise

## Frontend Deployments (Netlify)

### B-HOST (b-raise)
1. Push code to GitHub repository
2. Go to [Netlify](https://app.netlify.com)
3. Click "New site from Git"
4. Connect your GitHub repo
5. Set site name to: `B-HOST`
6. Build command: `npm run build`
7. Publish directory: `dist`
8. Set environment variable: `VITE_API_BASE_URL=https://linkup.firebaseapp.com`
9. Deploy!

### B-host-GateScanner-app (scanner-app)
1. Same steps as above
2. Set site name to: `B-host-GateScanner-app`
3. Same build settings

---

## Backend Deployment (Firebase)

### Setup
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in backend-flask:
   ```bash
   cd backend-flask
   firebase init
   ```

4. Deploy Flask app to Firebase Cloud Run:
   ```bash
   firebase deploy --project linkup
   ```

---

## Environment Variables

### Netlify (Both Frontend Apps)
- `VITE_API_BASE_URL` = `https://linkup.firebaseapp.com` (production)
- `VITE_API_BASE_URL` = `http://localhost:5000` (local development)

### Firebase Backend (linkup)
Configure in `.env` file:
- `FIREBASE_PROJECT_ID=linkup`
- Add other Firebase credentials as needed

---

## Quick Updates
Once set up with GitHub:
1. Make changes locally
2. Commit and push to GitHub
3. Netlify auto-deploys both frontends
4. For backend: `firebase deploy --project linkup`

Both sites will be live at:
- Frontend 1: https://b-host.netlify.app
- Frontend 2: https://b-host-gatescanner-app.netlify.app
- Backend API: https://linkup.firebaseapp.com
