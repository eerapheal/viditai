import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class Plan(str, enum.Enum):
    FREE = "FREE"
    PRO = "PRO"
    BUSINESS = "BUSINESS"


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=True)

    plan: Mapped[Plan] = mapped_column(SAEnum(Plan), default=Plan.FREE, nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    monthly_exports_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    exports_reset_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    videos: Mapped[list["Video"]] = relationship("Video", back_populates="owner", cascade="all, delete-orphan")  # noqa: F821
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="owner", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.plan}]>"
