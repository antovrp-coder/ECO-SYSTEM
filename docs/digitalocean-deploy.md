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
- `SITE_DOMAIN=<your-domain>` using the bare host only, for example `styleeehome.com`
- `WEBAUTHN_RP_ID=<your-domain>`
- `WEBAUTHN_RP_ORIGINS=https://<your-domain>`

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

## 8. Enable HTTPS with Caddy

The production stack includes a `caddy` service that:

- listens on ports `80` and `443`
- requests and renews TLS certificates automatically
- proxies public traffic to the internal `frontend` container

Before starting the stack, make sure:

- the A record for your domain points to the droplet IP
- ports `80` and `443` are open in the DigitalOcean firewall and on the droplet

If certificate issuance fails, verify that Caddy is matching the host before waiting on ACME. On the droplet, this should return the frontend response instead of a plain `404 page not found`:

```bash
curl -I -H 'Host: <your-domain>' http://127.0.0.1
```

If that host-header check returns a plain 404, `SITE_DOMAIN` is wrong or the request is not reaching the Caddy instance that owns the certificate flow.

## 9. Verify the deployment

Run on the droplet:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=100
curl -I http://localhost
curl -I https://styleeehome.com
```

## 10. Update to a newer image

When GitHub Actions publishes a new image:

```bash
cd /opt/eco-system
./deploy-prod.sh
```

For manual rollouts, update `APP_TAG` in `.env.prod` first if you want to pin a specific image tag and then rerun the script.

## 11. Automate post-merge deployment

If you want production to update automatically after a merge to `main`, configure these GitHub Actions secrets:

- `PROD_HOST` - droplet hostname or IP
- `PROD_USER` - SSH user on the droplet
- `PROD_SSH_KEY` - private SSH key for deployment
- `PROD_PORT` - optional SSH port if not `22`
- `GHCR_USERNAME` - GitHub username that can pull the production images
- `GHCR_TOKEN` - token with `read:packages` for GHCR pulls on the droplet

You can store these either as repository secrets or as environment secrets if you later bind the workflows to a GitHub environment such as `production`.

The repository includes `.github/workflows/deploy-production.yml`, which on merges to `main` will:

- build and push the backend image
- build and push the frontend image
- set `APP_TAG` on the droplet to the exact `sha-<commit>` image tag from that workflow run
- copy `Caddyfile`, `docker-compose.prod.yml`, and `deploy-prod.sh` to `/opt/eco-system`
- log in to GHCR on the droplet
- run `./deploy-prod.sh`
- restore the previous `.env.prod` and redeploy the prior version automatically if the deploy or HTTPS verification fails
- verify the deployed domain answers over HTTPS on the droplet before marking the workflow successful

This automates the normal production path after merge and makes the rollout immutable, while keeping the rest of `.env.prod` managed only on the droplet.

## 12. Roll back production manually

The repository also includes `.github/workflows/rollback-production.yml` for operator-driven rollback.

Run it from GitHub Actions with an `app_tag` input such as `sha-<commit>` or a release tag like `v1.0.0`. The workflow will:

- copy `Caddyfile`, `docker-compose.prod.yml`, and `deploy-prod.sh` to `/opt/eco-system`
- set `APP_TAG` on the droplet to the requested tag
- run `./deploy-prod.sh`
- verify the deployed domain answers over HTTPS before reporting success

## Notes

- Caddy is the only public-facing container and terminates HTTPS.
- The frontend container stays internal to the Docker network.
- The backend stays internal to the Docker network and is reached through Nginx.
- PostgreSQL data persists in the `postgres_data` volume.
- Caddy certificate data persists in the `caddy_data` volume.