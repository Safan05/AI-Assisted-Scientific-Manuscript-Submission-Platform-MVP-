from abc import ABC, abstractmethod
from typing import BinaryIO, Optional

class StorageService(ABC):
    @abstractmethod
    async def upload(self, key: str, data: BinaryIO, content_type: str = "application/octet-stream") -> str:
        ...

    @abstractmethod
    async def download(self, key: str) -> bytes:
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        ...

    @abstractmethod
    async def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        ...

    @abstractmethod
    async def list_objects(self, prefix: str, max_keys: int = 1000) -> list[str]:
        ...
