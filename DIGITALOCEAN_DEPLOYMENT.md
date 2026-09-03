# DigitalOcean Deployment Guide for ECO-SYSTEM ERP

This guide provides three streamlined options to deploy the **ECO-SYSTEM ERP** (React 18 + Vite frontend, Go Gin backend, PostgreSQL) on **DigitalOcean**.

---

## 🚀 Option 1: DigitalOcean App Platform (Recommended — Fully Managed)

The easiest and most scalable way to run the application with automatic SSL, continuous deployment from GitHub, and managed PostgreSQL.

### Step 1: Push Changes to Git
Ensure your repository is pushed to GitHub/GitLab:
```bash
git add .
git commit -m "feat: complete React 18 migration, DigitalOcean App spec, and k8s manifests"
git push origin dev  # (or main)
```

### Step 2: Deploy via DigitalOcean Dashboard
1. Log in to your [DigitalOcean Cloud Console](https://cloud.digitalocean.com/apps).
2. Click **Create** &rarr; **Apps**.
3. Choose **GitHub** (or GitLab) as the source and select your repository (`ECO-SYSTEM`).
4. Select the branch you want to deploy (`main` or `dev`).
5. DigitalOcean will automatically detect [.do/app.yaml](file:///c:/ECO-SYSTEM/.do/app.yaml) which configures:
   - **`erp-frontend`**: React 18 + Vite Static Site (`npm run build` &rarr; `dist`)
   - **`erp-backend`**: Go Gin Web Service (`erp-backend/Dockerfile`)
   - **`db`**: Managed PostgreSQL Database
6. Click **Next** &rarr; Review resources &rarr; Click **Create Resources**.
7. Once deployment finishes, DigitalOcean provides a live HTTPS URL (`https://your-app-name.ondigitalocean.app`).

---

## 🐳 Option 2: DigitalOcean Droplet (Docker Compose + Caddy HTTPS)

Ideal for dedicated VPS hosting ($4-$12/mo Droplet).

### Step 1: Create a Droplet
1. Create an **Ubuntu 24.04 LTS** Droplet (Basic, 2GB RAM / 1 vCPU recommended).
2. Connect via SSH:
   ```bash
   ssh root@<YOUR_DROPLET_IP>
   ```

### Step 2: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y docker-compose-plugin
```

### Step 3: Clone Repository & Configure
```bash
git clone <YOUR_GIT_REPO_URL> /opt/eco-system
cd /opt/eco-system

# Create production environment config
cp .env.prod.example .env.prod
nano .env.prod
```
Set your production values in `.env.prod`:
```env
POSTGRES_PASSWORD=your_secure_db_password
SITE_DOMAIN=erp.yourdomain.com
WEBAUTHN_RP_ID=erp.yourdomain.com
WEBAUTHN_RP_ORIGINS=https://erp.yourdomain.com
```

### Step 4: Build and Start Containers
```bash
# Build & start all services with automatic Caddy TLS
docker compose -f docker-compose.prod.yml up -d --build

# Verify all containers are healthy
docker compose -f docker-compose.prod.yml ps
```

---

## ☸️ Option 3: DigitalOcean Kubernetes (DOKS)

For enterprise high-availability and multi-node scaling.

### Step 1: Connect `kubectl` to your DOKS Cluster
```bash
doctl kubernetes cluster kubeconfig save <CLUSTER_NAME>
```

### Step 2: Deploy ERP Stack
```bash
# Deploy all resources using Kustomize
kubectl apply -k k8s/

# Verify running pods and ingress
kubectl get all -n erp-system
```

---

## 📋 Pre-Flight Verification Checklist

- [x] **React 18 Frontend**: Clean standalone Vite build (`npm run build` &rarr; `dist`).
- [x] **Go Gin Backend**: Static binary build and healthy `/health` endpoint.
- [x] **Database Migrations**: Native PostgreSQL auto-migration for RBAC roles, users, and session activity.
- [x] **Static Assets & Routing**: Nginx and App Platform SPA catchall routing configured to `index.html`.
- [x] **HTTPS / Passkeys**: FIDO2 RP configuration dynamic and ready for production domain.
