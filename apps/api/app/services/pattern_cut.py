"""
Pattern-Based Auto Cutting
--------------------------
Algorithm:
  1. Divide video timeline into (keep + cut) cycles.
  2. For each cycle, keep the first `keep_seconds` and discard the next `cut_seconds`.
  3. Concatenate all kept segments using FFmpeg's concat demuxer.

Result: a rhythm-edited video — the fundamental AutoCut feature.
"""
import os
import uuid
import tempfile
from typing import Callable, Awaitable

from app.services.ffmpeg import run_ffmpeg, probe_video
from app.core.config import settings


async def apply_pattern_cut(
    input_path: str,
    keep_seconds: float,
    cut_seconds: float,
    progress_cb: Callable[[int], Awaitable[None]] | None = None,
) -> str:
    """
    Perform pattern-based cutting on input_path.
    Returns path to the processed output file.
    """
    # 1. Probe original duration
    info = await probe_video(input_path)
    total_duration = info["duration_seconds"]

    if total_duration <= 0:
        raise ValueError("Could not determine video duration")

    cycle = keep_seconds + cut_seconds
    segments = []
    t = 0.0

    while t < total_duration:
        seg_end = min(t + keep_seconds, total_duration)
        segments.append((t, seg_end - t))
        t += cycle

    if not segments:
        raise ValueError("No segments to keep — check keep/cut values vs video length")

    # 2. Write concat list to a temp file
    output_filename = f"{uuid.uuid4().hex}_pattern_cut.mp4"
    output_path = os.path.join(settings.OUTPUT_DIR, output_filename)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, dir=settings.UPLOAD_DIR) as f:
        concat_list_path = f.name
        for seg_start, seg_dur in segments:
            f.write(f"file '{os.path.abspath(input_path)}'\n")
            f.write(f"inpoint {seg_start:.6f}\n")
            f.write(f"outpoint {seg_start + seg_dur:.6f}\n")

    try:
        if progress_cb:
            await progress_cb(10)

        # 3. Run FFmpeg concat
        await run_ffmpeg(
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_path,
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
        os.unlink(concat_list_path)

    return output_path
