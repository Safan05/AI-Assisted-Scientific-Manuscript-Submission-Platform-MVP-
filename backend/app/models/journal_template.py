from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from typing import Optional
from datetime import datetime
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class JournalTemplate(SQLModel, table=True):
    __tablename__ = "journal_templates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True)
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    heading_structure: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    reference_format: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    formatting_rules: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    title_page_layout: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    required_statements: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    max_abstract_words: Optional[int] = None
    max_total_words: Optional[int] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TemplateRule(SQLModel, table=True):
    __tablename__ = "template_rules"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    template_id: UUID = Field(foreign_key="journal_templates.id", index=True)
    rule_key: str
    rule_type: str
    rule_config: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    severity: str = Field(default="FAIL")
    message: str
    sort_order: int = Field(default=0)
