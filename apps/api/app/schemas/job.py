from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, Any
from datetime import datetime
from app.models.job import JobType, JobStatus, ExportFormat, RiskLevel


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


# ── Unified Job Settings ───────────────────────────────────────────────────

class CutPattern(BaseModel):
    keep: float
    remove: float

class AudioSettings(BaseModel):
    mode: str  # "mute", "replace", "original"
    library_track: Optional[str] = None

class JobSettings(BaseModel):
    cut_pattern: Optional[CutPattern] = None
    audio: Optional[AudioSettings] = None
    captions: bool = False
    ai_voiceover: bool = False
    export_format: str = "9:16"
    zoom_effects: bool = False

class RiskDetails(BaseModel):
    audio_detected: bool = False
    transformation_score: float = 0.0


# ── Generic Job Request ───────────────────────────────────────────────────────

class JobCreate(BaseModel):
    video_id: str
    preset_id: Optional[str] = None
    job_type: Optional[JobType] = JobType.PATTERN_CUT
    settings: Optional[JobSettings] = None
    parameters: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_parameters(self) -> "JobCreate":
        """Validate parameters against the correct schema for the job type.
        
        Only validates the fields relevant to each job type — extra fields
        (like audio_mode, add_captions, etc.) are allowed and passed through.
        """
        validators = {
            JobType.PATTERN_CUT: PatternCutParams,
            JobType.SILENCE_REMOVAL: SilenceRemovalParams,
            JobType.AI_SMART_CUT: AISmartCutParams,
            JobType.SOCIAL_EXPORT: SocialExportParams,
        }
        if self.job_type in validators:
            schema_cls = validators[self.job_type]
            # Extract only the fields that the schema expects
            valid_fields = schema_cls.model_fields.keys()
            subset = {k: v for k, v in self.parameters.items() if k in valid_fields}
            schema_cls(**subset)  # raises ValidationError if core fields are invalid
        return self


# ── Job Response ──────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    job_id: str  # maps from 'id'
    status: JobStatus
    progress: int  # maps from 'progress_pct'
    output_video_id: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.LOW
    risk_details: dict = Field(default_factory=dict)
    
    # Keeping old fields for backend compatibility
    id: str
    job_type: JobType
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
    download_url: Optional[str] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Ensure aliases are populated if the originals are present
            if "id" in data and "job_id" not in data:
                data["job_id"] = data["id"]
            if "progress_pct" in data and "progress" not in data:
                data["progress"] = data["progress_pct"]
            
            # Map risk fields from nested parameters if they exist there
            if "parameters" in data and isinstance(data["parameters"], dict):
                params = data["parameters"]
                if "risk_level" in params and "risk_level" not in data:
                    data["risk_level"] = params["risk_level"]
                if "risk_details" in params and "risk_details" not in data:
                    data["risk_details"] = params["risk_details"]
        return data
