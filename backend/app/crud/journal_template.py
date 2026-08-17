# backend/app/crud/journal_template.py
"""CRUD operations for Journal Templates and Template Rules."""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.journal_template import JournalTemplate, TemplateRule
from app.schemas.journal_template import (
    JournalTemplateCreate,
    JournalTemplateUpdate,
    TemplateRuleCreate,
    TemplateRuleUpdate,
)


# ── Journal Templates CRUD ───────────────────────────────────────────

async def get_templates(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
) -> List[JournalTemplate]:
    """List all journal templates."""
    stmt = select(JournalTemplate)
    if active_only:
        stmt = stmt.where(JournalTemplate.is_active == True)
    stmt = stmt.offset(skip).limit(limit).order_by(JournalTemplate.name)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_template(
    session: AsyncSession, template_id: UUID
) -> Optional[JournalTemplate]:
    """Retrieve a single journal template by ID."""
    stmt = select(JournalTemplate).where(JournalTemplate.id == template_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_template_by_slug(
    session: AsyncSession, slug: str
) -> Optional[JournalTemplate]:
    """Retrieve a single journal template by its unique slug."""
    stmt = select(JournalTemplate).where(JournalTemplate.slug == slug)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_template(
    session: AsyncSession, template_in: JournalTemplateCreate
) -> JournalTemplate:
    """Create a new journal template and optional initial rules."""
    template_data = template_in.model_dump(exclude={"rules"})
    db_template = JournalTemplate(**template_data)
    session.add(db_template)
    await session.commit()
    await session.refresh(db_template)

    if template_in.rules:
        for rule_in in template_in.rules:
            rule_data = rule_in.model_dump()
            db_rule = TemplateRule(template_id=db_template.id, **rule_data)
            session.add(db_rule)
        await session.commit()

    return db_template


async def update_template(
    session: AsyncSession,
    db_template: JournalTemplate,
    template_in: JournalTemplateUpdate,
) -> JournalTemplate:
    """Update an existing journal template."""
    update_data = template_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_template, field, value)
    db_template.updated_at = datetime.utcnow()
    session.add(db_template)
    await session.commit()
    await session.refresh(db_template)
    return db_template


async def delete_template(
    session: AsyncSession, db_template: JournalTemplate
) -> None:
    """Delete a journal template and all associated rules."""
    rules = await get_template_rules(session, db_template.id)
    for rule in rules:
        await session.delete(rule)
    await session.delete(db_template)
    await session.commit()


# ── Template Rules CRUD ──────────────────────────────────────────────

async def get_template_rules(
    session: AsyncSession, template_id: UUID
) -> List[TemplateRule]:
    """Retrieve all evaluation rules for a given template, ordered by sort_order."""
    stmt = (
        select(TemplateRule)
        .where(TemplateRule.template_id == template_id)
        .order_by(TemplateRule.sort_order, TemplateRule.rule_key)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_rule(
    session: AsyncSession, rule_id: UUID
) -> Optional[TemplateRule]:
    """Retrieve a single rule by ID."""
    stmt = select(TemplateRule).where(TemplateRule.id == rule_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_template_rule(
    session: AsyncSession,
    template_id: UUID,
    rule_in: TemplateRuleCreate,
) -> TemplateRule:
    """Add a new rule to a journal template."""
    db_rule = TemplateRule(template_id=template_id, **rule_in.model_dump())
    session.add(db_rule)
    await session.commit()
    await session.refresh(db_rule)
    return db_rule


async def update_template_rule(
    session: AsyncSession,
    db_rule: TemplateRule,
    rule_in: TemplateRuleUpdate,
) -> TemplateRule:
    """Update an existing template rule."""
    update_data = rule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_rule, field, value)
    session.add(db_rule)
    await session.commit()
    await session.refresh(db_rule)
    return db_rule


async def delete_template_rule(
    session: AsyncSession, db_rule: TemplateRule
) -> None:
    """Delete a template rule."""
    await session.delete(db_rule)
    await session.commit()
