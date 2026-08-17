# backend/app/models/preflight.py
"""
Preflight Evaluation Models.

Stores evaluation execution records (PreflightResult) and individual check items
(PreflightCheckItem) evaluating a manuscript against target journal constraints.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class PreflightCheckItem(SQLModel, table=True):
    __tablename__ = "preflight_check_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    result_id: UUID = Field(foreign_key="preflight_results.id", index=True)
    rule_id: Optional[UUID] = Field(default=None, foreign_key="template_rules.id", nullable=True)
    rule_key: str
    rule_type: str  # word_count, required_field, regex, presence, structure
    status: str  # PASS, WARN, FAIL
    message: str
    actual_value: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    expected_value: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    human_overridden: bool = Field(default=False)
    override_reason: Optional[str] = None
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    result: Optional["PreflightResult"] = Relationship(back_populates="items")


class PreflightResult(SQLModel, table=True):
    __tablename__ = "preflight_results"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    manuscript_id: UUID = Field(foreign_key="manuscripts.id", index=True)
    template_id: UUID = Field(foreign_key="journal_templates.id", index=True)
    overall_status: str = Field(default="PASS")  # PASS, WARN, FAIL
    human_confirmed: bool = Field(default=False)
    confirmed_at: Optional[datetime] = None
    summary_counts: Dict[str, int] = Field(default_factory=dict, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    items: List[PreflightCheckItem] = Relationship(
        back_populates="result",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )
