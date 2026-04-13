"""
Video management endpoints — upload, list, detail, delete
"""
import os
import uuid
import shutil
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoUploadResponse, VideoListItem, VideoDetail
from app.services.ffmpeg import probe_video, generate_thumbnail

router = APIRouter()


def _thumbnail_url(video: Video, request_base: str = "") -> Optional[str]:
    if not video.thumbnail_path:
        return None
    filename = os.path.basename(video.thumbnail_path)
    return f"/files/thumbnails/{filename}"


def _to_upload_response(video: Video) -> VideoUploadResponse:
    return VideoUploadResponse(
        id=video.id,
        original_filename=video.original_filename,
        file_size_bytes=video.file_size_bytes,
        duration_seconds=video.duration_seconds,
        width=video.width,
        height=video.height,
        fps=video.fps,
        has_audio=video.has_audio,
        thumbnail_url=_thumbnail_url(video),
        created_at=video.created_at,
    )


@router.post("/upload", response_model=VideoUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a raw video file. Triggers auto-probe (duration, fps, resolution).
    Returns video metadata immediately — processing jobs are submitted separately.
    """
    # ── Validate MIME type ────────────────────────────────────────────────────
    if file.content_type not in settings.ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported video type: {file.content_type}. "
                   f"Allowed: {settings.ALLOWED_VIDEO_TYPES}",
        )

    # ── Check free-plan video length limit (enforced post-probe) ─────────────
    safe_ext = (file.filename or "video.mp4").rsplit(".", 1)[-1].lower()
    stored_name = f"{uuid.uuid4().hex}.{safe_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    # ── Stream to disk ────────────────────────────────────────────────────────
    size = 0
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(file_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            size += len(chunk)
            if size > max_bytes:
                out.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
                )
            out.write(chunk)

    # ── FFprobe ───────────────────────────────────────────────────────────────
    try:
        meta = await probe_video(file_path)
    except Exception as exc:
        os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Could not read video metadata: {exc}")

    # ── Enforce free plan duration cap ────────────────────────────────────────
    from app.models.user import Plan
    if current_user.plan == Plan.FREE:
        max_dur = settings.FREE_MAX_VIDEO_MINUTES * 60
        if meta["duration_seconds"] > max_dur:
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free plan is limited to {settings.FREE_MAX_VIDEO_MINUTES}-minute videos. "
                       "Upgrade to Pro for unlimited length.",
            )

    # ── Generate thumbnail ────────────────────────────────────────────────────
    thumb_filename = f"{uuid.uuid4().hex}.jpg"
    thumb_path = os.path.join(settings.THUMBNAIL_DIR, thumb_filename)
    os.makedirs(settings.THUMBNAIL_DIR, exist_ok=True)
    try:
        ts = min(1.0, meta["duration_seconds"] / 2)
        await generate_thumbnail(file_path, thumb_path, timestamp=ts)
    except Exception:
        thumb_path = None  # non-fatal

    # ── Persist to DB ─────────────────────────────────────────────────────────
    video = Video(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        original_filename=file.filename or stored_name,
        stored_filename=stored_name,
        file_path=file_path,
        file_size_bytes=size,
        mime_type=file.content_type,
        duration_seconds=meta["duration_seconds"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        has_audio=meta["has_audio"],
        thumbnail_path=thumb_path,
        title=title,
        description=description,
    )
    db.add(video)
    await db.flush()

    return _to_upload_response(video)


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

    items = [
        VideoListItem(
            id=v.id,
            original_filename=v.original_filename,
            title=v.title,
            duration_seconds=v.duration_seconds,
            width=v.width,
            height=v.height,
            thumbnail_url=_thumbnail_url(v),
            created_at=v.created_at,
        )
        for v in videos
    ]

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
        id=video.id,
        original_filename=video.original_filename,
        title=video.title,
        description=video.description,
        file_size_bytes=video.file_size_bytes,
        mime_type=video.mime_type,
        duration_seconds=video.duration_seconds,
        width=video.width,
        height=video.height,
        fps=video.fps,
        has_audio=video.has_audio,
        thumbnail_url=_thumbnail_url(video),
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
