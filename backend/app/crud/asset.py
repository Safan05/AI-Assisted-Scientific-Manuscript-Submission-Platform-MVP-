# backend/app/crud/asset.py
"""CRUD operations for ManuscriptAsset records."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.asset import ManuscriptAsset


async def get_manuscript_assets(
    session: AsyncSession, manuscript_id: UUID
) -> List[ManuscriptAsset]:
    """Return all assets belonging to a manuscript, ordered by order_index."""
    statement = (
        select(ManuscriptAsset)
        .where(ManuscriptAsset.manuscript_id == manuscript_id)
        .order_by(ManuscriptAsset.order_index)
    )
    result = await session.execute(statement)
    return list(result.scalars().all())


async def get_asset(
    session: AsyncSession, asset_id: UUID
) -> Optional[ManuscriptAsset]:
    """Return a single asset by ID."""
    statement = select(ManuscriptAsset).where(ManuscriptAsset.id == asset_id)
    result = await session.execute(statement)
    return result.scalar_one_or_none()


async def create_asset(
    session: AsyncSession, asset: ManuscriptAsset
) -> ManuscriptAsset:
    """Persist a new ManuscriptAsset record."""
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return asset


async def delete_manuscript_assets(
    session: AsyncSession, manuscript_id: UUID
) -> int:
    """Delete all assets for a manuscript (used when re-parsing). Returns count deleted."""
    assets = await get_manuscript_assets(session, manuscript_id)
    for asset in assets:
        await session.delete(asset)
    await session.commit()
    return len(assets)
