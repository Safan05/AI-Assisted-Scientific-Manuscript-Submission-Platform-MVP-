from app.core.config import settings
from .base import StorageService
from .local_storage import LocalStorage


def get_storage_service() -> StorageService:
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "local":
        return LocalStorage()
    elif provider in ("bunny", "minio", "s3"):
        from .s3_compatible import S3CompatibleStorage
        return S3CompatibleStorage()
    raise ValueError(f"Unknown storage provider: {provider}")

