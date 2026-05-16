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

    # 2. Export in one FFmpeg pass.
    #
    # The old implementation used the concat demuxer with one inpoint/outpoint
    # pair per kept segment. For a long video with short keep/cut cycles that
    # means hundreds or thousands of seeks back into the same file, which can
    # turn a simple pattern cut into an hours-long job. select/aselect scans the
    # source once and keeps frames whose timestamp falls inside the keep window.
    output_filename = f"{uuid.uuid4().hex}_pattern_cut.mp4"
    output_path = os.path.join(settings.SCRATCH_DIR, output_filename)
    os.makedirs(settings.SCRATCH_DIR, exist_ok=True)

    cycle_expr = f"{cycle:.6f}"
    keep_expr = f"{keep_seconds:.6f}"
    keep_condition = f"lt(mod(t\\,{cycle_expr})\\,{keep_expr})"

    if progress_cb:
        await progress_cb(10)

    if info.get("has_audio"):
        await run_ffmpeg(
            "-i", input_path,
            "-filter_complex",
            (
                f"[0:v]select='{keep_condition}',setpts=N/FRAME_RATE/TB[v];"
                f"[0:a]aselect='{keep_condition}',asetpts=N/SR/TB[a]"
            ),
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "24",
            "-threads", "0",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path,
        )
    else:
        await run_ffmpeg(
            "-i", input_path,
            "-vf", f"select='{keep_condition}',setpts=N/FRAME_RATE/TB",
            "-an",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "24",
            "-threads", "0",
            "-movflags", "+faststart",
            output_path,
        )

    if progress_cb:
        await progress_cb(90)

    return output_path
