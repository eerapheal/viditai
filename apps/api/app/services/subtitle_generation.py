"""
Subtitle Generation Service
---------------------------
Uses OpenAI Whisper to transcribe video audio and produces:
  - An SRT subtitle file  (stored alongside the output)
  - A VTT file            (for web players)
  - Optionally burns subs into the video via FFmpeg drawtext

If Whisper is not installed the service raises a clear RuntimeError.
"""
import os
import uuid
from typing import Optional, Callable, Awaitable

from app.services.ffmpeg import run_ffmpeg, probe_video
from app.core.config import settings
from app.core.logging_config import logger


def _seconds_to_srt_time(secs: float) -> str:
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    ms = int((secs - int(secs)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _seconds_to_vtt_time(secs: float) -> str:
    return _seconds_to_srt_time(secs).replace(",", ".")


def _segments_to_srt(segments: list[dict]) -> str:
    lines = []
    for i, seg in enumerate(segments, start=1):
        start = _seconds_to_srt_time(float(seg["start"]))
        end   = _seconds_to_srt_time(float(seg["end"]))
        text  = seg["text"].strip()
        lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(lines)


def _segments_to_vtt(segments: list[dict]) -> str:
    lines = ["WEBVTT\n"]
    for seg in segments:
        start = _seconds_to_vtt_time(float(seg["start"]))
        end   = _seconds_to_vtt_time(float(seg["end"]))
        text  = seg["text"].strip()
        lines.append(f"{start} --> {end}\n{text}\n")
    return "\n".join(lines)


async def generate_subtitles(
    input_path: str,
    language: Optional[str] = None,        # e.g. "en", "es" — None = auto-detect
    model_size: str = "base",              # tiny | base | small | medium | large
    burn_into_video: bool = False,
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> dict:
    """
    Transcribe video and generate SRT/VTT subtitle files.
    Optionally burns subtitles into a new video file.

    Returns:
      {
        "srt_path": str,
        "vtt_path": str,
        "transcript": str,
        "output_video_path": str | None,   # set only if burn_into_video=True
        "segments": list[dict],
      }
    """
    logger.info(f"Generating subtitles for: {input_path}")
    try:
        import whisper  # type: ignore
    except ImportError:
        raise RuntimeError(
            "Whisper is not installed. Run: pip install openai-whisper"
        )

    if progress_cb:
        await progress_cb(5)

    # ── Extract audio track for faster Whisper processing ────────────────────
    audio_filename = f"{uuid.uuid4().hex}_audio.wav"
    audio_path = os.path.join(settings.UPLOAD_DIR, audio_filename)

    await run_ffmpeg(
        "-i", input_path,
        "-vn",                          # no video
        "-acodec", "pcm_s16le",         # WAV PCM
        "-ar", "16000",                 # 16 kHz — Whisper's native rate
        "-ac", "1",                     # mono
        audio_path,
    )

    if progress_cb:
        await progress_cb(15)

    # ── Transcription ─────────────────────────────────────────────────────────
    model = whisper.load_model(model_size)
    transcribe_kwargs: dict = {"word_timestamps": False}
    if language:
        transcribe_kwargs["language"] = language

    result = model.transcribe(audio_path, **transcribe_kwargs)
    segments: list[dict] = result.get("segments", [])
    transcript: str = result.get("text", "")

    # Cleanup temp audio
    try:
        os.remove(audio_path)
    except OSError:
        pass

    if progress_cb:
        await progress_cb(60)

    # ── Write SRT ─────────────────────────────────────────────────────────────
    base_id = uuid.uuid4().hex
    srt_path = os.path.join(settings.SCRATCH_DIR, f"{base_id}.srt")
    vtt_path = os.path.join(settings.SCRATCH_DIR, f"{base_id}.vtt")

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(_segments_to_srt(segments))

    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write(_segments_to_vtt(segments))

    if progress_cb:
        await progress_cb(75)

    # ── Optional: burn subtitles into video ───────────────────────────────────
    output_video_path: Optional[str] = None
    if burn_into_video and segments:
        # Escape the SRT path for FFmpeg subtitles filter
        safe_srt = srt_path.replace("\\", "/").replace(":", "\\:")
        output_video_filename = f"{base_id}_subtitled.mp4"
        output_video_path = os.path.join(settings.SCRATCH_DIR, output_video_filename)

        await run_ffmpeg(
            "-i", input_path,
            "-vf",
            f"subtitles='{safe_srt}':force_style='"
            "Fontname=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,"
            "OutlineColour=&H00000000,Outline=2,Alignment=2,MarginV=40'",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            output_video_path,
        )

    if progress_cb:
        await progress_cb(95)

    return {
        "srt_path": srt_path,
        "vtt_path": vtt_path,
        "transcript": transcript,
        "output_video_path": output_video_path,
        "segments": segments,
    }
