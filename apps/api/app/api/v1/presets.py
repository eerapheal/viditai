"""
Presets endpoints — built-in cutting presets + user custom presets
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.preset import Preset
from app.schemas.preset import PresetPublic
from app.models.job import JobType

router = APIRouter()


@router.get("/", response_model=List[PresetPublic])
async def list_presets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return all available presets from the database."""
    result = await db.execute(select(Preset).order_by(Preset.is_builtin.desc(), Preset.name))
    presets = result.scalars().all()
    
    # If DB is empty, this could be a first start issue. 
    # In a production app, we'd have a migration/seeding script.
    return presets


@router.get("/{preset_id}", response_model=PresetPublic)
async def get_preset(
    preset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return a single preset by ID/slug."""
    result = await db.execute(select(Preset).where(Preset.id == preset_id))
    preset = result.scalar_one_or_none()
    
    if not preset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found.")
    return preset


async def seed_default_presets(db: AsyncSession):
    """Utility to initialize the DB with requested default presets."""
    defaults = [
        {
            "id": "autocut_standard",
            "name": "AutoCut",
            "description": "Standard 4s keep / 1s remove pattern. Perfect for rhythmic edits.",
            "job_type": JobType.PATTERN_CUT,
            "parameters": {"keep_seconds": 4.0, "cut_seconds": 1.0},
            "is_builtin": True,
            "pro_only": False,
        },
        {
            "id": "viral_smart",
            "name": "Viral",
            "description": "Fast cuts (30% duration) + automated captions for maximum engagement.",
            "job_type": JobType.AI_SMART_CUT,
            "parameters": {
                "remove_silence": True, 
                "remove_low_motion": True, 
                "target_duration_pct": 30,
                "add_captions": True
            },
            "is_builtin": True,
            "pro_only": True,
        },
        {
            "id": "safe_remix",
            "name": "Safe Remix",
            "description": "Risk-free content: original audio replaced + subtle transformations.",
            "job_type": JobType.PATTERN_CUT,
            "parameters": {
                "keep_seconds": 5.0, 
                "cut_seconds": 0.5,
                "audio_mode": "replace",
                "risk_mitigation": True
            },
            "is_builtin": True,
            "pro_only": False,
        }
    ]
    
    for d in defaults:
        # Check if exists
        existing = await db.execute(select(Preset).where(Preset.id == d["id"]))
        if not existing.scalar_one_or_none():
            db.add(Preset(**d))
    
    await db.commit()
