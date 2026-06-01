#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
ENV_FILE="$SCRIPT_DIR/.env.prod"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env.prod not found next to deploy-prod.sh"
  exit 1
fi
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker image prune -f >/dev/null 2>&1 || true

echo "Deployment complete."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps