"""
AutoCut AI — FastAPI Backend
Serves both the web (Next.js) and mobile (Expo/React Native) clients.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import router as api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Create upload & output dirs
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs(settings.THUMBNAIL_DIR, exist_ok=True)
    # Initialise database tables
    await init_db()
    yield
    # Cleanup on shutdown (optional: purge temp files)


app = FastAPI(
    title="AutoCut AI API",
    description="Smart video editing API — pattern cuts, AI silence removal, social exports.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow requests from the Next.js web app and from Expo (dev & production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (serve processed videos + thumbnails) ────────────────────────
app.mount("/files/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")
app.mount("/files/thumbnails", StaticFiles(directory=settings.THUMBNAIL_DIR), name="thumbnails")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "AutoCut AI API", "version": "1.0.0"}


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy"}
