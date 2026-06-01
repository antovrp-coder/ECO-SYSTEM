# DigitalOcean Deployment

This project can be deployed on a single DigitalOcean droplet by pulling the Docker images published by GitHub Actions and starting the production compose stack.

## 1. Create the droplet

- Ubuntu 24.04 LTS is a reasonable default.
- Size the droplet for at least 2 GB RAM if you want PostgreSQL, backend, and frontend on one host.
- Point your domain DNS to the droplet public IP before enabling production WebAuthn.

## 2. Install Docker and Compose

Run on the droplet:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 3. Create a GitHub token for GHCR pulls

Create a GitHub personal access token with:

- `read:packages`
- `repo` if the package is private and tied to a private repository

## 4. Copy the deployment files to the droplet

On your local machine:

```bash
scp docker-compose.prod.yml root@your-droplet-ip:/opt/eco-system/
scp .env.prod.example root@your-droplet-ip:/opt/eco-system/.env.prod
scp deploy-prod.sh root@your-droplet-ip:/opt/eco-system/
```

If `/opt/eco-system` does not exist yet:

```bash
ssh root@your-droplet-ip "mkdir -p /opt/eco-system"
```

## 5. Configure production environment values

Edit `/opt/eco-system/.env.prod` and set:

- `BACKEND_IMAGE=ghcr.io/<github-owner>/erp-backend`
- `FRONTEND_IMAGE=ghcr.io/<github-owner>/erp-frontend`
- `APP_TAG=latest` or a specific release tag such as `v1.0.0`
- `POSTGRES_PASSWORD=<strong-password>`
- `WEBAUTHN_RP_ID=<your-domain>`
- `WEBAUTHN_RP_ORIGINS=https://<your-domain>`
- `FRONTEND_PORT=80`

## 6. Log in to GHCR on the droplet

Run on the droplet:

```bash
echo '<github-token>' | docker login ghcr.io -u <github-username> --password-stdin
```

## 7. Start the application

Run on the droplet:

```bash
cd /opt/eco-system
chmod +x deploy-prod.sh
./deploy-prod.sh
```

This script pulls the latest configured images and starts the stack in detached mode.

## 8. Verify the deployment

Run on the droplet:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=100
curl http://localhost/health
```

## 9. Update to a newer image

When GitHub Actions publishes a new image:

```bash
cd /opt/eco-system
./deploy-prod.sh
```

If you pin a tag in `.env.prod`, update `APP_TAG` first and rerun the script.

## Notes

- The frontend container exposes port 80 by default.
- The backend stays internal to the Docker network and is reached through Nginx.
- PostgreSQL data persists in the `postgres_data` volume.
- For HTTPS in production, place a reverse proxy such as Caddy, Nginx, or Traefik in front of the frontend container, or terminate TLS directly on the droplet.