#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
ENV_FILE="$SCRIPT_DIR/.env.prod"
COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-180}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-5}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env.prod not found next to deploy-prod.sh"
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "docker-compose.prod.yml not found next to deploy-prod.sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed or not on PATH"
  exit 1
fi

docker compose "${COMPOSE_ARGS[@]}" config --quiet
docker compose "${COMPOSE_ARGS[@]}" pull
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans

wait_for_service() {
  local service="$1"
  local deadline=$((SECONDS + STARTUP_TIMEOUT_SECONDS))

  while (( SECONDS < deadline )); do
    local container_id
    container_id="$(docker compose "${COMPOSE_ARGS[@]}" ps -q "$service")"

    if [[ -z "$container_id" ]]; then
      sleep "$POLL_INTERVAL_SECONDS"
      continue
    fi

    local state
    state="$(docker inspect -f '{{.State.Status}}' "$container_id")"

    if [[ "$state" != "running" ]]; then
      sleep "$POLL_INTERVAL_SECONDS"
      continue
    fi

    local health
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id")"

    if [[ "$health" == "healthy" || "$health" == "none" ]]; then
      return 0
    fi

    sleep "$POLL_INTERVAL_SECONDS"
  done

  echo "Service '$service' did not become ready within ${STARTUP_TIMEOUT_SECONDS}s"
  return 1
}

for service in postgres backend frontend caddy; do
  if ! wait_for_service "$service"; then
    docker compose "${COMPOSE_ARGS[@]}" ps
    docker compose "${COMPOSE_ARGS[@]}" logs --tail=100
    exit 1
  fi
done

docker image prune -f >/dev/null 2>&1 || true

echo "Deployment complete."
docker compose "${COMPOSE_ARGS[@]}" ps