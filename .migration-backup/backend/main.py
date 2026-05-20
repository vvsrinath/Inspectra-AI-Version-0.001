import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.router import router
from middleware.workspace import WorkspaceMiddleware

_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]
_extra_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
_origin_regex = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"https://.*\.vercel\.app",
)

app = FastAPI(
    title="Inspectra AI API",
    description="Backend API for Inspectra AI — classical CV, in-memory processing",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-workspace-id"],
)
app.add_middleware(WorkspaceMiddleware)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
