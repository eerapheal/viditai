from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.video import VideoType


class VideoUploadResponse(BaseModel):
    video_id: str
    id: str = ""  # Alias for frontend compatibility
    original_filename: str
    file_size_bytes: int
    duration: Optional[float]
    width: Optional[int]
    height: Optional[int]
    has_audio: Optional[bool]
    status: str = "uploaded"
    thumbnail_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}

    def model_post_init(self, __context) -> None:
        if not self.id:
            self.id = self.video_id


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
    video_id: str
    original_filename: str
    title: Optional[str]
    description: Optional[str]
    file_size_bytes: int
    mime_type: str
    duration: Optional[float]
    width: Optional[int]
    height: Optional[int]
    fps: Optional[float]
    has_audio: Optional[bool]
    thumbnail_url: Optional[str]
    type: VideoType
    source_video_id: Optional[str] = None
    download_url: Optional[str] = None
    export_format: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
