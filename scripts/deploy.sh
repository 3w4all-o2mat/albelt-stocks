#!/usr/bin/env bash
# Run on the VPS. Loads the new image, swaps the container via docker compose,
# health-checks it, and prunes old images.
#
# Invoked by .github/workflows/deploy.yml with these env vars:
#   NEW_IMAGE   e.g. albelt-stocks:abc123   (required)
#   NEW_TAG     e.g. abc123                (used for :previous tagging)
#   PORT        host port to publish       (default 3000)
#
# Optional env file at $DEPLOY_DIR/compose.env is sourced first.

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/ubuntu/albelt-stocks}"
NEW_IMAGE="${NEW_IMAGE:-albelt-stocks:latest}"
NEW_TAG="${NEW_TAG:-latest}"
PORT="${PORT:-3000}"
CONTAINER_NAME="albelt-stocks"
IMAGE_NAME="albelt-stocks"
APP_URL="http://127.0.0.1:${PORT}"

log() { echo "[deploy $(date +%H:%M:%S)] $*"; }

# Pick a working `docker` invocation: try `docker` directly first; if the
# user can't reach /var/run/docker.sock, fall back to `sudo docker`. This
# keeps the script portable across VPS setups (user in docker group vs.
# passwordless sudo).
DOCKER=""
if docker version >/dev/null 2>&1; then
  DOCKER="docker"
elif sudo -n docker version >/dev/null 2>&1; then
  DOCKER="sudo docker"
  log "Using 'sudo docker' (no passwordless docker group membership)"
else
  log "ERROR: cannot access the docker daemon (neither 'docker' nor 'sudo -n docker' worked)"
  exit 1
fi

# Pick docker compose command (v2 plugin preferred, v1 fallback).
if ${DOCKER} compose version >/dev/null 2>&1; then
  COMPOSE=(${DOCKER} compose)
elif command -v docker-compose >/dev/null 2>&1; then
  # If the v1 binary needs elevation, wrap it in sudo too.
  if docker-compose version >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  elif sudo -n docker-compose version >/dev/null 2>&1; then
    COMPOSE=(sudo docker-compose)
  else
    log "ERROR: docker-compose (v1) is installed but not usable without a password"
    exit 1
  fi
else
  log "ERROR: neither 'docker compose' nor 'docker-compose' is installed"
  exit 1
fi

# Load optional env file (non-secret runtime config).
ENV_FILE="${DEPLOY_DIR}/compose.env"
if [ -f "${ENV_FILE}" ]; then
  log "Loading ${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

# Force these from what the workflow sent (overrides anything in compose.env).
export IMAGE="${IMAGE_NAME}"
export TAG="${NEW_TAG}"
export PORT
export COMMIT="${NEW_TAG}"
export DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cd "${DEPLOY_DIR}"
[ -f docker-compose.yml ] || { log "ERROR: docker-compose.yml missing in ${DEPLOY_DIR}"; exit 1; }

# Tag previous image for quick rollback.
if ${DOCKER} image inspect "${IMAGE_NAME}:latest" >/dev/null 2>&1 \
   && [ "${NEW_TAG}" != "latest" ]; then
  log "Tagging previous image as ${IMAGE_NAME}:previous"
  ${DOCKER} tag "${IMAGE_NAME}:latest" "${IMAGE_NAME}:previous" || true
fi

# `up -d` is idempotent: stops & removes the old container, starts the new one.
log "Recreating container with ${NEW_IMAGE} on port ${PORT}..."
"${COMPOSE[@]}" pull app 2>/dev/null \
  || log "No registry configured — using locally loaded image (this is expected)"
"${COMPOSE[@]}" up -d --remove-orphans app

# Wait for the app to become healthy (max ~60s).
log "Waiting for ${APP_URL} to respond..."
ready=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "${APP_URL}/"; then
    ready=1
    log "App is up after ${i}x2s"
    break
  fi
  sleep 2
done

if [ "${ready}" -ne 1 ]; then
  log "ERROR: App did not become healthy. Recent logs:"
  ${DOCKER} logs --tail 80 "${CONTAINER_NAME}" || true
  "${COMPOSE[@]}" ps || true
  exit 1
fi

# Prune old images: keep the 3 most recent SHA tags, plus the protected
# latest/previous tags. Sort by CreatedAt (newest first) so the freshly
# deployed images stay; remove the rest.
log "Pruning old ${IMAGE_NAME} images (keeping 3 most recent SHA tags)..."
${DOCKER} images "${IMAGE_NAME}" --format '{{.CreatedAt}}|{{.ID}}|{{.Tag}}' \
  | grep -vE '\|(latest|previous)$' \
  | sort -r \
  | tail -n +4 \
  | cut -d'|' -f2 \
  | xargs -r ${DOCKER} rmi -f 2>/dev/null || true

# Prune dangling images (untagged intermediate layers left over from builds).
log "Pruning dangling images..."
${DOCKER} image prune -f >/dev/null 2>&1 || true

log "Done. Container '${CONTAINER_NAME}' is running ${NEW_IMAGE}"
"${COMPOSE[@]}" ps
