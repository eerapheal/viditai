"""
Silence Removal Service
-----------------------
Uses FFmpeg's `silencedetect` filter to find silent regions, then
stitches together only the non-silent segments via the concat demuxer.

Algorithm:
 1. Run ffmpeg -af silencedetect to produce a log of silent intervals.
 2. Invert the intervals to get speech/sound segments.
 3. Add `padding_seconds` on each side of every kept segment to avoid
    hard audio cuts that feel unnatural.
 4. Concatenate segments using the concat demuxer (same as pattern_cut).
"""
import os
import re
import uuid
import tempfile
from typing import Callable, Awaitable, Optional

from app.services.ffmpeg import run_ffmpeg, probe_video
from app.core.config import settings
from app.core.logging_config import logger


def _parse_silence_log(log: str) -> list[tuple[float, float]]:
    """
    Parse ffmpeg silencedetect output.
    Returns list of (silence_start, silence_end) tuples in seconds.
    """
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]

    # 2. Invert to keep list
    logger.debug(f"Detected {len(starts)} silent segments. Inverting...")
    segments = []
    for i, start in enumerate(starts):
        end = ends[i] if i < len(ends) else None
        segments.append((start, end))
    return segments


def _invert_silence(
    silence_segs: list[tuple[float, float | None]],
    total_duration: float,
    padding: float,
) -> list[tuple[float, float]]:
    """
    Convert silent intervals to speech intervals.
    Returns list of (keep_start, keep_end) tuples.
    """
    keep = []
    prev = 0.0

    for sil_start, sil_end in silence_segs:
        seg_end = sil_start + padding          # keep a tiny bit before silence
        seg_start = prev - padding if prev > 0 else 0.0
        seg_start = max(0.0, seg_start)

        if seg_end > seg_start + 0.05:         # skip micro-segments < 50ms
            keep.append((seg_start, min(seg_end, total_duration)))

        prev = sil_end if sil_end is not None else total_duration

    # Tail after last silence
    tail_start = max(0.0, prev - padding)
    if tail_start < total_duration - 0.05:
        keep.append((tail_start, total_duration))

    return keep


async def apply_silence_removal(
    input_path: str,
    silence_threshold_db: float = -40.0,
    min_silence_duration: float = 0.5,
    padding_seconds: float = 0.1,
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> str:
    """
    Remove silent segments from a video.
    Returns path to the processed output file.
    """
    logger.info(f"Applying silence removal: {input_path}")
    info = await probe_video(input_path)
    total_duration = info["duration_seconds"]

    if total_duration <= 0:
        raise ValueError("Could not determine video duration")

    if progress_cb:
        await progress_cb(5)

    # ── Step 1: detect silence ────────────────────────────────────────────────
    logger.debug("Phase 1: Detecting silence intervals...")
    # We pipe to /dev/null; the silence log comes through stderr
    silence_log = await run_ffmpeg(
        "-i", input_path,
        "-af", f"silencedetect=noise={silence_threshold_db}dB:d={min_silence_duration}",
        "-f", "null",
        "-",
    )

    if progress_cb:
        await progress_cb(20)

    silence_segs = _parse_silence_log(silence_log)

    if not silence_segs:
        # No silence found — just copy the file
        output_filename = f"{uuid.uuid4().hex}_silence_removed.mp4"
        output_path = os.path.join(settings.SCRATCH_DIR, output_filename)
        await run_ffmpeg(
            "-i", input_path,
            "-c", "copy",
            output_path,
        )
        return output_path

    speech_segs = _invert_silence(silence_segs, total_duration, padding_seconds)

    if not speech_segs:
        raise ValueError("Silence removal would eliminate the entire video. Adjust threshold.")

    if progress_cb:
        await progress_cb(30)

    # ── Step 2: write concat list ─────────────────────────────────────────────
    output_filename = f"{uuid.uuid4().hex}_silence_removed.mp4"
    output_path = os.path.join(settings.SCRATCH_DIR, output_filename)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, dir=settings.UPLOAD_DIR) as f:
        concat_path = f.name
        for seg_start, seg_end in speech_segs:
            f.write(f"file '{os.path.abspath(input_path)}'\n")
            f.write(f"inpoint {seg_start:.6f}\n")
            f.write(f"outpoint {seg_end:.6f}\n")

    try:
        if progress_cb:
            await progress_cb(10)

        # 4. Run FFmpeg concat
        logger.debug(f"Phase 2: Concatenating {len(speech_segs)} kept segments...")
        await run_ffmpeg(
            "-f", "concat",
            "-safe", "0",
            "-i", concat_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path,
        )
        if progress_cb:
            await progress_cb(90)
    finally:
        os.unlink(concat_path)

    return output_path
