# ProCare Hub - Deployment Guide

## For Tomorrow (Quick Deploy)

### Option 1: Vercel (Frontend Only)

**Step 1:** Save code to GitHub
- Click "Save to GitHub" in Emergent

**Step 2:** Go to Vercel
- https://vercel.com/new
- Import `procare-hub` repo

**Step 3:** Settings
```
Root Directory: frontend
Build Command: yarn install && yarn build
Output Directory: build
```

**Step 4:** Click Deploy

---

### Option 2: Railway (Full Stack - Recommended)

**Step 1:** Save code to GitHub first

**Step 2:** Go to Railway
- https://railway.app/new

**Step 3:** Add MongoDB
- Click "+ New" → "Database" → "MongoDB"
- Copy the `MONGO_URL` connection string

**Step 4:** Add Backend Service
- Click "+ New" → "GitHub Repo" → Select `procare-hub`
- Settings:
  - Root Directory: `backend`
  - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Add Environment Variables:
  ```
  MONGO_URL=<paste from step 3>
  JWT_SECRET=procare-hub-secret-key-2024
  MICROSOFT_CLIENT_ID=34b4d0de-1ea6-4f84-9f00-960468f1870f
  MICROSOFT_CLIENT_SECRET=Ohs8Q~L_EyEg2oi84PoDvnmnvKPDE0lZsZ912b4F
  MICROSOFT_TENANT_ID=f3bbd695-2fd7-469d-b60a-cd256b6f9e27
  GOOGLE_SSO_CLIENT_ID=401101051877-5n8irvf36tvpjhiu48i3m387og8389vp.apps.googleusercontent.com
  GOOGLE_SSO_CLIENT_SECRET=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
  XERO_CLIENT_ID=25D31CB0ED12423BBF164CF1A10B14C0
  XERO_CLIENT_SECRET=4R8gDQwV15DI70JAdKC00rqIPfpwt0oUmaWeHSq8vjhcHG9-
  ```

**Step 5:** Add Frontend Service  
- Click "+ New" → "GitHub Repo" → Select `procare-hub`
- Settings:
  - Root Directory: `frontend`
  - Build Command: `yarn install && yarn build`
  - Start Command: `npx serve -s build -l $PORT`
- Add Environment Variable:
  ```
  REACT_APP_BACKEND_URL=<backend URL from step 4>
  ```

**Step 6:** Add Custom Domain
- Click on Frontend service → Settings → Domains
- Add: `app.procare-hub.com`
- Update DNS at your domain registrar

---

## Current Status

| Feature | Status |
|---------|--------|
| Microsoft SSO | ✅ Real credentials configured |
| Google SSO | ✅ Real credentials configured |
| Xero Integration | ✅ Real credentials configured |
| Landing Page | ✅ Complete |
| Login Security | ✅ 2FA, Biometrics, Password strength |
| Privacy/Terms | ✅ Pages created |
| PWA | ✅ Installable app |

## Preview URL (Working Now)
https://http-studio.preview.emergentagent.com

## Your Credentials (Already Configured)

### Microsoft SSO
- Client ID: 34b4d0de-1ea6-4f84-9f00-960468f1870f
- Tenant ID: f3bbd695-2fd7-469d-b60a-cd256b6f9e27

### Google SSO  
- Client ID: 401101051877-5n8irvf36tvpjhiu48i3m387og8389vp.apps.googleusercontent.com

### Xero
- Client ID: 25D31CB0ED12423BBF164CF1A10B14C0

## After Deployment - Update Redirect URIs

### Microsoft Azure
Go to: Azure Portal → App registrations → ProCare Hub → Authentication
Add: `https://app.procare-hub.com/auth/callback`

### Google Cloud
Go to: Google Cloud Console → APIs & Services → Credentials → Your OAuth client
Add: `https://app.procare-hub.com/auth/callback`

### Xero
Go to: developer.xero.com → Your app → Configuration
Update redirect URI to: `https://app.procare-hub.com/auth/xero/callback`
