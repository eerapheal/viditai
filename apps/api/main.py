import sys
import asyncio

# ── Windows Subprocess Fix ──────────────────────────────────────────────────
# The default SelectorEventLoop on Windows does not support subprocesses.
# We must use ProactorEventLoop for FFmpeg/FFprobe calls to work.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

# ── Starlette large-file upload fix ─────────────────────────────────────────
# Starlette's default multipart parser buffers the entire body in memory with
# a hard cap of 1 MB. Any video larger than that is rejected with
# "There was an error parsing the body" before the endpoint runs.
# We raise this to match MAX_UPLOAD_SIZE_MB from config (4 GB by default).
from starlette.formparsers import MultiPartParser
MultiPartParser.max_fields = 10_000
MultiPartParser.max_files = 100
# Some versions of Starlette/FastAPI use max_parts to limit total components
if hasattr(MultiPartParser, "max_parts"):
    MultiPartParser.max_parts = 10_000

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
    
    # ── START WORKER IN BACKGROUND ──────────────────────────────────────────
    from app.worker import main_loop
    worker_task = asyncio.create_task(main_loop())
    logger.info("🚀 AI Engine (Worker) integrated and running in background")
    
    yield
    
    # Shutdown
    worker_task.cancel()
    logger.info("Application shutting down")
    # Cleanup on shutdown (optional: purge temp files)


_max_upload_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # e.g. 4 GB

app = FastAPI(
    title="AutoCut AI API",
    description="Smart video editing API — pattern cuts, AI silence removal, social exports.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
# ── Middleware (Order matters!) ───────────────────────────────────────────────
import time
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class ProcessTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            # We must catch exceptions here too for the process time, 
            # or rely on the global exception handler below.
            raise exc
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response

app.add_middleware(ProcessTimeMiddleware)

# Global Exception Handler to avoid CORS masking on 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

# ── CORS (Added last so it's outermost for responses) ──────────────────────────
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
os.makedirs(settings.SCRATCH_DIR, exist_ok=True)

app.mount("/files/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")
app.mount("/files/thumbnails", StaticFiles(directory=settings.THUMBNAIL_DIR), name="thumbnails")
app.mount("/files/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Moved to middleware section

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
