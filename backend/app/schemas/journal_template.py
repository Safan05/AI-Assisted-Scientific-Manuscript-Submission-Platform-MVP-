# backend/app/schemas/journal_template.py
"""Pydantic schemas for Journal Templates and Template Rules."""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# ── Template Rules ───────────────────────────────────────────────────

class TemplateRuleBase(BaseModel):
    rule_key: str = Field(..., description="Unique machine key (e.g. abstract_word_limit)")
    rule_type: str = Field(..., description="Type of check: word_count | required_field | regex | presence")
    rule_config: dict[str, Any] = Field(default_factory=dict, description="Configuration parameters for the rule engine")
    severity: str = Field(default="FAIL", description="Severity level: FAIL | WARN | INFO")
    message: str = Field(..., description="Human-readable violation message")
    sort_order: int = Field(default=0, description="Display sorting order")


class TemplateRuleCreate(TemplateRuleBase):
    pass


class TemplateRuleUpdate(BaseModel):
    rule_key: Optional[str] = None
    rule_type: Optional[str] = None
    rule_config: Optional[dict[str, Any]] = None
    severity: Optional[str] = None
    message: Optional[str] = None
    sort_order: Optional[int] = None


class TemplateRuleRead(TemplateRuleBase):
    id: UUID
    template_id: UUID

    class Config:
        from_attributes = True


# ── Journal Templates ────────────────────────────────────────────────

class JournalTemplateBase(BaseModel):
    name: str = Field(..., description="Display name of the target journal")
    slug: str = Field(..., description="URL-friendly unique slug (e.g. nature, plos-one)")
    description: Optional[str] = Field(default=None, description="Overview of journal scope & formatting profile")
    heading_structure: dict[str, Any] = Field(default_factory=dict, description="Expected section heading hierarchy")
    reference_format: dict[str, Any] = Field(default_factory=dict, description="Reference styling guidelines and limits")
    formatting_rules: dict[str, Any] = Field(default_factory=dict, description="Equations, figures, tables, line numbering specs")
    title_page_layout: dict[str, Any] = Field(default_factory=dict, description="Title page, author, and correspondence rules")
    required_statements: dict[str, Any] = Field(default_factory=dict, description="Mandatory disclosure statements (COI, Data, Ethics)")
    max_abstract_words: Optional[int] = Field(default=None, description="Abstract word count cap")
    max_total_words: Optional[int] = Field(default=None, description="Main text word count cap (null if uncapped)")
    is_active: bool = Field(default=True, description="Whether template is selectable by users")


class JournalTemplateCreate(JournalTemplateBase):
    rules: Optional[List[TemplateRuleCreate]] = None


class JournalTemplateUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    heading_structure: Optional[dict[str, Any]] = None
    reference_format: Optional[dict[str, Any]] = None
    formatting_rules: Optional[dict[str, Any]] = None
    title_page_layout: Optional[dict[str, Any]] = None
    required_statements: Optional[dict[str, Any]] = None
    max_abstract_words: Optional[int] = None
    max_total_words: Optional[int] = None
    is_active: Optional[bool] = None


class JournalTemplateRead(JournalTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JournalTemplateDetailRead(JournalTemplateRead):
    rules: List[TemplateRuleRead] = Field(default_factory=list)
