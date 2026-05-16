"""
Video management endpoints — upload, list, detail, delete
"""
import os
import uuid
import shutil
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoUploadResponse, VideoListItem, VideoDetail
from app.services.storage import storage_service
from app.core.logging_config import logger
from app.core.limiter import limiter
import tempfile

router = APIRouter()


async def _thumbnail_url(video: Video) -> Optional[str]:
    if not video.thumbnail_path:
        return None
    return await storage_service.get_download_url(video.thumbnail_path)


def _to_upload_response(video: Video, thumb_url: Optional[str] = None) -> VideoUploadResponse:
    return VideoUploadResponse(
        video_id=video.id,
        original_filename=video.original_filename,
        file_size_bytes=video.file_size_bytes,
        duration=video.duration_seconds,
        width=video.width,
        height=video.height,
        has_audio=video.has_audio,
        thumbnail_url=thumb_url,
        created_at=video.created_at,
    )


@router.post("/upload", response_model=VideoUploadResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a raw video file. Triggers auto-probe (duration, fps, resolution).
    Streams the body to a temp file in chunks; Starlette is configured to
    spool to disk rather than buffer in RAM for files over 1 MB.
    """
    logger.info(f"Starting upload: {file.filename} (user: {current_user.id})")

    if file.content_type not in settings.ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported video type: {file.content_type}.",
        )

    safe_ext = (file.filename or "video.mp4").rsplit(".", 1)[-1].lower()
    stored_name = f"{uuid.uuid4().hex}.{safe_ext}"
    
    # ── 1. Stream to Temporary File for Processing ───────────────────────────
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{safe_ext}") as tmp:
        size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                tmp.close()
                os.remove(tmp.name)
                raise HTTPException(status_code=413, detail="File too large.")
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        from app.services.ffmpeg import probe_video, generate_thumbnail
        
        # ── 2. Probe ──────────────────────────────────────────────────────────
        meta = await probe_video(tmp_path)
        
        # Enforce free plan limits
        from app.models.user import Plan
        if current_user.plan == Plan.FREE and meta["duration_seconds"] > (settings.FREE_MAX_VIDEO_MINUTES * 60):
            os.remove(tmp_path)
            raise HTTPException(status_code=403, detail="Free plan duration limit exceeded.")

        # ── 3. Generate Thumbnail (local temp) ───────────────────────────────
        thumb_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg").name
        ts = min(1.0, meta["duration_seconds"] / 2)
        await generate_thumbnail(tmp_path, thumb_tmp, timestamp=ts)

        # ── 4. Upload to Permanent Storage ────────────────────────────────────
        # Final paths in storage
        storage_video_path = f"{settings.UPLOAD_DIR}/{stored_name}"
        storage_thumb_path = f"{settings.THUMBNAIL_DIR}/{uuid.uuid4().hex}.jpg"

        with open(tmp_path, "rb") as f:
            await storage_service.upload_file(f, storage_video_path)
        
        with open(thumb_tmp, "rb") as f:
            await storage_service.upload_file(f, storage_thumb_path)

        # ── 5. Persist to DB ──────────────────────────────────────────────────
        video = Video(
            id=str(uuid.uuid4()),
            owner_id=current_user.id,
            original_filename=file.filename or stored_name,
            stored_filename=stored_name,
            file_path=storage_video_path,
            file_size_bytes=size,
            mime_type=file.content_type,
            duration_seconds=meta["duration_seconds"],
            width=meta["width"],
            height=meta["height"],
            fps=meta["fps"],
            has_audio=meta["has_audio"],
            thumbnail_path=storage_thumb_path,
            title=title,
            description=description,
        )
        db.add(video)
        await db.flush()

        # Clean up temp files
        os.remove(tmp_path)
        os.remove(thumb_tmp)

        thumb_url = await _thumbnail_url(video)
        return _to_upload_response(video, thumb_url)

    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=dict)
async def list_videos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all videos belonging to the authenticated user (paginated)."""
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(Video.id)).where(Video.owner_id == current_user.id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Video)
        .where(Video.owner_id == current_user.id)
        .order_by(Video.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    videos = result.scalars().all()

    import asyncio
    items = []
    for v in videos:
        items.append(
            VideoListItem(
                id=v.id,
                original_filename=v.original_filename,
                title=v.title,
                duration_seconds=v.duration_seconds,
                width=v.width,
                height=v.height,
                thumbnail_url=await _thumbnail_url(v),
                created_at=v.created_at,
            )
        )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [i.model_dump() for i in items],
    }


@router.get("/{video_id}", response_model=VideoDetail)
async def get_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full detail of a single video."""
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.owner_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    return VideoDetail(
        video_id=video.id,
        original_filename=video.original_filename,
        title=video.title,
        description=video.description,
        file_size_bytes=video.file_size_bytes,
        mime_type=video.mime_type,
        duration=video.duration_seconds,
        width=video.width,
        height=video.height,
        fps=video.fps,
        has_audio=video.has_audio,
        thumbnail_url=await _thumbnail_url(video),
        type=video.type,
        source_video_id=video.source_video_id,
        created_at=video.created_at,
    )


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a video and its associated files."""
    result = await db.execute(
        select(Video).where(Video.id == video_id, Video.owner_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    # Remove files from disk
    for path in [video.file_path, video.thumbnail_path]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    await db.delete(video)
    await db.flush()
