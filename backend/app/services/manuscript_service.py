from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.manuscript import Manuscript
from app.services.storage.factory import get_storage_service
from uuid import UUID

async def upload_manuscript(session: AsyncSession, project_id: UUID, user_id: UUID, file: UploadFile) -> Manuscript:
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")
        
    storage = get_storage_service()
    
    # Create the manuscript record in DRAFT status
    manuscript = Manuscript(
        project_id=project_id,
        original_filename=file.filename,
        storage_key="", # Will update this shortly
        status="DRAFT"
    )
    session.add(manuscript)
    await session.commit()
    await session.refresh(manuscript)
    
    # Upload to storage
    storage_key = f"manuscripts/{user_id}/{project_id}/{manuscript.id}/{file.filename}"
    await storage.upload(storage_key, file.file, content_type=file.content_type)
    
    manuscript.storage_key = storage_key
    session.add(manuscript)
    await session.commit()
    await session.refresh(manuscript)
    
    return manuscript
