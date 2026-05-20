#!/usr/bin/env bash
# Render → Settings → Start Command: bash start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}/backend"
echo "Starting Inspectra API on port ${PORT:-8000} (cwd=$(pwd))"
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
