"""Render sometimes runs `gunicorn Inspectra-AI-Version-0.001.wsgi` — this shim starts uvicorn instead."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path


def _find_backend_dir() -> Path:
    candidates = [
        Path("/opt/render/project/src/backend"),
        Path.cwd() / "backend",
        Path(__file__).resolve().parents[2] / "backend",
    ]
    for path in candidates:
        if (path / "main.py").is_file():
            return path
    raise RuntimeError("Inspectra backend/main.py not found")


def main() -> None:
    # #region agent log
    payload = {
        "sessionId": "cb0074",
        "hypothesisId": "H1",
        "location": "inspectra_gunicorn_shim:main",
        "message": "gunicorn_shim_start",
        "data": {"argv": sys.argv[1:], "cwd": os.getcwd(), "port": os.environ.get("PORT")},
        "timestamp": int(time.time() * 1000),
    }
    print(json.dumps(payload), file=sys.stderr, flush=True)
    # #endregion

    backend = _find_backend_dir()
    os.chdir(backend)
    sys.path.insert(0, str(backend))

    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
