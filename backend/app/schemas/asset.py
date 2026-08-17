# backend/app/schemas/asset.py
"""Schemas for ManuscriptAsset API responses."""

from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class AssetRead(BaseModel):
    id: UUID
    manuscript_id: UUID
    asset_type: str
    original_name: str
    storage_key: str
    mime_type: str
    file_size_bytes: int
    order_index: int
    caption: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
