# backend/app/api/v1/endpoints/journals.py
"""
Journal Templates and Rules API Endpoints.

Provides full CRUD for journal templates and rules, template lookup by ID/slug,
and automated seeding of authoritative journal standards.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import SessionDep, CurrentUser
from app.crud import journal_template as journal_crud
from app.schemas.journal_template import (
    JournalTemplateCreate,
    JournalTemplateUpdate,
    JournalTemplateRead,
    JournalTemplateDetailRead,
    TemplateRuleCreate,
    TemplateRuleUpdate,
    TemplateRuleRead,
)
from app.services.template_seeder import seed_journal_templates

router = APIRouter()


# ─── JOURNAL TEMPLATES ────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=List[JournalTemplateRead],
    summary="List journal templates",
    description="Retrieve all active journal templates configured in the system.",
)
async def list_journal_templates(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    active_only: bool = True,
):
    return await journal_crud.get_templates(
        session, skip=skip, limit=limit, active_only=active_only
    )


@router.post(
    "/seed",
    response_model=List[JournalTemplateRead],
    summary="Seed baseline journal templates",
    description="Idempotently creates or updates authoritative templates for Nature and PLOS ONE.",
)
async def seed_templates(
    session: SessionDep,
    current_user: CurrentUser,
):
    return await seed_journal_templates(session)


@router.get(
    "/{identifier}",
    response_model=JournalTemplateDetailRead,
    summary="Get journal template details",
    description="Retrieve a journal template and all its validation rules by UUID or slug.",
)
async def get_journal_template(
    identifier: str,
    session: SessionDep,
    current_user: CurrentUser,
):
    template = None
    try:
        uuid_val = UUID(identifier)
        template = await journal_crud.get_template(session, uuid_val)
    except ValueError:
        template = await journal_crud.get_template_by_slug(session, identifier)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Journal template '{identifier}' not found.",
        )

    rules = await journal_crud.get_template_rules(session, template.id)
    return JournalTemplateDetailRead(
        id=template.id,
        name=template.name,
        slug=template.slug,
        description=template.description,
        heading_structure=template.heading_structure,
        reference_format=template.reference_format,
        formatting_rules=template.formatting_rules,
        title_page_layout=template.title_page_layout,
        required_statements=template.required_statements,
        max_abstract_words=template.max_abstract_words,
        max_total_words=template.max_total_words,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at,
        rules=[TemplateRuleRead.model_validate(r) for r in rules],
    )


@router.post(
    "",
    response_model=JournalTemplateRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create journal template",
    description="Create a new journal template configuration.",
)
async def create_journal_template(
    template_in: JournalTemplateCreate,
    session: SessionDep,
    current_user: CurrentUser,
):
    existing = await journal_crud.get_template_by_slug(session, template_in.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A journal template with slug '{template_in.slug}' already exists.",
        )
    return await journal_crud.create_template(session, template_in)


@router.patch(
    "/{template_id}",
    response_model=JournalTemplateRead,
    summary="Update journal template",
    description="Modify parameters or constraints of an existing journal template.",
)
async def update_journal_template(
    template_id: UUID,
    template_in: JournalTemplateUpdate,
    session: SessionDep,
    current_user: CurrentUser,
):
    template = await journal_crud.get_template(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal template not found.",
        )
    return await journal_crud.update_template(session, template, template_in)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete journal template",
    description="Remove a journal template and all its associated rules.",
)
async def delete_journal_template(
    template_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    template = await journal_crud.get_template(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal template not found.",
        )
    await journal_crud.delete_template(session, template)
    return None


# ─── TEMPLATE RULES ──────────────────────────────────────────────────────────

@router.get(
    "/{template_id}/rules",
    response_model=List[TemplateRuleRead],
    summary="List rules for journal template",
    description="Fetch all evaluation rules attached to a given template.",
)
async def list_template_rules(
    template_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    template = await journal_crud.get_template(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal template not found.",
        )
    return await journal_crud.get_template_rules(session, template_id)


@router.post(
    "/{template_id}/rules",
    response_model=TemplateRuleRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add rule to journal template",
    description="Create a validation rule scoped to a target journal template.",
)
async def create_template_rule(
    template_id: UUID,
    rule_in: TemplateRuleCreate,
    session: SessionDep,
    current_user: CurrentUser,
):
    template = await journal_crud.get_template(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal template not found.",
        )
    return await journal_crud.create_template_rule(session, template_id, rule_in)


@router.patch(
    "/{template_id}/rules/{rule_id}",
    response_model=TemplateRuleRead,
    summary="Update template rule",
    description="Modify configuration, threshold, severity, or message of a template rule.",
)
async def update_template_rule(
    template_id: UUID,
    rule_id: UUID,
    rule_in: TemplateRuleUpdate,
    session: SessionDep,
    current_user: CurrentUser,
):
    rule = await journal_crud.get_rule(session, rule_id)
    if not rule or rule.template_id != template_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template rule not found for this journal.",
        )
    return await journal_crud.update_template_rule(session, rule, rule_in)


@router.delete(
    "/{template_id}/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete template rule",
    description="Remove a validation rule from a template.",
)
async def delete_template_rule(
    template_id: UUID,
    rule_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    rule = await journal_crud.get_rule(session, rule_id)
    if not rule or rule.template_id != template_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template rule not found for this journal.",
        )
    await journal_crud.delete_template_rule(session, rule)
    return None
