import os
import boto3
from typing import Optional, BinaryIO
from botocore.exceptions import ClientError
from app.core.config import settings
from app.core.logging_config import logger

class BaseStorage:
    async def upload_file(self, file_obj: BinaryIO, destination_path: str) -> str:
        raise NotImplementedError

    async def get_file_path(self, file_key: str) -> str:
        """For local storage, returns absolute path. For S3, might download to temp or return URL."""
        raise NotImplementedError

    async def delete_file(self, file_key: str) -> bool:
        raise NotImplementedError

    async def get_download_url(self, file_key: str) -> str:
        raise NotImplementedError

class LocalStorage(BaseStorage):
    def __init__(self):
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
        os.makedirs(settings.THUMBNAIL_DIR, exist_ok=True)

    async def upload_file(self, file_obj: BinaryIO, destination_path: str) -> str:
        # destination_path here is treated as the relative path from root or absolute
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        with open(destination_path, "wb") as f:
            f.write(file_obj.read())
        return destination_path

    async def get_file_path(self, file_key: str) -> str:
        return os.path.abspath(file_key)

    async def delete_file(self, file_key: str) -> bool:
        if os.path.exists(file_key):
            os.remove(file_key)
            return True
        return False

    async def get_download_url(self, file_key: str) -> str:
        # For local, we assume the API mounts these directories
        if "thumbnails" in file_key:
            return f"/files/thumbnails/{os.path.basename(file_key)}"
        return f"/files/output/{os.path.basename(file_key)}"

class S3Storage(BaseStorage):
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
            endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None
        )
        self.bucket = settings.S3_BUCKET_NAME

    async def upload_file(self, file_obj: BinaryIO, destination_path: str) -> str:
        # Use destination_path as the S3 key
        try:
            self.s3.upload_fileobj(file_obj, self.bucket, destination_path)
            return destination_path
        except Exception as e:
            logger.error(f"S3 Upload Error: {e}")
            raise e

    async def get_file_path(self, file_key: str) -> str:
        # For S3, we often need to download to a temp file for FFmpeg to work
        import tempfile
        ext = os.path.splitext(file_key)[1]
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        self.s3.download_file(self.bucket, file_key, temp_file.name)
        return temp_file.name

    async def delete_file(self, file_key: str) -> bool:
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=file_key)
            return True
        except Exception as e:
            logger.error(f"S3 Delete Error: {e}")
            return False

    async def get_download_url(self, file_key: str) -> str:
        # Generate a signed URL (valid for 1 hour)
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': file_key},
                ExpiresIn=3600
            )
            return url
        except ClientError as e:
            logger.error(f"S3 Presigned URL Error: {e}")
            return ""

def get_storage() -> BaseStorage:
    if settings.STORAGE_TYPE == "s3":
        return S3Storage()
    return LocalStorage()

storage_service = get_storage()
