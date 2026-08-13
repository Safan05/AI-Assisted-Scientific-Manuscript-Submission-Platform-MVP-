from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

class ManuscriptCreate(BaseModel):
    project_id: UUID

class ManuscriptUpdate(BaseModel):
    status: Optional[str] = None
    target_journal_id: Optional[UUID] = None

class ManuscriptRead(BaseModel):
    id: UUID
    project_id: UUID
    original_filename: str
    status: str
    target_journal_id: Optional[UUID] = None
    word_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
