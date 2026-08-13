from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.manuscript import Manuscript
from app.schemas.manuscript import ManuscriptUpdate

async def get_manuscript(session: AsyncSession, manuscript_id: UUID) -> Optional[Manuscript]:
    statement = select(Manuscript).where(Manuscript.id == manuscript_id)
    result = await session.execute(statement)
    return result.scalar_one_or_none()

async def get_project_manuscripts(session: AsyncSession, project_id: UUID) -> List[Manuscript]:
    statement = select(Manuscript).where(Manuscript.project_id == project_id)
    result = await session.execute(statement)
    return list(result.scalars().all())

async def update_manuscript(session: AsyncSession, db_manuscript: Manuscript, manuscript_in: ManuscriptUpdate) -> Manuscript:
    manuscript_data = manuscript_in.model_dump(exclude_unset=True)
    for field, value in manuscript_data.items():
        setattr(db_manuscript, field, value)
    
    session.add(db_manuscript)
    await session.commit()
    await session.refresh(db_manuscript)
    return db_manuscript
