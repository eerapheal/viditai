"""
User management endpoints — profile, plan, quota
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User, Plan
from app.schemas.user import UserPublic, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserPublic)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get authenticated user profile."""
    return UserPublic.model_validate(current_user)


@router.patch("/me", response_model=UserPublic)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update display name or avatar URL."""
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    current_user.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return UserPublic.model_validate(current_user)


@router.get("/me/quota")
async def get_quota(current_user: User = Depends(get_current_user)):
    """Return current usage and limits for the user's plan."""
    from app.core.config import settings

    # Reset monthly counter if calendar month rolled over
    now = datetime.now(timezone.utc)
    if (
        now.year > current_user.exports_reset_at.year
        or now.month > current_user.exports_reset_at.month
    ):
        current_user.monthly_exports_used = 0
        current_user.exports_reset_at = now

    plan_limits = {
        Plan.FREE: {
            "monthly_exports": settings.FREE_MONTHLY_EXPORTS,
            "max_video_minutes": settings.FREE_MAX_VIDEO_MINUTES,
            "watermark": True,
            "ai_features": False,
        },
        Plan.PRO: {
            "monthly_exports": -1,          # unlimited
            "max_video_minutes": 120,
            "watermark": False,
            "ai_features": True,
        },
        Plan.BUSINESS: {
            "monthly_exports": -1,
            "max_video_minutes": 480,
            "watermark": False,
            "ai_features": True,
        },
    }

    limits = plan_limits[current_user.plan]
    remaining = (
        max(0, limits["monthly_exports"] - current_user.monthly_exports_used)
        if limits["monthly_exports"] != -1
        else None   # None means unlimited
    )

    return {
        "plan": current_user.plan,
        "monthly_exports_used": current_user.monthly_exports_used,
        "monthly_exports_limit": limits["monthly_exports"],
        "monthly_exports_remaining": remaining,
        "max_video_minutes": limits["max_video_minutes"],
        "watermark": limits["watermark"],
        "ai_features": limits["ai_features"],
        "exports_reset_at": current_user.exports_reset_at,
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete user account and cascade all data."""
    await db.delete(current_user)
    await db.flush()
