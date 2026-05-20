import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the existing router from the backend package
from backend.api.router import router

app = FastAPI(
    title="Inspectra AI API",
    description="Backend API for Inspectra AI — classical CV, in-memory processing",
    version="2.0.0",
)

# CORS – allow calls from the same Vercel domain (frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Vercel expects a variable named `handler` for the ASGI app
handler = app
