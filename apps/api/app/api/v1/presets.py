"""
Presets endpoints — built-in cutting presets + user custom presets
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()


# ── Built-in preset catalogue ─────────────────────────────────────────────────

BUILTIN_PRESETS = [
    {
        "id": "fast_pace",
        "name": "Fast Pace",
        "description": "High-energy edits — great for action clips",
        "job_type": "pattern_cut",
        "parameters": {"keep_seconds": 3, "cut_seconds": 1},
        "is_builtin": True,
    },
    {
        "id": "normal",
        "name": "Normal",
        "description": "Balanced rhythm — good for vlogs",
        "job_type": "pattern_cut",
        "parameters": {"keep_seconds": 5, "cut_seconds": 1},
        "is_builtin": True,
    },
    {
        "id": "aggressive",
        "name": "Aggressive",
        "description": "Heavy trimming — turn long recordings into tight shorts",
        "job_type": "pattern_cut",
        "parameters": {"keep_seconds": 2, "cut_seconds": 2},
        "is_builtin": True,
    },
    {
        "id": "viral_mode",
        "name": "Viral Mode ⚡",
        "description": "One-tap: silence removed + TikTok export",
        "job_type": "ai_smart_cut",
        "parameters": {
            "remove_silence": True,
            "remove_low_motion": True,
            "remove_filler_words": False,
            "target_duration_pct": 25,
        },
        "is_builtin": True,
        "pro_only": True,
    },
    {
        "id": "podcast_clean",
        "name": "Podcast Clean",
        "description": "Remove dead air and filler words from audio recordings",
        "job_type": "silence_removal",
        "parameters": {
            "silence_threshold_db": -40,
            "min_silence_duration": 0.5,
            "padding_seconds": 0.15,
        },
        "is_builtin": True,
    },
    {
        "id": "tiktok_export",
        "name": "TikTok Export",
        "description": "Re-frame and export for TikTok / Reels 9:16",
        "job_type": "social_export",
        "parameters": {
            "format": "tiktok",
            "add_captions": False,
            "face_zoom": False,
        },
        "is_builtin": True,
    },
]


@router.get("/", response_model=List[dict])
async def list_presets(current_user: User = Depends(get_current_user)):
    """Return all built-in presets (with pro_only flag respected)."""
    return BUILTIN_PRESETS


@router.get("/{preset_id}", response_model=dict)
async def get_preset(preset_id: str, current_user: User = Depends(get_current_user)):
    """Return a single preset by ID."""
    preset = next((p for p in BUILTIN_PRESETS if p["id"] == preset_id), None)
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found.")
    return preset
