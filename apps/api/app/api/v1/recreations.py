"""
Rights-safe AI video recreation endpoints.

This router intentionally does not support copyright removal, watermark
removal, Content ID bypassing, or similar platform-circumvention workflows.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.jobs import _check_ai_access, _check_quota
from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.job import Job, JobStatus, JobType, RiskLevel
from app.models.user import Plan, User
from app.models.video import Video
from app.schemas.recreation import RecreationCreate, RecreationResponse

router = APIRouter()

SAFETY_POLICY = (
    "Use only content the uploader owns, controls, or is licensed to transform. "
    "Copyright-removal, third-party watermark-removal, and Content ID bypass requests are rejected. "
    "Own-branding removal is allowed only with brand ownership attestation."
)


def _to_response(job: Job) -> RecreationResponse:
    return RecreationResponse(
        job_id=job.id,
        status=job.status.value,
        video_id=job.source_video_id,
        job_type=job.job_type.value,
        safety_policy=SAFETY_POLICY,
        next_step="worker_generates_recreation_plan",
        parameters=job.parameters,
    )


@router.post("/", response_model=RecreationResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_recreation(
    body: RecreationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Queue a rights-safe AI recreation job for a user-owned or licensed source video.
    """
    result = await db.execute(
        select(Video).where(Video.id == body.video_id, Video.owner_id == current_user.id)
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found.")

    await _check_quota(current_user, db)
    await _check_ai_access(current_user, JobType.AI_RECREATE)

    parameters = body.model_dump(mode="json")
    parameters["risk_level"] = RiskLevel.MEDIUM.value
    parameters["risk_details"] = {
        "rights_basis": body.rights_attestation.rights_basis.value,
        "source_treatment": body.source_treatment.value,
        "audio_strategy": body.audio_strategy.value,
        "requested_actions": [action.value for action in body.requested_actions],
        "own_branding": body.own_branding.model_dump(mode="json") if body.own_branding else None,
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
    }

    job = Job(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        source_video_id=video.id,
        job_type=JobType.AI_RECREATE,
        status=JobStatus.PENDING,
        parameters=parameters,
        has_watermark=(current_user.plan == Plan.FREE),
        risk_level=RiskLevel.MEDIUM,
        risk_details=parameters["risk_details"],
        progress_pct=0,
    )
    db.add(job)
    current_user.monthly_exports_used += 1
    await db.flush()
    await db.commit()

    return _to_response(job)


@router.get("/{job_id}", response_model=RecreationResponse)
async def get_recreation(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the queued recreation job summary."""
    result = await db.execute(
        select(Job).where(
            Job.id == job_id,
            Job.owner_id == current_user.id,
            Job.job_type == JobType.AI_RECREATE,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recreation job not found.")
    return _to_response(job)
