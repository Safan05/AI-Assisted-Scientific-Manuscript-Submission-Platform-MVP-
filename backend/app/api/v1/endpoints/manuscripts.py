from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID
from app.core.deps import SessionDep, CurrentUser
from app.schemas.manuscript import ManuscriptRead, ManuscriptUpdate
from app.crud import manuscript as manuscript_crud

router = APIRouter()

@router.get("/{manuscript_id}", response_model=ManuscriptRead)
async def get_manuscript(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser
):
    manuscript = await manuscript_crud.get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    
    # In a real app we'd also check if the manuscript's project belongs to current_user
    return manuscript

@router.patch("/{manuscript_id}", response_model=ManuscriptRead)
async def update_manuscript(
    manuscript_id: UUID,
    manuscript_in: ManuscriptUpdate,
    session: SessionDep,
    current_user: CurrentUser
):
    manuscript = await manuscript_crud.get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")
    return await manuscript_crud.update_manuscript(session, manuscript, manuscript_in)
