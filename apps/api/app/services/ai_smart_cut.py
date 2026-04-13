"""
AI Smart Cut Service
--------------------
Combines multiple detection passes to aggressively trim a video:

  Pass 1 — Silence removal (same as silence_removal.py but integrated)
  Pass 2 — Low-motion scene detection via PySceneDetect (optional)
  Pass 3 — Filler word removal via Whisper transcription (optional)

The result is a shortened video targeting `target_duration_pct` of the
original. Falls back gracefully if optional dependencies are missing.
"""
import os
import uuid
import tempfile
from typing import Optional, Callable, Awaitable

from app.services.ffmpeg import run_ffmpeg, probe_video
from app.services.silence_removal import apply_silence_removal
from app.core.config import settings


async def _detect_low_motion_scenes(input_path: str) -> list[tuple[float, float]]:
    """
    Use PySceneDetect (if available) to find scene boundaries.
    Returns list of (start, end) tuples for LOW-MOTION scenes to cut.
    Falls back to empty list if scenedetect is not installed.
    """
    try:
        from scenedetect import open_video, SceneManager
        from scenedetect.detectors import ContentDetector

        video = open_video(input_path)
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=15.0))
        scene_manager.detect_scenes(video, show_progress=False)
        scenes = scene_manager.get_scene_list()

        # Identify "low motion" scenes: those shorter than 1.5s or with very
        # little content change (single-scene videos → skip)
        low_motion = []
        for scene in scenes:
            start = scene[0].get_seconds()
            end   = scene[1].get_seconds()
            duration = end - start
            if duration < 1.5:
                low_motion.append((start, end))

        return low_motion

    except ImportError:
        return []
    except Exception:
        return []


async def _transcribe_and_find_fillers(input_path: str) -> list[tuple[float, float]]:
    """
    Use OpenAI Whisper (if available) to transcribe audio and locate
    filler words ("uh", "um", "like", "you know", etc.).
    Returns list of (start, end) time ranges containing filler words.
    Falls back to empty list if whisper is not installed.
    """
    FILLER_WORDS = {"uh", "um", "like", "you know", "basically", "actually", "literally"}

    try:
        import whisper  # type: ignore

        model = whisper.load_model("base")
        result = model.transcribe(input_path, word_timestamps=True)

        filler_segments = []
        for seg in result.get("segments", []):
            for word_info in seg.get("words", []):
                word = word_info.get("word", "").strip().lower().strip(".,!?")
                if word in FILLER_WORDS:
                    filler_segments.append((
                        float(word_info["start"]),
                        float(word_info["end"]),
                    ))

        return filler_segments

    except ImportError:
        return []
    except Exception:
        return []


def _merge_cut_intervals(
    intervals: list[tuple[float, float]],
    total_duration: float,
    padding: float = 0.05,
) -> list[tuple[float, float]]:
    """
    Given a list of (cut_start, cut_end) intervals, return the
    KEPT intervals (inverted), merging overlapping cuts first.
    """
    if not intervals:
        return [(0.0, total_duration)]

    # Sort and merge overlapping
    intervals = sorted(intervals)
    merged: list[tuple[float, float]] = []
    cur_start, cur_end = intervals[0]
    for s, e in intervals[1:]:
        if s <= cur_end + padding:
            cur_end = max(cur_end, e)
        else:
            merged.append((cur_start, cur_end))
            cur_start, cur_end = s, e
    merged.append((cur_start, cur_end))

    # Invert
    kept: list[tuple[float, float]] = []
    prev = 0.0
    for c_start, c_end in merged:
        if c_start - prev > 0.1:
            kept.append((prev, c_start))
        prev = c_end
    if total_duration - prev > 0.1:
        kept.append((prev, total_duration))

    return kept


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
    Returns path to the processed output file.
    """
    info = await probe_video(input_path)
    total_duration = info["duration_seconds"]
    if total_duration <= 0:
        raise ValueError("Could not determine video duration")

    cuts: list[tuple[float, float]] = []  # intervals to REMOVE

    # ── Pass 1: Silence ───────────────────────────────────────────────────────
    if remove_silence:
        if progress_cb:
            await progress_cb(10)
        # Re-use silence_removal logic but collect intervals instead of processing
        import re
        silence_log = await run_ffmpeg(
            "-i", input_path,
            "-af", "silencedetect=noise=-40dB:d=0.5",
            "-f", "null", "-",
        )
        starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", silence_log)]
        ends   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", silence_log)]
        for i, s in enumerate(starts):
            e = ends[i] if i < len(ends) else total_duration
            cuts.append((s, e))

    # ── Pass 2: Low-motion scenes ─────────────────────────────────────────────
    if remove_low_motion:
        if progress_cb:
            await progress_cb(30)
        motion_cuts = await _detect_low_motion_scenes(input_path)
        cuts.extend(motion_cuts)

    # ── Pass 3: Filler words ──────────────────────────────────────────────────
    if remove_filler_words:
        if progress_cb:
            await progress_cb(50)
        filler_cuts = await _transcribe_and_find_fillers(input_path)
        cuts.extend(filler_cuts)

    if progress_cb:
        await progress_cb(60)

    # ── Build kept segments ───────────────────────────────────────────────────
    kept_segments = _merge_cut_intervals(cuts, total_duration)

    if not kept_segments:
        raise ValueError("AI smart cut would remove the entire video. Adjust parameters.")

    # ── Optionally trim further to hit target_duration_pct ───────────────────
    kept_total = sum(e - s for s, e in kept_segments)
    target_total = total_duration * (target_duration_pct / 100)

    if kept_total > target_total and len(kept_segments) > 1:
        # Trim proportionally from each segment's tail
        trim_ratio = target_total / kept_total
        kept_segments = [
            (s, s + (e - s) * trim_ratio)
            for s, e in kept_segments
            if (e - s) * trim_ratio > 0.1
        ]

    if progress_cb:
        await progress_cb(70)

    # ── Concat output ─────────────────────────────────────────────────────────
    output_filename = f"{uuid.uuid4().hex}_ai_smart_cut.mp4"
    output_path = os.path.join(settings.OUTPUT_DIR, output_filename)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, dir=settings.UPLOAD_DIR) as f:
        concat_path = f.name
        for seg_start, seg_end in kept_segments:
            f.write(f"file '{os.path.abspath(input_path)}'\n")
            f.write(f"inpoint {seg_start:.6f}\n")
            f.write(f"outpoint {seg_end:.6f}\n")

    try:
        await run_ffmpeg(
            "-f", "concat",
            "-safe", "0",
            "-i", concat_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_path,
        )
        if progress_cb:
            await progress_cb(95)
    finally:
        os.unlink(concat_path)

    return output_path
