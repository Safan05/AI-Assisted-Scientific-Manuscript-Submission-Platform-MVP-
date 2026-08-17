# backend/app/schemas/preflight.py
"""
Pydantic Schemas for Preflight Checklist Evaluations.
"""

from __future__ import annotations

from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PreflightCheckItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    result_id: UUID
    rule_id: Optional[UUID] = None
    rule_key: str
    rule_type: str
    status: str  # PASS, WARN, FAIL
    message: str
    actual_value: Optional[dict[str, Any]] = None
    expected_value: Optional[dict[str, Any]] = None
    human_overridden: bool = False
    override_reason: Optional[str] = None
    sort_order: int = 0
    created_at: datetime


class PreflightResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    manuscript_id: UUID
    template_id: UUID
    template_name: Optional[str] = None
    template_slug: Optional[str] = None
    overall_status: str  # PASS, WARN, FAIL
    human_confirmed: bool = False
    confirmed_at: Optional[datetime] = None
    summary_counts: dict[str, int] = {}
    created_at: datetime
    updated_at: datetime
    items: list[PreflightCheckItemRead] = []


class PreflightOverrideRequest(BaseModel):
    item_id: UUID
    override_reason: Optional[str] = None
    human_overridden: bool = True


class PreflightConfirmResponse(BaseModel):
    status: str
    message: str
    manuscript_status: str
    confirmed_at: datetime
