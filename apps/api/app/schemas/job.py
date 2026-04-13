from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, Any
from datetime import datetime
from app.models.job import JobType, JobStatus, ExportFormat


# ── Pattern Cut ───────────────────────────────────────────────────────────────

class PatternCutParams(BaseModel):
    """Keep N seconds, cut M seconds repeatedly through the whole video."""
    keep_seconds: float = Field(4.0, gt=0, le=60, description="Seconds to keep per cycle")
    cut_seconds: float = Field(1.0, gt=0, le=60, description="Seconds to cut per cycle")


# ── Silence Removal ───────────────────────────────────────────────────────────

class SilenceRemovalParams(BaseModel):
    silence_threshold_db: float = Field(-40.0, description="dB level considered silence")
    min_silence_duration: float = Field(0.5, gt=0, description="Minimum silence gap to cut (seconds)")
    padding_seconds: float = Field(0.1, ge=0, description="Seconds of audio to keep around each cut")


# ── AI Smart Cut ─────────────────────────────────────────────────────────────

class AISmartCutParams(BaseModel):
    remove_silence: bool = True
    remove_low_motion: bool = True
    remove_filler_words: bool = False      # requires Whisper
    target_duration_pct: int = Field(30, ge=5, le=100, description="Target output length as % of original")


# ── Social Export ─────────────────────────────────────────────────────────────

class SocialExportParams(BaseModel):
    format: ExportFormat = ExportFormat.TIKTOK
    add_captions: bool = False
    face_zoom: bool = False
    add_watermark_text: Optional[str] = None


# ── Generic Job Request ───────────────────────────────────────────────────────

class JobCreate(BaseModel):
    video_id: str
    job_type: JobType
    parameters: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_parameters(self) -> "JobCreate":
        """Validate parameters against the correct schema for the job type."""
        validators = {
            JobType.PATTERN_CUT: PatternCutParams,
            JobType.SILENCE_REMOVAL: SilenceRemovalParams,
            JobType.AI_SMART_CUT: AISmartCutParams,
            JobType.SOCIAL_EXPORT: SocialExportParams,
        }
        if self.job_type in validators:
            validators[self.job_type](**self.parameters)  # raises ValidationError if invalid
        return self


# ── Job Response ──────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: str
    job_type: JobType
    status: JobStatus
    progress_pct: int
    parameters: dict
    error_message: Optional[str]
    output_filename: Optional[str]
    output_duration_seconds: Optional[float]
    output_size_bytes: Optional[int]
    has_watermark: bool
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    # computed
    download_url: Optional[str] = None

    model_config = {"from_attributes": True}
