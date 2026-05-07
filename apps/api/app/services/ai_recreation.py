import json
import os
import tempfile
from typing import Awaitable, Callable, Optional


async def build_recreation_plan(
    input_path: str,
    parameters: dict,
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> str:
    """
    Create the first-stage AI recreation artifact.

    The actual generative video pipeline will consume this manifest later. This
    stage records the rights-safe constraints and avoids watermark/copyright
    stripping or platform-circumvention behavior.
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

    fd, path = tempfile.mkstemp(prefix="ai_recreation_", suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2)

    if progress_cb:
        await progress_cb(95)

    return path
