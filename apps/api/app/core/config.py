from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "AutoCut AI"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./autocut.db"

    # ── File storage ──────────────────────────────────────────────────────────
    STORAGE_TYPE: str = "local"           # "local" or "s3"
    UPLOAD_DIR: str = "storage/uploads"
    OUTPUT_DIR: str = "storage/output"
    THUMBNAIL_DIR: str = "storage/thumbnails"
    SCRATCH_DIR: str = "storage/scratch"
    
    # S3 Settings (required if STORAGE_TYPE == "s3")
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT_URL: str = ""              # for Cloudflare R2 / Minio
    
    MAX_UPLOAD_SIZE_MB: int = 4096          # 4 GB max upload
    ALLOWED_VIDEO_TYPES: List[str] = [
        "video/mp4", "video/quicktime", "video/x-msvideo",
        "video/webm", "video/mpeg", "video/x-matroska"
    ]

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",      # Next.js web (dev)
        "http://127.0.0.1:3000",      # Next.js web (dev)
        "http://localhost:8081",      # Expo web (dev)
        "http://127.0.0.1:8081",      # Expo web (dev)
        "https://viditai.com",        # production web
        "exp://localhost:8081",       # Expo Go
        "exp://127.0.0.1:8081",       # Expo Go
    ]

    # ── Processing ────────────────────────────────────────────────────────────
    FFMPEG_PATH: str = "ffmpeg"       # override if not on PATH
    FFPROBE_PATH: str = "ffprobe"     # override if not on PATH
    MAX_CONCURRENT_JOBS: int = 4
    JOB_TIMEOUT_SECONDS: int = 7200    # 2 hours per job
    # 0 = let FFmpeg auto-select (all cores); set to a positive int to cap per-job CPU threads
    FFMPEG_THREADS: int = 0
    # Empty = CPU-only. Set "cuda" (NVIDIA) or "videotoolbox" (macOS) for GPU acceleration.
    FFMPEG_HWACCEL: str = ""
    # Seconds the worker waits between DB polls when the queue is empty
    WORKER_POLL_INTERVAL_SECONDS: float = 1.0

    # ── Auth ─────────────────────────────────────────────────────────────────
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7   # 7 days
    JWT_ALGORITHM: str = "HS256"

    # ── Plans ─────────────────────────────────────────────────────────────────
    FREE_MONTHLY_EXPORTS: int = 5
    FREE_MAX_VIDEO_MINUTES: int = 120
    
    # ── Payments ──────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = "" # e.g., price_123...

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PRO_PLAN_CODE: str = "" # e.g., PL_123...
    PAYSTACK_CALLBACK_URL: str = "http://localhost:3000/dashboard/user/upgrade/success"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
