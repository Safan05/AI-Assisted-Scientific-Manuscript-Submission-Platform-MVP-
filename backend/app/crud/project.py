from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate

async def get_project(session: AsyncSession, project_id: UUID, user_id: UUID) -> Optional[Project]:
    statement = select(Project).where(Project.id == project_id, Project.user_id == user_id)
    result = await session.execute(statement)
    return result.scalar_one_or_none()

async def get_user_projects(session: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Project]:
    statement = select(Project).where(Project.user_id == user_id).where(Project.status != "archived").offset(skip).limit(limit)
    result = await session.execute(statement)
    return list(result.scalars().all())

async def create_project(session: AsyncSession, project_in: ProjectCreate, user_id: UUID) -> Project:
    project = Project(
        **project_in.model_dump(),
        user_id=user_id
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

async def update_project(session: AsyncSession, db_project: Project, project_in: ProjectUpdate) -> Project:
    project_data = project_in.model_dump(exclude_unset=True)
    for field, value in project_data.items():
        setattr(db_project, field, value)
    
    session.add(db_project)
    await session.commit()
    await session.refresh(db_project)
    return db_project
