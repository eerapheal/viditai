"""
AI Smart Cut Service
--------------------
Fast, single-output smart trimming for uploaded videos.

The service detects removable sections with independent passes:
- silence detection through FFmpeg
- static/low-motion detection through FFmpeg freezedetect
- optional filler-word detection through Whisper tiny

The detectors run concurrently where possible, then the final kept ranges are
encoded once into a social-ready MP4.
"""
import asyncio
import os
import re
import tempfile
import uuid
from typing import Awaitable, Callable, Optional

from app.core.config import settings
from app.core.logging_config import logger
from app.services.ffmpeg import probe_video, run_ffmpeg

MIN_KEEP_SEGMENT_SECONDS = 0.35
SILENCE_THRESHOLD_DB = -40
SILENCE_MIN_DURATION = 0.45
FREEZE_MIN_DURATION = 1.25


async def _detect_silence(input_path: str, total_duration: float) -> list[tuple[float, float]]:
    """Return audio silence intervals using one FFmpeg pass."""
    silence_log = await run_ffmpeg(
        "-i", input_path,
        "-af", f"silencedetect=noise={SILENCE_THRESHOLD_DB}dB:d={SILENCE_MIN_DURATION}",
        "-f", "null", "-",
    )
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", silence_log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", silence_log)]

    intervals = []
    for idx, start in enumerate(starts):
        end = ends[idx] if idx < len(ends) else total_duration
        if end - start >= SILENCE_MIN_DURATION:
            intervals.append((start, end))
    return intervals


async def _detect_low_motion_scenes(input_path: str, total_duration: float) -> list[tuple[float, float]]:
    """
    Find visually static ranges with FFmpeg freezedetect.

    This catches long static shots and is much faster than Python frame analysis.
    """
    try:
        freeze_log = await run_ffmpeg(
            "-i", input_path,
            "-vf", f"freezedetect=n=-60dB:d={FREEZE_MIN_DURATION}",
            "-an",
            "-f", "null", "-",
        )
        starts = [
            float(x)
            for x in re.findall(r"(?:lavfi\.freezedetect\.freeze_start|freeze_start):\s*([\d.]+)", freeze_log)
        ]
        ends = [
            float(x)
            for x in re.findall(r"(?:lavfi\.freezedetect\.freeze_end|freeze_end):\s*([\d.]+)", freeze_log)
        ]
        intervals = []
        for idx, start in enumerate(starts):
            end = ends[idx] if idx < len(ends) else total_duration
            if end - start >= FREEZE_MIN_DURATION:
                intervals.append((start, end))
        return intervals
    except Exception as exc:
        logger.debug(f"Low-motion detection skipped: {exc}")
        return []


async def _transcribe_and_find_fillers(input_path: str) -> list[tuple[float, float]]:
    """
    Locate simple filler words with Whisper tiny.

    This pass is optional and intentionally uses the tiny model because it can
    be expensive on CPU-bound local machines.
    """
    filler_words = {"uh", "um", "like", "you know", "basically", "actually", "literally"}

    try:
        import whisper  # type: ignore

        model = await asyncio.to_thread(whisper.load_model, "tiny")
        result = await asyncio.to_thread(model.transcribe, input_path, word_timestamps=True)

        intervals = []
        for segment in result.get("segments", []):
            for word_info in segment.get("words", []):
                word = word_info.get("word", "").strip().lower().strip(".,!?")
                if word in filler_words:
                    intervals.append((float(word_info["start"]), float(word_info["end"])))
        return intervals
    except ImportError:
        return []
    except Exception as exc:
        logger.debug(f"Filler-word detection skipped: {exc}")
        return []


def _clamp_cut_intervals(
    intervals: list[tuple[float, float]],
    total_duration: float,
) -> list[tuple[float, float]]:
    normalized = []
    for start, end in intervals:
        start = max(0.0, min(float(start), total_duration))
        end = max(0.0, min(float(end), total_duration))
        if end - start >= MIN_KEEP_SEGMENT_SECONDS:
            normalized.append((start, end))
    return normalized


def _merge_cut_intervals(
    intervals: list[tuple[float, float]],
    total_duration: float,
    padding: float = 0.05,
) -> list[tuple[float, float]]:
    """Invert merged cut ranges into kept ranges."""
    if not intervals:
        return [(0.0, total_duration)]

    intervals = sorted(intervals)
    merged: list[tuple[float, float]] = []
    cur_start, cur_end = intervals[0]
    for start, end in intervals[1:]:
        if start <= cur_end + padding:
            cur_end = max(cur_end, end)
        else:
            merged.append((cur_start, cur_end))
            cur_start, cur_end = start, end
    merged.append((cur_start, cur_end))

    kept: list[tuple[float, float]] = []
    previous_end = 0.0
    for cut_start, cut_end in merged:
        if cut_start - previous_end >= MIN_KEEP_SEGMENT_SECONDS:
            kept.append((previous_end, cut_start))
        previous_end = max(previous_end, cut_end)

    if total_duration - previous_end >= MIN_KEEP_SEGMENT_SECONDS:
        kept.append((previous_end, total_duration))

    return kept


def _fit_segments_to_target(
    segments: list[tuple[float, float]],
    total_duration: float,
    target_duration_pct: int,
) -> list[tuple[float, float]]:
    """Trim kept ranges down to target length while preserving timeline order."""
    target_total = total_duration * (target_duration_pct / 100)
    if target_total <= 0:
        return segments

    kept_total = sum(end - start for start, end in segments)
    if kept_total <= target_total:
        return segments

    ranked = sorted(
        enumerate(segments),
        key=lambda item: (item[1][0] > 1.0, -(item[1][1] - item[1][0])),
    )

    fitted: list[tuple[int, tuple[float, float]]] = []
    remaining = target_total
    for idx, (start, end) in ranked:
        if remaining <= MIN_KEEP_SEGMENT_SECONDS:
            break
        duration = end - start
        take = min(duration, remaining)
        if take >= MIN_KEEP_SEGMENT_SECONDS:
            fitted.append((idx, (start, start + take)))
            remaining -= take

    if not fitted:
        start, end = segments[0] if segments else (0.0, total_duration)
        return [(start, min(end, start + max(MIN_KEEP_SEGMENT_SECONDS, target_total)))]

    return [segment for _, segment in sorted(fitted, key=lambda item: item[0])]


def _escape_concat_path(path: str) -> str:
    return os.path.abspath(path).replace("\\", "/").replace("'", "'\\''")


async def apply_ai_smart_cut(
    input_path: str,
    remove_silence: bool = True,
    remove_low_motion: bool = True,
    remove_filler_words: bool = False,
    target_duration_pct: int = 30,
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> str:
    """
    AI-powered smart trim.

    Returns path to the processed MP4 output file.
    """
    info = await probe_video(input_path)
    total_duration = float(info["duration_seconds"])
    if total_duration <= 0:
        raise ValueError("Could not determine video duration")

    if progress_cb:
        await progress_cb(8)

    has_audio = bool(info.get("has_audio", True))
    detectors: list[tuple[str, asyncio.Task[list[tuple[float, float]]]]] = []
    if remove_silence and has_audio:
        detectors.append(("silence", asyncio.create_task(_detect_silence(input_path, total_duration))))
    if remove_low_motion:
        detectors.append(("low_motion", asyncio.create_task(_detect_low_motion_scenes(input_path, total_duration))))
    if remove_filler_words and has_audio:
        detectors.append(("filler_words", asyncio.create_task(_transcribe_and_find_fillers(input_path))))

    cuts: list[tuple[float, float]] = []
    for index, (name, task) in enumerate(detectors, start=1):
        try:
            detected = await task
            cuts.extend(detected)
            logger.info(f"AI smart cut detector '{name}' found {len(detected)} intervals")
        except Exception as exc:
            logger.warning(f"AI smart cut detector '{name}' failed: {exc}")

        if progress_cb and detectors:
            await progress_cb(8 + int(52 * (index / len(detectors))))

    if progress_cb:
        await progress_cb(60)

    cuts = _clamp_cut_intervals(cuts, total_duration)
    kept_segments = _merge_cut_intervals(cuts, total_duration)
    kept_segments = _fit_segments_to_target(kept_segments, total_duration, target_duration_pct)
    kept_segments = [
        (start, end)
        for start, end in kept_segments
        if end - start >= MIN_KEEP_SEGMENT_SECONDS
    ]

    if not kept_segments:
        raise ValueError("AI smart cut could not keep enough usable video. Adjust parameters.")

    if progress_cb:
        await progress_cb(70)

    os.makedirs(settings.SCRATCH_DIR, exist_ok=True)
    output_filename = f"{uuid.uuid4().hex}_ai_smart_cut.mp4"
    output_path = os.path.join(settings.SCRATCH_DIR, output_filename)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, dir=settings.SCRATCH_DIR) as f:
        concat_path = f.name
        source_path = _escape_concat_path(input_path)
        for start, end in kept_segments:
            f.write(f"file '{source_path}'\n")
            f.write(f"inpoint {start:.6f}\n")
            f.write(f"outpoint {end:.6f}\n")

    try:
        if progress_cb:
            await progress_cb(78)

        try:
            await run_ffmpeg(
                "-f", "concat",
                "-safe", "0",
                "-i", concat_path,
                "-map", "0",
                "-c", "copy",
                "-avoid_negative_ts", "make_zero",
                "-fflags", "+genpts",
                "-movflags", "+faststart",
                output_path,
            )
        except Exception as copy_exc:
            logger.warning(f"AI smart cut stream-copy export failed, falling back to fast encode: {copy_exc}")
            await run_ffmpeg(
                "-f", "concat",
                "-safe", "0",
                "-i", concat_path,
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "25",
                "-threads", "0",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                output_path,
            )
        if progress_cb:
            await progress_cb(95)
    finally:
        try:
            os.unlink(concat_path)
        except OSError:
            pass

    return output_path
