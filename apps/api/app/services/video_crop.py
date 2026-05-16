import os
import uuid
from typing import Any

from app.core.config import settings
from app.services.ffmpeg import probe_video, run_ffmpeg


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def _even(value: int) -> int:
    return max(2, value - (value % 2))


def _parse_crop_rect(crop: dict[str, Any], width: int, height: int) -> tuple[int, int, int, int] | None:
    rect = crop.get("rect") if isinstance(crop, dict) else None
    if not isinstance(rect, dict):
        return None

    x = _clamp(float(rect.get("x", 0)), 0.0, 1.0)
    y = _clamp(float(rect.get("y", 0)), 0.0, 1.0)
    w = _clamp(float(rect.get("width", 1)), 0.01, 1.0)
    h = _clamp(float(rect.get("height", 1)), 0.01, 1.0)

    if x + w > 1.0:
        w = 1.0 - x
    if y + h > 1.0:
        h = 1.0 - y

    crop_w = _even(round(width * w))
    crop_h = _even(round(height * h))
    crop_x = _even(round(width * x))
    crop_y = _even(round(height * y))

    crop_w = min(crop_w, _even(width - crop_x))
    crop_h = min(crop_h, _even(height - crop_y))

    if crop_w >= _even(width) and crop_h >= _even(height) and crop_x == 0 and crop_y == 0:
        return None
    if crop_w < 2 or crop_h < 2:
        return None
    return crop_x, crop_y, crop_w, crop_h


async def apply_video_crop(input_path: str, crop: dict[str, Any] | None) -> str:
    """
    Apply a normalized manual crop before downstream editing.

    Crop rect values are percentages of the source frame:
    {"enabled": true, "rect": {"x": 0, "y": 0, "width": 1, "height": 1}}
    """
    if not crop or not crop.get("enabled"):
        return input_path

    info = await probe_video(input_path)
    rect = _parse_crop_rect(crop, int(info["width"]), int(info["height"]))
    if not rect:
        return input_path

    crop_x, crop_y, crop_w, crop_h = rect
    os.makedirs(settings.SCRATCH_DIR, exist_ok=True)
    output_path = os.path.join(settings.SCRATCH_DIR, f"{uuid.uuid4().hex}_manual_crop.mp4")

    await run_ffmpeg(
        "-i", input_path,
        "-vf", f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y}",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "copy" if info.get("has_audio") else "aac",
        "-movflags", "+faststart",
        output_path,
    )
    return output_path
