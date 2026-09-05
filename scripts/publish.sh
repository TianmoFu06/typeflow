#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
: "${REGISTRY_USERNAME:?Set REGISTRY_USERNAME}"
: "${REGISTRY_PASSWORD:?Set REGISTRY_PASSWORD}"
command -v docker >/dev/null
sha="$(git rev-parse HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then echo 'Commit changes before publishing an image.' >&2; exit 1; fi
npm test
npm run check
printf '%s' "$REGISTRY_PASSWORD" | docker login registry.huangyut1ng.com --username "$REGISTRY_USERNAME" --password-stdin
docker buildx build --platform linux/amd64,linux/arm64 --tag registry.huangyut1ng.com/typeflow:latest --tag "registry.huangyut1ng.com/typeflow:sha-$sha" --push .
