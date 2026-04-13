"""
FFmpeg wrapper — all subprocess calls go through here.
No direct ffmpeg invocations anywhere else in the codebase.
"""
import asyncio
import json
import os
import subprocess
from typing import Optional
from app.core.config import settings


async def run_ffmpeg(*args: str, timeout: int = settings.JOB_TIMEOUT_SECONDS) -> str:
    """
    Run an ffmpeg command asynchronously.
    Returns combined stdout+stderr.
    Raises RuntimeError on non-zero exit.
    """
    cmd = [settings.FFMPEG_PATH, "-y", *args]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        raise RuntimeError(f"FFmpeg timed out after {timeout}s")

    output = (stdout + stderr).decode("utf-8", errors="replace")
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed (exit {proc.returncode}):\n{output}")
    return output


async def probe_video(file_path: str) -> dict:
    """
    Run ffprobe on a file and return dict with:
      duration, width, height, fps, has_audio
    """
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams", "-show_format",
        file_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {stderr.decode()}")

    data = json.loads(stdout.decode())
    video_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), None)
    audio_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "audio"), None)

    duration = float(data.get("format", {}).get("duration", 0) or 0)
    width = int(video_stream.get("width", 0)) if video_stream else None
    height = int(video_stream.get("height", 0)) if video_stream else None

    fps = None
    if video_stream:
        r_frame_rate = video_stream.get("r_frame_rate", "0/1")
        num, den = r_frame_rate.split("/")
        fps = round(int(num) / int(den), 3) if int(den) != 0 else None

    return {
        "duration_seconds": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "has_audio": audio_stream is not None,
    }


async def generate_thumbnail(input_path: str, output_path: str, timestamp: float = 1.0) -> None:
    """Extract a single frame as a JPEG thumbnail."""
    await run_ffmpeg(
        "-ss", str(timestamp),
        "-i", input_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path,
    )
