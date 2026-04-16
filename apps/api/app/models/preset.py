import uuid
from sqlalchemy import String, Boolean, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.job import JobType

class Preset(Base):
    __tablename__ = "presets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # Using slug-like IDs for built-ins
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=True)
    
    job_type: Mapped[JobType] = mapped_column(SAEnum(JobType), nullable=False)
    parameters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pro_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<Preset {self.name} ({self.job_type})>"
