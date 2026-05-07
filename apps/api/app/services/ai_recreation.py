import json
import os
import uuid
from typing import Awaitable, Callable, Optional

from app.core.config import settings
from app.services.ffmpeg import run_ffmpeg


async def build_recreation_plan(
    input_path: str,
    parameters: dict,
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> str:
    """
    Create the first-stage AI recreation artifact.

    The full generative renderer can replace this later. For now, this produces
    a downloadable MP4 preview plus a sidecar JSON manifest, while preserving
    the rights-safe constraints and avoiding watermark/copyright stripping or
    platform-circumvention behavior.
    """
    if progress_cb:
        await progress_cb(20)

    plan = {
        "source_filename": os.path.basename(input_path),
        "target_platform": parameters.get("target_platform", "youtube"),
        "source_treatment": parameters.get("source_treatment"),
        "title": parameters.get("title"),
        "prompt": parameters.get("prompt"),
        "desired_changes": parameters.get("desired_changes", []),
        "requested_actions": parameters.get("requested_actions", []),
        "audio_strategy": parameters.get("audio_strategy", "mute"),
        "include_source_audio": parameters.get("include_source_audio", False),
        "own_branding": parameters.get("own_branding"),
        "rights_attestation": parameters.get("rights_attestation", {}),
        "allowed_capabilities": [
            "remove_own_branding",
            "replace_audio_with_licensed_track",
            "generate_new_voiceover",
            "recreate_from_storyboard",
            "youtube_policy_check",
        ],
        "blocked_capabilities": [
            "copyright_removal",
            "third_party_watermark_removal",
            "content_id_bypass",
        ],
        "pipeline_status": "plan_created",
        "next_step": "connect generative video renderer",
    }

    if progress_cb:
        await progress_cb(70)

    os.makedirs(settings.SCRATCH_DIR, exist_ok=True)
    output_path = os.path.join(settings.SCRATCH_DIR, f"{uuid.uuid4().hex}_ai_recreate.mp4")
    manifest_path = os.path.splitext(output_path)[0] + ".json"

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2)

    if progress_cb:
        await progress_cb(80)

    include_source_audio = bool(parameters.get("include_source_audio", False))
    if include_source_audio:
        await run_ffmpeg(
            "-i", input_path,
            "-map", "0:v:0",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-movflags", "+faststart",
            output_path,
        )
    else:
        await run_ffmpeg(
            "-i", input_path,
            "-map", "0:v:0",
            "-an",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-movflags", "+faststart",
            output_path,
        )

    if progress_cb:
        await progress_cb(95)

    return output_path
