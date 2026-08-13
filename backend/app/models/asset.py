from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional
from datetime import datetime

class ManuscriptAsset(SQLModel, table=True):
    __tablename__ = "manuscript_assets"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    manuscript_id: UUID = Field(foreign_key="manuscripts.id", index=True)
    asset_type: str = Field(description="image | table | supplementary | figure")
    original_name: str
    storage_key: str
    mime_type: str
    file_size_bytes: int
    order_index: int = Field(default=0)
    caption: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
