import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class JobType(str, enum.Enum):
    PATTERN_CUT = "pattern_cut"      # keep N sec / cut M sec
    SILENCE_REMOVAL = "silence_removal"
    AI_SMART_CUT = "ai_smart_cut"
    SUBTITLE_GENERATION = "subtitle_generation"
    VOICEOVER_GENERATION = "voiceover_generation"
    SOCIAL_EXPORT = "social_export"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ExportFormat(str, enum.Enum):
    MP4_HD = "mp4_hd"
    TIKTOK = "tiktok"           # 9:16, 1080x1920
    REELS = "reels"             # 9:16, 1080x1920
    YOUTUBE_SHORTS = "youtube_shorts"  # 9:16, 1080x1920
    LANDSCAPE = "landscape"     # 16:9


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source_video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)

    job_type: Mapped[JobType] = mapped_column(SAEnum(JobType), nullable=False)
    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.PENDING, nullable=False)

    # ── Job parameters (stored as JSON) ──────────────────────────────────────
    # Pattern cut:   {"keep_seconds": 4, "cut_seconds": 1}
    # Silence:       {"silence_threshold_db": -40, "min_silence_duration": 0.5}
    # AI smart cut:  {"remove_silence": true, "remove_low_motion": true, "target_duration_pct": 30}
    # Social export: {"format": "tiktok", "add_captions": true, "face_zoom": true}
    parameters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    preset_id: Mapped[str] = mapped_column(String(64), nullable=True)

    # ── Output ────────────────────────────────────────────────────────────────
    output_file_path: Mapped[str] = mapped_column(String(1024), nullable=True)
    output_filename: Mapped[str] = mapped_column(String(512), nullable=True)
    output_video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    output_duration_seconds: Mapped[float] = mapped_column(Float, nullable=True)
    output_size_bytes: Mapped[int] = mapped_column(Integer, nullable=True)

    # ── Risk Analysis ─────────────────────────────────────────────────────────
    risk_level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    risk_details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # ── Progress & error tracking ─────────────────────────────────────────────
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    has_watermark: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    owner: Mapped["User"] = relationship("User", back_populates="jobs")  # noqa: F821
    source_video: Mapped["Video"] = relationship(
        "Video", 
        back_populates="jobs", 
        foreign_keys=[source_video_id]
    )  # noqa: F821

    def __repr__(self) -> str:
        return f"<Job {self.job_type} [{self.status}] {self.progress_pct}%>"
