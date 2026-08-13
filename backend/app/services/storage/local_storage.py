import os
import shutil
from pathlib import Path
from typing import BinaryIO, List
from .base import StorageService
from app.core.config import settings

class LocalStorage(StorageService):
    """
    Local filesystem implementation of StorageService.
    Stores files in a local directory (e.g. backend/data/storage).
    Useful for local offline development without S3/Bunny.net credentials.
    """

    def __init__(self):
        self.base_dir = Path(settings.LOCAL_STORAGE_DIR)
        if not self.base_dir.is_absolute():
            # Make relative to backend root
            self.base_dir = Path(__file__).resolve().parent.parent.parent.parent / settings.LOCAL_STORAGE_DIR
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, key: str) -> Path:
        # Prevent path traversal vulnerabilities
        clean_key = os.path.normpath(key).lstrip("/\\")
        file_path = (self.base_dir / clean_key).resolve()
        if not str(file_path).startswith(str(self.base_dir.resolve())):
            raise ValueError(f"Path traversal attempted with key: {key}")
        return file_path

    async def upload(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream") -> str:
        file_path = self._get_path(key)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            if hasattr(data, "read"):
                shutil.copyfileobj(data, f)
            else:
                f.write(data)

        # Return internal URL pointing to local file service endpoint or static URL
        return f"{settings.BACKEND_URL}/api/v1/storage/files/{key}"

    async def download(self, key: str) -> bytes:
        file_path = self._get_path(key)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found in local storage: {key}")

        with open(file_path, "rb") as f:
            return f.read()

    async def delete(self, key: str) -> None:
        file_path = self._get_path(key)
        if file_path.exists():
            file_path.unlink()

    async def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        # For local storage, returns the direct backend serving endpoint URL
        return f"{settings.BACKEND_URL}/api/v1/storage/files/{key}"

    async def list_objects(self, prefix: str, max_keys: int = 1000) -> List[str]:
        prefix_path = self._get_path(prefix) if prefix else self.base_dir
        if not prefix_path.exists():
            return []

        results = []
        for root, _, files in os.walk(prefix_path):
            for file in files:
                full_path = Path(root) / file
                rel_key = full_path.relative_to(self.base_dir).as_posix()
                results.append(rel_key)
                if len(results) >= max_keys:
                    break
            if len(results) >= max_keys:
                break

        return results
