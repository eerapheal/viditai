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
from app.core.logging_config import logger


def _sync_run_subprocess(cmd: list[str], timeout: int) -> tuple[int, str]:
    """Internal: Run a subprocess synchronously and return (code, output)."""
    logger.debug(f"Subprocess starting: {' '.join(cmd)}")
    try:
        # We combine stdout and stderr for simplicity in logs/errors
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace"
        )
        logger.debug(f"Subprocess finished with exit code {result.returncode}")
        return result.returncode, result.stdout
    except subprocess.TimeoutExpired:
        logger.error(f"Subprocess timed out after {timeout}s: {' '.join(cmd)}")
        raise RuntimeError(f"Command timed out after {timeout}s: {' '.join(cmd)}")
    except (FileNotFoundError, OSError) as e:
        logger.error(f"Subprocess execution failed: {e}")
        raise RuntimeError(f"Failed to execute '{cmd[0]}': {str(e)}")


async def run_ffmpeg(*args: str, timeout: int = settings.JOB_TIMEOUT_SECONDS) -> str:
    """
    Run an ffmpeg command asynchronously using a thread pool.
    Returns combined stdout+stderr.
    Raises RuntimeError on non-zero error code.
    """
    cmd = [settings.FFMPEG_PATH, "-y", *args]
    logger.debug(f"Executing: {' '.join(cmd)}")
    
    # Run in a separate thread to avoid blocking the event loop
    returncode, output = await asyncio.to_thread(_sync_run_subprocess, cmd, timeout)

    if returncode != 0:
        raise RuntimeError(f"FFmpeg failed (exit {returncode}):\n{output}")
    return output


async def probe_video(file_path: str) -> dict:
    """
    Run ffprobe on a file using a thread pool and return metadata dict.
    """
    cmd = [
        settings.FFPROBE_PATH, "-v", "error",
        "-print_format", "json",
        "-show_streams", "-show_format",
        file_path,
    ]
    
    # Run in a separate thread
    returncode, output_str = await asyncio.to_thread(_sync_run_subprocess, cmd, 30)

    if returncode != 0:
        raise RuntimeError(
            f"ffprobe failed with exit code {returncode}. "
            f"Command: {' '.join(cmd)}. "
            f"Error details: {output_str}"
        )

    if not output_str:
        raise RuntimeError("ffprobe returned empty output.")

    try:
        data = json.loads(output_str)
    except json.JSONDecodeError:
        raise RuntimeError(f"Failed to parse ffprobe output as JSON. Output: {output_str[:100]}...")

    video_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "video"), None)
    audio_stream = next((s for s in data.get("streams", []) if s["codec_type"] == "audio"), None)

    if not video_stream:
        raise RuntimeError("No video stream found in file.")

    duration = float(data.get("format", {}).get("duration", 0) or 0)
    width = int(video_stream.get("width", 0)) if video_stream else 0
    height = int(video_stream.get("height", 0)) if video_stream else 0

    fps = None
    if video_stream:
        r_frame_rate = video_stream.get("r_frame_rate", "0/1")
        try:
            num, den = r_frame_rate.split("/")
            fps = round(int(num) / int(den), 3) if int(den) != 0 else None
        except (ValueError, ZeroDivisionError):
            fps = None

    return {
        "duration_seconds": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "has_audio": audio_stream is not None,
    }

async def generate_thumbnail(input_path: str, output_path: str, timestamp: float = 1.0) -> None:
    """Extract a single frame as a JPEG thumbnail."""
    logger.debug(f"Generating thumbnail for {input_path}")
    await run_ffmpeg(
        "-ss", str(timestamp),
        "-i", input_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path,
    )
