# Deploying to Vercel via GitHub

This guide walks you through deploying your ERP frontend to [Vercel](https://vercel.com) directly from your GitHub repository.

---

## 1. Prerequisites
- A [GitHub](https://github.com) account with this repository pushed.
- A [Vercel](https://vercel.com) account linked to your GitHub.

---

## 2. Commit and Push to GitHub

Ensure all your latest changes and the newly added configuration files are committed and pushed to your GitHub repository:

```bash
git add .
git commit -m "Configure project for Vercel deployment"
git push origin main
```

---

## 3. Import Project into Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** &rarr; **"Project"**.
3. Under **"Import Git Repository"**, locate and select your GitHub repository (`ECO-SYSTEM`).
4. In the **Configure Project** screen:
   - **Framework Preset**: Vite *(automatically detected)*
    - **Root Directory**: Leave as `./` (Default root) OR select `erp-frontend`.
   - **Build and Output Settings**:
     - Pre-configured by `vercel.json` automatically.
     - *Build Command*: `cd erp-frontend && npm run build` (or `npm run build` if root is `erp-frontend`)
     - *Output Directory*: `erp-frontend/dist` (or `dist`)
5. Click **"Deploy"**.

---

## 4. Connecting to Your Backend API (Optional)

If your Go backend is deployed on a cloud provider (e.g. Railway, Render, Fly.io, DigitalOcean, VPS, or Kubernetes), you can proxy `/api/*` calls through Vercel:

### Option A: Edit `vercel.json` Rewrites
In [vercel.json](file:///c:/ECO-SYSTEM/vercel.json), add an API proxy rule to route API calls directly to your backend domain:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "cd erp-frontend && npm run build",
  "outputDirectory": "erp-frontend/dist",
  "installCommand": "cd erp-frontend && npm install",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-api-domain.com/api/:path*"
    },
    {
      "source": "/((?!api/|.*\\..*).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 5. Automatic CI/CD
Once connected to GitHub:
- Every `git push` to your `main` branch will trigger an **automatic production deployment**.
- Every pull request will generate a **preview deployment** URL to test before merging.
