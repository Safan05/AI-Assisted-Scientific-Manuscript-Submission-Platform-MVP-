# backend/app/api/v1/endpoints/preflight.py
"""
Preflight Checklist API Endpoints.

Provides endpoints to run preflight validation checks, inspect results,
override warning items, and confirm compliance to transition manuscript status.
"""

from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException, status

from app.core.deps import SessionDep, CurrentUser
from app.crud.manuscript import get_manuscript
from app.crud.journal_template import get_template, get_template_rules
from app.crud import preflight as preflight_crud
from app.schemas.preflight import (
    PreflightResultRead,
    PreflightCheckItemRead,
    PreflightOverrideRequest,
    PreflightConfirmResponse,
)
from app.services.preflight.checker import PreflightChecker

router = APIRouter()


@router.post(
    "/{manuscript_id}/preflight",
    response_model=PreflightResultRead,
    summary="Run preflight compliance checks",
    description="Evaluates manuscript metadata against assigned target journal rules.",
)
async def run_manuscript_preflight(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    manuscript = await get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manuscript not found.",
        )

    if not manuscript.target_journal_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No target journal assigned. Please select a target journal before running preflight checks.",
        )

    template = await get_template(session, manuscript.target_journal_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned target journal template not found.",
        )

    rules = await get_template_rules(session, template.id)

    # Run check
    result = await PreflightChecker.run_preflight(session, manuscript, template, rules)

    return PreflightResultRead(
        id=result.id,
        manuscript_id=result.manuscript_id,
        template_id=result.template_id,
        template_name=template.name,
        template_slug=template.slug,
        overall_status=result.overall_status,
        human_confirmed=result.human_confirmed,
        confirmed_at=result.confirmed_at,
        summary_counts=result.summary_counts,
        created_at=result.created_at,
        updated_at=result.updated_at,
        items=[PreflightCheckItemRead.model_validate(it) for it in result.items],
    )


@router.get(
    "/{manuscript_id}/preflight",
    response_model=Optional[PreflightResultRead],
    summary="Get latest preflight result",
    description="Retrieves the most recent preflight evaluation result for a manuscript.",
)
async def get_manuscript_preflight(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    manuscript = await get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manuscript not found.",
        )

    result = await preflight_crud.get_latest_preflight_result(session, manuscript_id)
    if not result:
        return None

    template = await get_template(session, result.template_id)

    return PreflightResultRead(
        id=result.id,
        manuscript_id=result.manuscript_id,
        template_id=result.template_id,
        template_name=template.name if template else None,
        template_slug=template.slug if template else None,
        overall_status=result.overall_status,
        human_confirmed=result.human_confirmed,
        confirmed_at=result.confirmed_at,
        summary_counts=result.summary_counts,
        created_at=result.created_at,
        updated_at=result.updated_at,
        items=[PreflightCheckItemRead.model_validate(it) for it in result.items],
    )


@router.post(
    "/{manuscript_id}/preflight/override",
    response_model=PreflightResultRead,
    summary="Override a check item",
    description="Toggles or provides rationale for a human override on a check item.",
)
async def override_preflight_item(
    manuscript_id: UUID,
    override_req: PreflightOverrideRequest,
    session: SessionDep,
    current_user: CurrentUser,
):
    manuscript = await get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manuscript not found.",
        )

    item = await preflight_crud.get_check_item(session, override_req.item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preflight check item not found.",
        )

    result = await preflight_crud.get_preflight_result(session, item.result_id)
    if not result or result.manuscript_id != manuscript_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check item does not belong to this manuscript.",
        )

    await preflight_crud.update_check_item_override(
        session,
        item,
        human_overridden=override_req.human_overridden,
        override_reason=override_req.override_reason,
    )

    # Recalculate result status
    updated_result = await preflight_crud.recalculate_result_status(session, result)
    template = await get_template(session, updated_result.template_id)

    # Refresh full object with items
    full_result = await preflight_crud.get_preflight_result(session, updated_result.id)

    return PreflightResultRead(
        id=full_result.id,
        manuscript_id=full_result.manuscript_id,
        template_id=full_result.template_id,
        template_name=template.name if template else None,
        template_slug=template.slug if template else None,
        overall_status=full_result.overall_status,
        human_confirmed=full_result.human_confirmed,
        confirmed_at=full_result.confirmed_at,
        summary_counts=full_result.summary_counts,
        created_at=full_result.created_at,
        updated_at=full_result.updated_at,
        items=[PreflightCheckItemRead.model_validate(it) for it in full_result.items],
    )


@router.post(
    "/{manuscript_id}/preflight/confirm",
    response_model=PreflightConfirmResponse,
    summary="Confirm preflight checklist",
    description="Validates that all checks pass (or are overridden) and transitions status to CHECKLIST_PASSED.",
)
async def confirm_preflight(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    manuscript = await get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manuscript not found.",
        )

    result = await preflight_crud.get_latest_preflight_result(session, manuscript_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No preflight check evaluation found. Please run preflight checks first.",
        )

    # Server-side hard block: Cannot confirm if failing items remain unresolved
    if result.overall_status == "FAIL":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm submission checklist while mandatory FAIL items remain unresolved.",
        )

    now = datetime.utcnow()
    result.human_confirmed = True
    result.confirmed_at = now
    session.add(result)

    # Transition manuscript status
    manuscript.status = "CHECKLIST_PASSED"
    manuscript.updated_at = now
    session.add(manuscript)

    await session.commit()
    await session.refresh(manuscript)

    return PreflightConfirmResponse(
        status="confirmed",
        message="Preflight submission checklist successfully confirmed. Manuscript is ready for document generation.",
        manuscript_status=manuscript.status,
        confirmed_at=now,
    )
