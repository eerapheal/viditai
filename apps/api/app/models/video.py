import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


import enum

class VideoType(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSED = "processed"


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # ── File info ──────────────────────────────────────────────────────────────
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(512), nullable=False)   # UUID-based safe name
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)

    # ── Video metadata (populated after FFprobe analysis) ─────────────────────
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=True)
    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)
    fps: Mapped[float] = mapped_column(Float, nullable=True)
    has_audio: Mapped[bool] = mapped_column(Boolean, default=True, nullable=True)
    thumbnail_path: Mapped[str] = mapped_column(String(1024), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # ── Lineage ───────────────────────────────────────────────────────────────
    type: Mapped[VideoType] = mapped_column(SAEnum(VideoType), default=VideoType.UPLOADED, nullable=False)
    source_video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    processing_job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    owner: Mapped["User"] = relationship("User", back_populates="videos")  # noqa: F821
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="source_video", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Video {self.original_filename} ({self.duration_seconds}s)>"
