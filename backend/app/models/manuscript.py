from sqlmodel import SQLModel, Field, Relationship
from uuid import UUID, uuid4
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import JSONB

class Manuscript(SQLModel, table=True):
    __tablename__ = "manuscripts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", index=True)
    original_filename: str
    storage_key: str
    status: str = Field(default="DRAFT")
    target_journal_id: Optional[UUID] = Field(default=None, foreign_key="journal_templates.id")
    raw_parsed_json: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    word_count: int = Field(default=0)
    exported_storage_key: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ExtractedMetadata(SQLModel, table=True):
    __tablename__ = "extracted_metadata"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    manuscript_id: UUID = Field(foreign_key="manuscripts.id", unique=True, index=True)
    title: Optional[str] = None
    authors: list[dict] = Field(default_factory=list, sa_column=Column(JSONB))
    affiliations: list[dict] = Field(default_factory=list, sa_column=Column(JSONB))
    corresponding_author: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    abstract: Optional[str] = None
    keywords: list[str] = Field(default_factory=list, sa_column=Column(JSONB))
    sections: list[dict] = Field(default_factory=list, sa_column=Column(JSONB))
    references: list[dict] = Field(default_factory=list, sa_column=Column(JSONB))
    funding: list[dict] = Field(default_factory=list, sa_column=Column(JSONB))
    conflict_of_interest: Optional[str] = None
    ethics_statement: Optional[str] = None
    data_availability: Optional[str] = None
    author_contributions: Optional[str] = None
    acknowledgements: Optional[str] = None
    is_human_verified: bool = Field(default=False)
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
