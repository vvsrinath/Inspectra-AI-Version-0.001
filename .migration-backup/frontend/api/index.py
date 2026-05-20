"""Vercel serverless entry — exposes FastAPI at /api/*"""
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent / "_backend"
if not _backend.is_dir():
    raise RuntimeError(
        "api/_backend missing. Run: npm run prebuild (copies ../backend)"
    )
sys.path.insert(0, str(_backend))

from mangum import Mangum  # noqa: E402
from main import app  # noqa: E402

handler = Mangum(app, lifespan="off")
