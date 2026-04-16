from pydantic import BaseModel, Field
from typing import Optional, Any
from app.models.job import JobType

class PresetBase(BaseModel):
    name: str
    description: Optional[str] = None
    job_type: JobType
    parameters: dict[str, Any] = Field(default_factory=dict)
    is_builtin: bool = False
    pro_only: bool = False

class PresetCreate(PresetBase):
    id: str  # Mandatory for create (serves as slug)

class PresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[dict[str, Any]] = None
    pro_only: Optional[bool] = None

class PresetPublic(PresetBase):
    id: str

    model_config = {"from_attributes": True}
