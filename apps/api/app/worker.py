"""
AutoCut AI — Background Worker
================================
Polls the database for PENDING jobs and dispatches them concurrently,
bounded by ``settings.MAX_CONCURRENT_JOBS``.

Key design decisions
--------------------
* **Parallel dispatch** — a single DB poll fetches up to MAX_CONCURRENT_JOBS
  pending jobs and atomically marks them PROCESSING before launching them as
  concurrent asyncio Tasks. No job can be stolen by a second worker instance.
* **Semaphore guard** — an asyncio.Semaphore ensures we never exceed the
  configured concurrency cap, even if additional jobs arrive mid-flight.
* **Batched progress writes** — progress_cb only hits the DB when the
  percentage increases by ≥ 2 points, preventing excessive write churn.
* **Config-driven zombie recovery** — stuck jobs are reset after
  JOB_TIMEOUT_SECONDS (from config), not a hardcoded constant.
* **Tunable poll interval** — WORKER_POLL_INTERVAL_SECONDS controls how long
  the loop sleeps when the queue is empty.
"""
import asyncio
import os
import shutil
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.logging_config import logger
from app.models.job import Job, JobStatus, JobType, RiskLevel
from app.services.storage import storage_service

import tempfile

# ── Concurrency semaphore ─────────────────────────────────────────────────────
# Limits simultaneous job execution to MAX_CONCURRENT_JOBS.
_job_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_JOBS)


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _update_job(job_id: str, **fields) -> None:
    """Open a fresh DB session and update job fields atomically."""
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Job).where(Job.id == job_id).values(**fields)
        )
        await db.commit()


def _make_progress_cb(job_id: str):
    """
    Return a throttled progress callback for a job.

    The callback only writes to the DB when the new percentage differs from the
    last written value by >= 2 points, reducing unnecessary DB round-trips for
    jobs that tick progress very frequently.
    """
    last_written: dict[str, int] = {"pct": -1}

    async def _cb(pct: int) -> None:
        if pct - last_written["pct"] >= 2 or pct >= 100:
            await _update_job(job_id, progress_pct=pct)
            last_written["pct"] = pct

    return _cb


# ── Core job execution ────────────────────────────────────────────────────────

async def _run_job(job_id: str) -> None:
    """Acquire semaphore slot, load job, dispatch to service, upload result."""
    async with _job_semaphore:
        await _execute_job(job_id)


async def _execute_job(job_id: str) -> None:
    """Core execution: load job from DB, run the appropriate service, upload output."""

    # ── Load job ──────────────────────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job)
            .options(selectinload(Job.source_video))
            .where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()

    if not job:
        logger.warning(f"Worker: Job {job_id} not found in DB — skipping.")
        return

    logger.info(f"Worker ▶ Starting Job {job_id} ({job.job_type})")

    progress_cb = _make_progress_cb(job_id)

    # ── Fetch source asset to local sandbox ───────────────────────────────────
    source_key = job.source_video.file_path
    local_source_path = await storage_service.get_file_path(source_key)

    # Track files to clean up. Local storage returns the original upload path
    # (do not delete it); S3 downloads to a temp file that must be removed.
    temp_files: list[str] = [] if settings.STORAGE_TYPE == "local" else [local_source_path]

    params = job.parameters or {}
    output_path: Optional[str] = None

    try:
        await progress_cb(2)

        # ── Optional manual frame crop ─────────────────────────────────────
        # Applied before every edit/recreation so downstream AI and manual
        # transforms work from the user's selected frame region.
        crop_params = params.get("crop")
        if isinstance(crop_params, dict) and crop_params.get("enabled"):
            from app.services.video_crop import apply_video_crop
            cropped_source_path = await apply_video_crop(local_source_path, crop_params)
            if cropped_source_path != local_source_path:
                temp_files.append(cropped_source_path)
                local_source_path = cropped_source_path
            await progress_cb(5)

        # ── Dispatch to the correct service ───────────────────────────────
        if job.job_type == JobType.PATTERN_CUT:
            from app.services.pattern_cut import apply_pattern_cut
            output_path = await apply_pattern_cut(
                input_path=local_source_path,
                keep_seconds=float(params.get("keep_seconds", 4)),
                cut_seconds=float(params.get("cut_seconds", 1)),
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.SILENCE_REMOVAL:
            from app.services.silence_removal import apply_silence_removal
            output_path = await apply_silence_removal(
                input_path=local_source_path,
                silence_threshold_db=float(params.get("silence_threshold_db", -40)),
                min_silence_duration=float(params.get("min_silence_duration", 0.5)),
                padding_seconds=float(params.get("padding_seconds", 0.1)),
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.AI_SMART_CUT:
            from app.services.ai_smart_cut import apply_ai_smart_cut
            output_path = await apply_ai_smart_cut(
                input_path=local_source_path,
                remove_silence=bool(params.get("remove_silence", True)),
                remove_low_motion=bool(params.get("remove_low_motion", True)),
                remove_filler_words=bool(params.get("remove_filler_words", False)),
                target_duration_pct=int(params.get("target_duration_pct", 30)),
                progress_cb=progress_cb,
            )
            # Optional inline caption burn-in after smart cut
            if params.get("add_captions") and output_path:
                from app.services.subtitle_generation import generate_subtitles
                sub_result = await generate_subtitles(
                    input_path=output_path,
                    burn_into_video=True,
                    progress_cb=progress_cb,
                )
                temp_files.append(output_path)   # old output becomes temp
                output_path = sub_result["output_video_path"]

        elif job.job_type == JobType.VOICEOVER_GENERATION:
            from app.services.voiceover_generation import generate_voiceover
            output_path = await generate_voiceover(
                input_path=local_source_path,
                text=params.get("text", ""),
                language=params.get("language", "en"),
                overlay=bool(params.get("overlay", False)),
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.SUBTITLE_GENERATION:
            from app.services.subtitle_generation import generate_subtitles
            sub_result = await generate_subtitles(
                input_path=local_source_path,
                burn_into_video=bool(params.get("burn_into_video", False)),
                progress_cb=progress_cb,
            )
            output_path = sub_result.get("output_video_path") or sub_result["srt_path"]

        elif job.job_type == JobType.AI_RECREATE:
            from app.services.ai_recreation import build_recreation_plan
            output_path = await build_recreation_plan(
                input_path=local_source_path,
                parameters=params,
                progress_cb=progress_cb,
            )

        elif job.job_type == JobType.SOCIAL_EXPORT:
            from app.services.social_export import apply_social_export
            from app.models.job import ExportFormat
            output_path = await apply_social_export(
                input_path=local_source_path,
                export_format=ExportFormat(params.get("format", "mp4_hd")),
                add_captions=bool(params.get("add_captions", False)),
                face_zoom=bool(params.get("face_zoom", False)),
                add_watermark_text=params.get("add_watermark_text"),
                subtitle_path=params.get("subtitle_path"),
                progress_cb=progress_cb,
            )

        if not output_path:
            raise ValueError(f"No output produced for job type '{job.job_type}'")

        if output_path:
            temp_files.append(output_path)

        # ── Watermark for free plan ────────────────────────────────────────
        if job.has_watermark and output_path.endswith(".mp4"):
            watermarked_path = await _apply_watermark(output_path)
            temp_files.append(watermarked_path)
            output_path = watermarked_path

        # ── Audio safety check ─────────────────────────────────────────────
        from app.services.ffmpeg import probe_video
        risk_level = RiskLevel.LOW
        audio_mode = params.get("audio_mode", "original")

        if output_path.endswith(".mp4"):
            src_info = await probe_video(local_source_path)
            if src_info.get("has_audio"):
                if audio_mode == "mute":
                    output_path = await _mute_audio(output_path)
                    risk_level = RiskLevel.LOW
                elif audio_mode == "replace":
                    lib_track = params.get("library_track")
                    if lib_track:
                        output_path = await _replace_audio(output_path, lib_track)
                        risk_level = RiskLevel.MEDIUM
                    else:
                        output_path = await _mute_audio(output_path)
                        risk_level = RiskLevel.LOW
                else:
                    risk_level = RiskLevel.HIGH

        # ── Upload result to cloud storage ────────────────────────────────
        await progress_cb(96)
        storage_output_key = f"{settings.OUTPUT_DIR}/{os.path.basename(output_path)}"
        with open(output_path, "rb") as fh:
            await storage_service.upload_file(fh, storage_output_key)

        # Upload sidecars (SRT / VTT / JSON manifest) if they exist
        base_no_ext = os.path.splitext(output_path)[0]
        for ext in (".srt", ".vtt", ".json"):
            sidecar_local = base_no_ext + ext
            if os.path.exists(sidecar_local):
                sidecar_key = f"{settings.OUTPUT_DIR}/{os.path.basename(sidecar_local)}"
                with open(sidecar_local, "rb") as fh:
                    await storage_service.upload_file(fh, sidecar_key)
                temp_files.append(sidecar_local)

        # ── Collect final metadata ────────────────────────────────────────
        from app.services.ffmpeg import probe_video as _probe
        out_info = await _probe(output_path) if output_path.endswith(".mp4") else {}

        await _update_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress_pct=100,
            completed_at=datetime.now(timezone.utc),
            output_file_path=storage_output_key,
            output_filename=os.path.basename(output_path),
            output_size_bytes=os.path.getsize(output_path),
            output_duration_seconds=out_info.get("duration_seconds"),
            risk_level=risk_level,
            risk_details={"audio_mode": audio_mode, "transformation": job.job_type.value},
        )
        logger.info(f"Worker ✓ Completed Job {job_id}")

    except Exception as exc:
        logger.error(f"Worker ✗ Job {job_id} failed: {exc}", exc_info=True)
        await _update_job(
            job_id,
            status=JobStatus.FAILED,
            completed_at=datetime.now(timezone.utc),
            error_message=str(exc)[:1024],
        )

    finally:
        # ── Cleanup sandbox ───────────────────────────────────────────────
        for fpath in temp_files:
            if fpath and os.path.exists(fpath):
                try:
                    if os.path.isdir(fpath):
                        shutil.rmtree(fpath)
                    else:
                        os.remove(fpath)
                except Exception as cleanup_err:
                    logger.warning(f"Worker: failed to cleanup {fpath}: {cleanup_err}")


# ── Post-processing helpers ───────────────────────────────────────────────────

async def _apply_watermark(input_path: str) -> str:
    from app.services.ffmpeg import run_ffmpeg
    output_path = input_path.replace(".mp4", "_wm.mp4")
    await run_ffmpeg(
        "-i", input_path,
        "-vf",
        "drawtext=text='AutoCut AI':fontcolor=white@0.45:fontsize=22"
        ":x=(w-text_w)-16:y=(h-text_h)-16"
        ":shadowcolor=black@0.4:shadowx=1:shadowy=1",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "copy", "-movflags", "+faststart",
        output_path,
    )
    return output_path


async def _mute_audio(input_path: str) -> str:
    from app.services.ffmpeg import run_ffmpeg
    output_path = input_path.replace(".mp4", "_muted.mp4")
    await run_ffmpeg("-i", input_path, "-an", "-c:v", "copy", output_path)
    os.replace(output_path, input_path)
    return input_path


async def _replace_audio(input_path: str, audio_source: str) -> str:
    from app.services.ffmpeg import run_ffmpeg
    output_path = input_path.replace(".mp4", "_remixed.mp4")
    await run_ffmpeg(
        "-i", input_path, "-stream_loop", "-1", "-i", audio_source,
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        output_path,
    )
    os.replace(output_path, input_path)
    return input_path


# ── Main polling loop ─────────────────────────────────────────────────────────

async def main_loop() -> None:
    """
    Standalone worker loop.

    Each iteration:
    1. Resets zombie jobs whose started_at exceeds JOB_TIMEOUT_SECONDS.
    2. Atomically claims up to MAX_CONCURRENT_JOBS pending jobs by flipping
       their status to PROCESSING before dispatching.
    3. Launches a Task per claimed job; the semaphore inside _run_job ensures
       the concurrency cap is always respected.
    4. Sleeps WORKER_POLL_INTERVAL_SECONDS before the next poll when the queue
       is empty, or immediately re-polls if jobs were found (more may be queued).
    """
    logger.info(
        f"🚀 AutoCut AI Worker started — concurrency={settings.MAX_CONCURRENT_JOBS}, "
        f"poll_interval={settings.WORKER_POLL_INTERVAL_SECONDS}s"
    )

    while True:
        try:
            async with AsyncSessionLocal() as db:
                # ── 1. Recover zombie jobs ────────────────────────────────
                timeout_cutoff = datetime.now(timezone.utc) - timedelta(
                    seconds=settings.JOB_TIMEOUT_SECONDS
                )
                zombie_result = await db.execute(
                    update(Job)
                    .where(
                        Job.status == JobStatus.PROCESSING,
                        Job.started_at < timeout_cutoff,
                    )
                    .values(status=JobStatus.PENDING, started_at=None, progress_pct=0)
                    .returning(Job.id)
                )
                zombie_ids = zombie_result.scalars().all()
                if zombie_ids:
                    logger.warning(f"Worker: reset {len(zombie_ids)} zombie job(s): {zombie_ids}")
                await db.commit()

                # ── 2. Claim pending jobs atomically ──────────────────────
                # Fetch IDs first (lightweight), then flip status in-place so
                # a second worker process cannot steal the same jobs.
                pending_result = await db.execute(
                    select(Job.id)
                    .where(Job.status == JobStatus.PENDING)
                    .order_by(Job.created_at.asc())
                    .limit(settings.MAX_CONCURRENT_JOBS)
                    .with_for_update(skip_locked=True)   # advisory row-level lock
                )
                job_ids: list[str] = list(pending_result.scalars().all())

                if job_ids:
                    now = datetime.now(timezone.utc)
                    await db.execute(
                        update(Job)
                        .where(Job.id.in_(job_ids))
                        .values(
                            status=JobStatus.PROCESSING,
                            started_at=now,
                            progress_pct=0,
                        )
                    )
                    await db.commit()

            if job_ids:
                logger.info(f"Worker: dispatching {len(job_ids)} job(s): {job_ids}")
                # Launch concurrently — semaphore inside _run_job caps parallelism
                await asyncio.gather(*[_run_job(jid) for jid in job_ids])
                # Re-poll immediately; more jobs may have accumulated
            else:
                await asyncio.sleep(settings.WORKER_POLL_INTERVAL_SECONDS)

        except Exception as loop_err:
            logger.error(f"Worker loop error: {loop_err}", exc_info=True)
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main_loop())
