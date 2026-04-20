"""
Job endpoints — create, status, list, cancel, download
Background processing is handled by the worker (app/worker.py).
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User, Plan
from app.models.job import Job, JobType, JobStatus
from app.models.video import Video
from app.models.preset import Preset
from app.schemas.job import JobCreate, JobResponse
from app.core.logging_config import logger
from app.core.limiter import limiter
from fastapi import Request

from app.services.storage import storage_service

router = APIRouter()


async def _build_job_response(job: Job) -> JobResponse:
    download_url = None
    if job.status == JobStatus.COMPLETED and job.output_file_path:
        download_url = await storage_service.get_download_url(job.output_file_path)
    
    # Map the risk details from the job model or defaults
    risk_level = job.parameters.get("risk_level", "low")
    risk_details = job.parameters.get("risk_details", {})

    return JobResponse(
        id=job.id,
        job_id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress_pct,
        progress_pct=job.progress_pct,
        parameters=job.parameters,
        error_message=job.error_message,
        output_filename=job.output_filename,
        output_duration_seconds=job.output_duration_seconds,
        output_size_bytes=job.output_size_bytes,
        has_watermark=job.has_watermark,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        download_url=download_url,
        risk_level=risk_level,
        risk_details=risk_details,
    )


async def _check_quota(user: User, db: AsyncSession) -> None:
    """Raise 403 if the free user has exhausted their monthly exports."""
    if user.plan != Plan.FREE:
        return

    now = datetime.now(timezone.utc)
    # Roll over monthly counter
    if now.year > user.exports_reset_at.year or now.month > user.exports_reset_at.month:
        user.monthly_exports_used = 0
        user.exports_reset_at = now

    if user.monthly_exports_used >= settings.FREE_MONTHLY_EXPORTS:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Free plan allows {settings.FREE_MONTHLY_EXPORTS} exports per month. "
                "Upgrade to Pro for unlimited exports."
            ),
        )


async def _check_ai_access(user: User, job_type: JobType) -> None:
    """Block free users from AI-tier job types."""
    ai_types = {JobType.AI_SMART_CUT, JobType.SUBTITLE_GENERATION}
    if job_type in ai_types and user.plan == Plan.FREE:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="AI features require a Pro or Business plan.",
        )


@router.post("/", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("12/minute")
async def create_job(
    request: Request,
    body: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new processing job for a video.
    """
    logger.info(f"Submitting {body.job_type} job for video {body.video_id} (user: {current_user.id})")
    # 1. Verify video ownership
    result = await db.execute(
        select(Video).where(Video.id == body.video_id, Video.owner_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    # 2. Plan checks
    await _check_quota(current_user, db)
    await _check_ai_access(current_user, body.job_type)

    # 3. Handle Settings & Presets
    final_params = body.parameters or {}
    job_type = body.job_type

    # If settings are provided (Phase 3 UI), map them to parameters
    if body.settings:
        if body.settings.cut_pattern:
            final_params["keep_seconds"] = body.settings.cut_pattern.keep
            final_params["cut_seconds"] = body.settings.cut_pattern.remove
        if body.settings.audio:
            final_params["audio_mode"] = body.settings.audio.mode
            if body.settings.audio.library_track:
                final_params["library_track"] = body.settings.audio.library_track

    if body.preset_id:
        result = await db.execute(select(Preset).where(Preset.id == body.preset_id))
        preset = result.scalar_one_or_none()
        if not preset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Preset '{body.preset_id}' not found.")
        
        # Merge preset parameters (preset takes precedence for job_type, but user can override params)
        job_type = preset.job_type
        # Default parameters from preset, then override with merged settings/parameters
        merged_params = preset.parameters.copy()
        merged_params.update(final_params)
        final_params = merged_params

    # 4. Create job record
    job = Job(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        source_video_id=video.id,
        job_type=job_type,
        status=JobStatus.PENDING,
        parameters=final_params,
        preset_id=body.preset_id,
        has_watermark=(current_user.plan == Plan.FREE),
        progress_pct=0,
    )
    db.add(job)
    await db.flush()

    # 4. Bump usage counter
    current_user.monthly_exports_used += 1
    await db.flush()

    # 5. Job will be picked up by the standalone worker loop
    await db.commit()

    return await _build_job_response(job)


@router.get("/", response_model=dict)
async def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    video_id: Optional[str] = Query(None),
    job_type: Optional[JobType] = Query(None),
    job_status: Optional[JobStatus] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all jobs for the authenticated user (paginated, filterable)."""
    offset = (page - 1) * page_size

    query = select(Job).where(Job.owner_id == current_user.id)
    if video_id:
        query = query.where(Job.source_video_id == video_id)
    if job_type:
        query = query.where(Job.job_type == job_type)
    if job_status:
        query = query.where(Job.status == job_status)

    count_q = select(func.count(Job.id)).where(Job.owner_id == current_user.id)
    if video_id:
        count_q = count_q.where(Job.source_video_id == video_id)
    if job_type:
        count_q = count_q.where(Job.job_type == job_type)
    if job_status:
        count_q = count_q.where(Job.status == job_status)

    total = (await db.execute(count_q)).scalar_one()
    jobs = (await db.execute(query.order_by(Job.created_at.desc()).offset(offset).limit(page_size))).scalars().all()

    # Build responses in parallel for speed
    import asyncio
    items = await asyncio.gather(*[_build_job_response(j) for j in jobs])

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [i.model_dump() for i in items],
    }


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current status and result of a single job."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.owner_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    return await _build_job_response(job)


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending or processing job."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.owner_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    if job.status not in (JobStatus.PENDING, JobStatus.PROCESSING):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a job that is already {job.status}.",
        )

    job.status = JobStatus.CANCELLED
    job.completed_at = datetime.now(timezone.utc)
    await db.flush()
    
    logger.info(f"Job {job_id} cancelled by user")

    return await _build_job_response(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a job record and its output file."""
    import os
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.owner_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    if job.output_file_path and os.path.exists(job.output_file_path):
        try:
            os.remove(job.output_file_path)
        except OSError:
            pass

    await db.delete(job)
    await db.flush()
