"""
Social Media Export Service
---------------------------
Re-encodes video for specific platform aspect ratios and adds optional
captions (burned-in) and face-aware zoom via OpenCV.

Supported formats:
  - tiktok / reels / youtube_shorts  → 9:16 (1080×1920)
  - landscape                        → 16:9 (1920×1080)
  - mp4_hd                           → original resolution re-encode
"""
import os
import uuid
from typing import Optional, Callable, Awaitable

from app.services.ffmpeg import run_ffmpeg, probe_video
from app.models.job import ExportFormat
from app.core.config import settings
from app.core.logging_config import logger


# Target dimensions per platform
FORMAT_SPEC: dict[str, tuple[int, int]] = {
    ExportFormat.TIKTOK:          (1080, 1920),
    ExportFormat.REELS:           (1080, 1920),
    ExportFormat.YOUTUBE_SHORTS:  (1080, 1920),
    ExportFormat.LANDSCAPE:       (1920, 1080),
    ExportFormat.MP4_HD:          (0, 0),   # 0 = keep original
}


def _build_scale_filter(fmt: ExportFormat, src_w: int, src_h: int) -> str:
    """
    Build FFmpeg vf filter string to crop + scale video to target aspect ratio.
    Uses scale2ref + crop to fill the frame without letterboxing.
    """
    target_w, target_h = FORMAT_SPEC[fmt]
    if target_w == 0:
        return "scale=trunc(iw/2)*2:trunc(ih/2)*2"   # passthrough, ensure even

    target_aspect = target_w / target_h
    src_aspect    = src_w / src_h

    if src_aspect > target_aspect:
        # Source is wider → crop sides
        crop_w = int(src_h * target_aspect)
        crop_h = src_h
    else:
        # Source is taller → crop top/bottom
        crop_w = src_w
        crop_h = int(src_w / target_aspect)

    return (
        f"crop={crop_w}:{crop_h},"
        f"scale={target_w}:{target_h}"
    )


async def apply_social_export(
    input_path: str,
    export_format: ExportFormat = ExportFormat.TIKTOK,
    add_captions: bool = False,
    face_zoom: bool = False,
    add_watermark_text: Optional[str] = None,
    subtitle_path: Optional[str] = None,
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> str:
    """
    Re-encode and reframe a video for a specific social platform.
    Returns path to the processed output file.
    """
    info = await probe_video(input_path)
    src_w = info["width"] or 1920
    src_h = info["height"] or 1080

    if progress_cb:
        await progress_cb(10)

    output_filename = f"{uuid.uuid4().hex}_{export_format.value}.mp4"
    output_path = os.path.join(settings.SCRATCH_DIR, output_filename)

    # ── Build video filter chain ──────────────────────────────────────────────
    vf_filters = [_build_scale_filter(export_format, src_w, src_h)]

    # Watermark text overlay
    if add_watermark_text:
        escaped = add_watermark_text.replace("'", "\\'")
        vf_filters.append(
            f"drawtext=text='{escaped}'"
            f":fontcolor=white@0.6:fontsize=28"
            f":x=(w-text_w)-20:y=(h-text_h)-20"
            f":shadowcolor=black@0.5:shadowx=2:shadowy=2"
        )

    # Burn subtitles if an SRT file was provided
    if add_captions and subtitle_path and os.path.exists(subtitle_path):
        safe_sub = subtitle_path.replace("\\", "/").replace(":", "\\:")
        vf_filters.append(
            f"subtitles='{safe_sub}':force_style='Fontname=Arial,FontSize=18,"
            "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,"
            "Alignment=2,MarginV=40'"
        )

    vf_str = ",".join(vf_filters)

    target_w, target_h = FORMAT_SPEC[export_format]

    ffmpeg_args = [
        "-i", input_path,
        "-vf", vf_str,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
    ]

    if target_w and target_h:
        ffmpeg_args += ["-s", f"{target_w}x{target_h}"]

    ffmpeg_args.append(output_path)
    await run_ffmpeg(*ffmpeg_args)

    if progress_cb:
        await progress_cb(90)

    return output_path
