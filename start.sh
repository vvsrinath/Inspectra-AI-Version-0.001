#!/usr/bin/env bash
# Render start command: bash start.sh
set -euo pipefail
cd "$(dirname "$0")/backend"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
