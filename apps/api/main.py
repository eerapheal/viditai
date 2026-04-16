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
from app.core.logging_config import setup_logging

# ── Logging ──────────────────────────────────────────────────────────────────
logger = setup_logging()

# ── Rate Limiting ───────────────────────────────────────────────────────────
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Initialise database tables
    await init_db()
    
    # Seed default presets
    from app.api.v1.presets import seed_default_presets
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await seed_default_presets(db)
        
    logger.info("Application started — Database initialized and seeded")
    yield
    logger.info("Application shutting down")
    # Cleanup on shutdown (optional: purge temp files)


app = FastAPI(
    title="AutoCut AI API",
    description="Smart video editing API — pattern cuts, AI silence removal, social exports.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
# ── Storage Setup ────────────────────────────────────────────────────────────
# Ensure directories exist before mounting StaticFiles
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
os.makedirs(settings.THUMBNAIL_DIR, exist_ok=True)

app.mount("/files/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")
app.mount("/files/thumbnails", StaticFiles(directory=settings.THUMBNAIL_DIR), name="thumbnails")

# ── Middleware ───────────────────────────────────────────────────────────────
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log requests in production
    if not settings.DEBUG:
        logger.info(
            "Request",
            extra={
                "method": request.method,
                "url": str(request.url),
                "process_time": process_time,
                "status_code": response.status_code
            }
        )
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "AutoCut AI API", "version": "1.0.0"}


@app.get("/health", tags=["health"])
async def health_check():
    from app.core.database import check_db_health
    db_ok = await check_db_health()
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
    }
