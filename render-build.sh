#!/usr/bin/env bash
# Used by Render when build command is: bash render-build.sh
set -euo pipefail
pip install --upgrade pip
pip install -r backend/requirements.txt
