"""
Admin endpoints — stats, user management (admin-only)
Protected by a simple role check on the user plan (extend to RBAC later).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User, Plan
from app.models.video import Video
from app.models.job import Job, JobStatus
from app.schemas.user import UserPublic

router = APIRouter()


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: only BUSINESS plan users can access admin routes."""
    if current_user.plan != Plan.BUSINESS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access requires a Business plan.",
        )
    return current_user


# ── Platform-wide statistics ──────────────────────────────────────────────────

@router.get("/stats")
async def platform_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Overall platform statistics."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_videos = (await db.execute(select(func.count(Video.id)))).scalar_one()
    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar_one()
    completed_jobs = (
        await db.execute(select(func.count(Job.id)).where(Job.status == JobStatus.COMPLETED))
    ).scalar_one()
    failed_jobs = (
        await db.execute(select(func.count(Job.id)).where(Job.status == JobStatus.FAILED))
    ).scalar_one()
    pending_jobs = (
        await db.execute(select(func.count(Job.id)).where(Job.status == JobStatus.PENDING))
    ).scalar_one()

    plan_counts = {}
    for plan in Plan:
        cnt = (
            await db.execute(select(func.count(User.id)).where(User.plan == plan))
        ).scalar_one()
        plan_counts[plan.value] = cnt

    return {
        "users": {
            "total": total_users,
            "by_plan": plan_counts,
        },
        "videos": {"total": total_videos},
        "jobs": {
            "total": total_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
            "pending": pending_jobs,
            "success_rate": round(completed_jobs / total_jobs * 100, 1) if total_jobs else 0,
        },
    }


# ── User management ───────────────────────────────────────────────────────────

@router.get("/users", response_model=dict)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    plan: Optional[Plan] = Query(None),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all platform users (admin view)."""
    offset = (page - 1) * page_size
    query = select(User)
    count_query = select(func.count(User.id))
    if plan:
        query = query.where(User.plan == plan)
        count_query = count_query.where(User.plan == plan)

    total = (await db.execute(count_query)).scalar_one()
    users = (
        await db.execute(query.order_by(User.created_at.desc()).offset(offset).limit(page_size))
    ).scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [UserPublic.model_validate(u).model_dump() for u in users],
    }


@router.patch("/users/{user_id}/plan")
async def update_user_plan(
    user_id: str,
    new_plan: Plan,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade or downgrade any user's plan."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    old_plan = user.plan
    user.plan = new_plan
    await db.flush()
    return {"user_id": user_id, "old_plan": old_plan, "new_plan": new_plan, "success": True}


@router.patch("/users/{user_id}/disable")
async def disable_user(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_active = False
    await db.flush()
    return {"user_id": user_id, "is_active": False, "success": True}
