# backend/app/crud/preflight.py
"""CRUD operations for Preflight results and check items."""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.models.preflight import PreflightResult, PreflightCheckItem


async def get_latest_preflight_result(
    session: AsyncSession, manuscript_id: UUID
) -> Optional[PreflightResult]:
    """Retrieve the most recent preflight evaluation result for a manuscript."""
    stmt = (
        select(PreflightResult)
        .where(PreflightResult.manuscript_id == manuscript_id)
        .order_by(PreflightResult.created_at.desc())
        .options(selectinload(PreflightResult.items))
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def get_preflight_result(
    session: AsyncSession, result_id: UUID
) -> Optional[PreflightResult]:
    """Retrieve a preflight result by its primary key ID."""
    stmt = (
        select(PreflightResult)
        .where(PreflightResult.id == result_id)
        .options(selectinload(PreflightResult.items))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_check_item(
    session: AsyncSession, item_id: UUID
) -> Optional[PreflightCheckItem]:
    """Retrieve an individual check item."""
    stmt = select(PreflightCheckItem).where(PreflightCheckItem.id == item_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def update_check_item_override(
    session: AsyncSession,
    item: PreflightCheckItem,
    human_overridden: bool,
    override_reason: Optional[str] = None,
) -> PreflightCheckItem:
    """Set or toggle human override on a check item and recalculate overall result status."""
    item.human_overridden = human_overridden
    item.override_reason = override_reason
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


async def recalculate_result_status(
    session: AsyncSession, result: PreflightResult
) -> PreflightResult:
    """Recalculates summary counts and overall status considering active human overrides."""
    stmt = select(PreflightCheckItem).where(PreflightCheckItem.result_id == result.id)
    res = await session.execute(stmt)
    items = list(res.scalars().all())

    counts = {"PASS": 0, "WARN": 0, "FAIL": 0}
    has_unresolved_fail = False
    has_unresolved_warn = False

    for it in items:
        counts[it.status] = counts.get(it.status, 0) + 1
        if not it.human_overridden:
            if it.status == "FAIL":
                has_unresolved_fail = True
            elif it.status == "WARN":
                has_unresolved_warn = True

    if has_unresolved_fail:
        overall = "FAIL"
    elif has_unresolved_warn:
        overall = "WARN"
    else:
        overall = "PASS"

    result.overall_status = overall
    result.summary_counts = counts
    result.updated_at = datetime.utcnow()
    session.add(result)
    await session.commit()
    await session.refresh(result)
    return result
