"""
Background Job Worker
---------------------
Dispatched via FastAPI BackgroundTasks (enqueue_job).
Runs the correct service for each JobType and updates the Job record
with progress, output info, and final status.

For production scale: swap BackgroundTasks for Celery + Redis or ARQ.
"""
import os
import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.job import Job, JobType, JobStatus
from app.models.user import Plan
from app.services.ffmpeg import run_ffmpeg, probe_video
from app.core.config import settings
from app.core.logging_config import logger


async def _update_job(job_id: str, **fields) -> None:
    """Helper: open a fresh DB session and update job fields."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return
        for k, v in fields.items():
            setattr(job, k, v)
        await db.commit()


async def _run_job(job_id: str) -> None:
    """Core execution: dispatch to the correct service."""
    # ── Load job + related video eagerly ─────────────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job)
            .options(selectinload(Job.source_video))
            .where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()

    if not job:
        logger.warning(f"Job {job_id} not found in worker")
        return
    if job.status == JobStatus.CANCELLED:
        logger.info(f"Job {job_id} skipped (already cancelled)")
        return

    logger.info(f"Worker processing job {job_id} ({job.job_type})")
    source_video_path: str = job.source_video.file_path

    # ── Mark as processing ────────────────────────────────────────────────────
    await _update_job(
        job_id,
        status=JobStatus.PROCESSING,
        started_at=datetime.now(timezone.utc),
        progress_pct=0,
    )

    # ── Progress callback ─────────────────────────────────────────────────────
    async def progress_cb(pct: int) -> None:
        await _update_job(job_id, progress_pct=pct)

    params = job.parameters or {}
    output_path: Optional[str] = None

    try:
        # ── Route to correct service ──────────────────────────────────────────

        if job.job_type == JobType.PATTERN_CUT:
            from app.services.pattern_cut import apply_pattern_cut
            logger.info(f"Applying pattern cut: {source_video_path} (keep: {params.get('keep_seconds')}s, cut: {params.get('cut_seconds')}s)")
            output_path = await apply_pattern_cut(
                input_path=source_video_path,
                keep_seconds=float(params.get("keep_seconds", 4)),
                cut_seconds=float(params.get("cut_seconds", 1)),
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.SILENCE_REMOVAL:
            from app.services.silence_removal import apply_silence_removal
            output_path = await apply_silence_removal(
                input_path=source_video_path,
                silence_threshold_db=float(params.get("silence_threshold_db", -40)),
                min_silence_duration=float(params.get("min_silence_duration", 0.5)),
                padding_seconds=float(params.get("padding_seconds", 0.1)),
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.AI_SMART_CUT:
            from app.services.ai_smart_cut import apply_ai_smart_cut
            output_path = await apply_ai_smart_cut(
                input_path=source_video_path,
                remove_silence=bool(params.get("remove_silence", True)),
                remove_low_motion=bool(params.get("remove_low_motion", True)),
                remove_filler_words=bool(params.get("remove_filler_words", False)),
                target_duration_pct=int(params.get("target_duration_pct", 30)),
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.SUBTITLE_GENERATION:
            from app.services.subtitle_generation import generate_subtitles
            sub_result = await generate_subtitles(
                input_path=source_video_path,
                language=params.get("language"),
                model_size=params.get("model_size", "base"),
                burn_into_video=bool(params.get("burn_into_video", False)),
                progress_cb=progress_cb,
            )
            # Primary output: burned video if requested, else the SRT file
            output_path = sub_result.get("output_video_path") or sub_result["srt_path"]

        elif job.job_type == JobType.SOCIAL_EXPORT:
            from app.services.social_export import apply_social_export
            from app.models.job import ExportFormat
            fmt = ExportFormat(params.get("format", "tiktok"))
            output_path = await apply_social_export(
                input_path=source_video_path,
                export_format=fmt,
                add_captions=bool(params.get("add_captions", False)),
                face_zoom=bool(params.get("face_zoom", False)),
                add_watermark_text=params.get("add_watermark_text"),
                progress_cb=progress_cb,
            )

        else:
            raise ValueError(f"Unknown job type: {job.job_type}")

        # ── Add watermark for free users ──────────────────────────────────────
        if (
            job.has_watermark
            and output_path
            and os.path.exists(output_path)
            and output_path.endswith(".mp4")
        ):
            watermarked_path = await _apply_watermark(output_path)
            os.replace(watermarked_path, output_path)

        # ── Collect output metadata ───────────────────────────────────────────
        output_filename = os.path.basename(output_path) if output_path else None
        output_size = (
            os.path.getsize(output_path)
            if output_path and os.path.exists(output_path)
            else None
        )
        output_duration: Optional[float] = None

        if output_path and os.path.exists(output_path) and output_path.endswith(".mp4"):
            try:
                from app.services.ffmpeg import probe_video
                out_info = await probe_video(output_path)
                output_duration = out_info.get("duration_seconds")
            except Exception:
                pass

        await _update_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress_pct=100,
            completed_at=datetime.now(timezone.utc),
            output_file_path=output_path,
            output_filename=output_filename,
            output_size_bytes=output_size,
            output_duration_seconds=output_duration,
        )
        logger.info(f"Job {job_id} completed successfully")

    except asyncio.CancelledError:
        await _update_job(
            job_id,
            status=JobStatus.CANCELLED,
            completed_at=datetime.now(timezone.utc),
        )

    except Exception as exc:
        await _update_job(
            job_id,
            status=JobStatus.FAILED,
            progress_pct=0,
            completed_at=datetime.now(timezone.utc),
            error_message=str(exc)[:1024],
        )


async def _apply_watermark(input_path: str) -> str:
    """Burn a subtle AutoCut AI watermark into the bottom-right corner."""
    from app.services.ffmpeg import run_ffmpeg

    output_path = input_path.replace(".mp4", "_wm.mp4")
    await run_ffmpeg(
        "-i", input_path,
        "-vf",
        "drawtext=text='AutoCut AI'"
        ":fontcolor=white@0.45:fontsize=22"
        ":x=(w-text_w)-16:y=(h-text_h)-16"
        ":shadowcolor=black@0.4:shadowx=1:shadowy=1",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy",
        "-movflags", "+faststart",
        output_path,
    )
    return output_path


def enqueue_job(job_id: str) -> None:
    """
    Entry point called by FastAPI BackgroundTasks.
    Creates an asyncio Task in the running event loop.
    """
    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(_run_job(job_id))
    else:
        loop.run_until_complete(_run_job(job_id))
