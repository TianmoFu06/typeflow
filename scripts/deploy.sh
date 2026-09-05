#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker is required' >&2; exit 1; }
docker compose version >/dev/null
if [[ ! -f .env ]]; then echo 'Missing .env; copy .env.example and configure APP_ORIGIN.' >&2; exit 1; fi
docker compose config --quiet
docker compose pull --policy always typeflow
docker compose up --detach --wait --wait-timeout 90 --remove-orphans
# No automatic rollback: a failed deployment remains visible for an operator to inspect.
docker compose ps
echo 'Typeflow deployed; health check passed.'
