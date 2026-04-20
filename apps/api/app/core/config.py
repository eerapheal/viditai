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
    
    # S3 Settings (required if STORAGE_TYPE == "s3")
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT_URL: str = ""              # for Cloudflare R2 / Minio
    
    MAX_UPLOAD_SIZE_MB: int = 500          # 500 MB max upload
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
    JOB_TIMEOUT_SECONDS: int = 600    # 10 min per job

    # ── Auth ─────────────────────────────────────────────────────────────────
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7   # 7 days
    JWT_ALGORITHM: str = "HS256"

    # ── Plans ─────────────────────────────────────────────────────────────────
    FREE_MONTHLY_EXPORTS: int = 5
    FREE_MAX_VIDEO_MINUTES: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
