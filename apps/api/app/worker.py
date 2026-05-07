import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.services.storage import storage_service
from app.core.config import settings
from app.core.logging_config import logger
from app.models.job import Job, JobStatus, JobType, RiskLevel
import tempfile
import shutil

async def _update_job(job_id: str, **fields) -> None:
    """Helper: open a fresh DB session and update job fields."""
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Job)
            .where(Job.id == job_id)
            .values(**fields)
        )
        await db.commit()

async def _run_job(job_id: str) -> None:
    """Core execution: dispatch to the correct service."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job)
            .options(selectinload(Job.source_video))
            .where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()

    if not job:
        return
    
    # ── Mark as processing ────────────────────────────────────────────────────
    await _update_job(
        job_id,
        status=JobStatus.PROCESSING,
        started_at=datetime.now(timezone.utc),
        progress_pct=0,
    )

    logger.info(f"Worker: Starting Job {job_id} ({job.job_type})")
    
    # ── 1. Fetch Source Asset to Local Sandbox ──────────────────────────────
    source_key = job.source_video.file_path
    local_source_path = await storage_service.get_file_path(source_key)
    
    # Track files to cleanup
    temp_files = [local_source_path]

    async def progress_cb(pct: int) -> None:
        await _update_job(job_id, progress_pct=pct)

    params = job.parameters or {}
    output_path: Optional[str] = None

    try:
        # ── 2. Route to correct service ───────────────────────────────────────
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
            if params.get("add_captions") and output_path:
                from app.services.subtitle_generation import generate_subtitles
                sub_result = await generate_subtitles(input_path=output_path, burn_into_video=True, progress_cb=progress_cb)
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

        if output_path:
            temp_files.append(output_path)

        # ── 3. Add Watermark if Free Plan ────────────────────────────────────
        if job.has_watermark and output_path and output_path.endswith(".mp4"):
            watermarked_path = await _apply_watermark(output_path)
            temp_files.append(watermarked_path)
            output_path = watermarked_path

        # ── 4. Audio Safety Check ───────────────────────────────────────────
        from app.services.ffmpeg import probe_video
        risk_level = RiskLevel.LOW
        audio_mode = params.get("audio_mode", "original")

        if output_path and output_path.endswith(".mp4"):
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

        # ── 5. Ship Result to Cloud Storage ───────────────────────────────────
        storage_output_key = f"{settings.OUTPUT_DIR}/{os.path.basename(output_path)}"
        with open(output_path, "rb") as f:
            await storage_service.upload_file(f, storage_output_key)

        # Ship sidecars (SRT/VTT) if they exist in the same directory
        base_no_ext = os.path.splitext(output_path)[0]
        for ext in [".srt", ".vtt", ".json"]:
            sidecar_local = base_no_ext + ext
            if os.path.exists(sidecar_local):
                sidecar_key = f"{settings.OUTPUT_DIR}/{os.path.basename(sidecar_local)}"
                with open(sidecar_local, "rb") as f:
                    await storage_service.upload_file(f, sidecar_key)
                temp_files.append(sidecar_local)

        # Final Metadata
        out_info = await probe_video(output_path) if output_path.endswith(".mp4") else {}
        
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
            risk_details={"audio_mode": audio_mode, "transformation": job.job_type.value}
        )
        logger.info(f"Worker: Successfully completed Job {job_id}")

    except Exception as exc:
        logger.error(f"Worker Error: {exc}", exc_info=True)
        await _update_job(
            job_id,
            status=JobStatus.FAILED,
            completed_at=datetime.now(timezone.utc),
            error_message=str(exc)[:1024],
        )
    finally:
        # ── 6. Cleanup Sandbox ──────────────────────────────────────────────
        for f in temp_files:
            if f and os.path.exists(f):
                try:
                    if os.path.isdir(f):
                        shutil.rmtree(f)
                    else:
                        os.remove(f)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file {f}: {e}")

async def _apply_watermark(input_path: str) -> str:
    from app.services.ffmpeg import run_ffmpeg
    output_path = input_path.replace(".mp4", "_wm.mp4")
    await run_ffmpeg(
        "-i", input_path,
        "-vf",
        "drawtext=text='AutoCut AI':fontcolor=white@0.45:fontsize=22:x=(w-text_w)-16:y=(h-text_h)-16:shadowcolor=black@0.4:shadowx=1:shadowy=1",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy", "-movflags", "+faststart",
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
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-shortest",
        output_path
    )
    os.replace(output_path, input_path)
    return input_path

async def main_loop():
    """Standalone worker loop: polls DB for pending jobs."""
    logger.info("🚀 AutoCut AI Worker started and polling...")
    
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Cleanup Zombie Jobs (stuck in PROCESSING for > 180 mins)
                thirty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=180)
                await db.execute(
                    update(Job)
                    .where(Job.status == JobStatus.PROCESSING, Job.started_at < thirty_mins_ago)
                    .values(status=JobStatus.PENDING, started_at=None, progress_pct=0)
                )
                await db.commit()

                # 2. Pick up the next PENDING job
                result = await db.execute(
                    select(Job.id)
                    .where(Job.status == JobStatus.PENDING)
                    .order_by(Job.created_at.asc())
                    .limit(1)
                )
                job_id = result.scalar_one_or_none()

            if job_id:
                await _run_job(job_id)
            else:
                await asyncio.sleep(2)  # Wait if no jobs found
                
        except Exception as e:
            logger.error(f"Worker Loop Error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main_loop())
