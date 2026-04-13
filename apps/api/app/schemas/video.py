from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class VideoUploadResponse(BaseModel):
    id: str
    original_filename: str
    file_size_bytes: int
    duration_seconds: Optional[float]
    width: Optional[int]
    height: Optional[int]
    fps: Optional[float]
    has_audio: Optional[bool]
    thumbnail_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoListItem(BaseModel):
    id: str
    original_filename: str
    title: Optional[str]
    duration_seconds: Optional[float]
    width: Optional[int]
    height: Optional[int]
    thumbnail_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoDetail(BaseModel):
    """Full video detail — returned by GET /videos/{id}."""
    id: str
    original_filename: str
    title: Optional[str]
    description: Optional[str]
    file_size_bytes: int
    mime_type: str
    duration_seconds: Optional[float]
    width: Optional[int]
    height: Optional[int]
    fps: Optional[float]
    has_audio: Optional[bool]
    thumbnail_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
