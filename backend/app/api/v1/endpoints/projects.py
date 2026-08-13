from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from uuid import UUID
from app.core.deps import SessionDep, CurrentUser
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.manuscript import ManuscriptRead
from app.crud import project as project_crud
from app.crud import manuscript as manuscript_crud
from app.services import manuscript_service

router = APIRouter()

@router.post("", response_model=ProjectRead)
async def create_project(
    session: SessionDep,
    current_user: CurrentUser,
    project_in: ProjectCreate
):
    return await project_crud.create_project(session, project_in, current_user.id)

@router.get("", response_model=List[ProjectRead])
async def list_projects(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
):
    return await project_crud.get_user_projects(session, current_user.id, skip=skip, limit=limit)

@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: UUID,
    session: SessionDep,
    current_user: CurrentUser
):
    project = await project_crud.get_project(session, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: UUID,
    project_in: ProjectUpdate,
    session: SessionDep,
    current_user: CurrentUser
):
    project = await project_crud.get_project(session, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await project_crud.update_project(session, project, project_in)

@router.post("/{project_id}/manuscripts", response_model=ManuscriptRead)
async def upload_manuscript(
    project_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...)
):
    project = await project_crud.get_project(session, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await manuscript_service.upload_manuscript(session, project_id, current_user.id, file)

@router.get("/{project_id}/manuscripts", response_model=List[ManuscriptRead])
async def list_manuscripts(
    project_id: UUID,
    session: SessionDep,
    current_user: CurrentUser
):
    project = await project_crud.get_project(session, project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await manuscript_crud.get_project_manuscripts(session, project_id)
