import sys
import os

# Add backend/ to path so `from api.router import router` resolves to backend/api/
_backend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, _backend)

from main import app  # backend/main.py -> exposes FastAPI `app`
