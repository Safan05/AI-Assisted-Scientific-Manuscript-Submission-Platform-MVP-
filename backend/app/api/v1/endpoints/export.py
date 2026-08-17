"""
app/api/v1/endpoints/export.py

Module 8 — Export API Endpoints.

Endpoints:
  POST   /manuscripts/{id}/export          → Trigger docx generation
  GET    /manuscripts/{id}/export/status   → Check export status
  GET    /manuscripts/{id}/export/download → Get presigned download URL

Guard: All export triggers reject manuscripts not in CHECKLIST_PASSED status
with HTTP 422 and a descriptive error message.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import CurrentUser, SessionDep
from app.crud.project import get_project
from app.models.manuscript import Manuscript
from app.services.docgen.generator import DocumentGenerationError, DocumentGenerator
from app.services.storage.factory import get_storage_service

router = APIRouter()


# ── Response Schemas ──────────────────────────────────────────────────────────

class ExportTriggerResponse(BaseModel):
    manuscript_id: UUID
    status: str
    exported_storage_key: str
    message: str


class ExportStatusResponse(BaseModel):
    manuscript_id: UUID
    status: str
    exported_storage_key: str | None
    is_exported: bool


class ExportDownloadResponse(BaseModel):
    manuscript_id: UUID
    download_url: str
    expires_in_seconds: int


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_owned_manuscript(
    session: SessionDep,
    manuscript_id: UUID,
    user_id: UUID,
) -> Manuscript:
    """Load a manuscript and verify the calling user owns its parent project."""
    stmt = select(Manuscript).where(Manuscript.id == manuscript_id)
    result = await session.execute(stmt)
    manuscript = result.scalar_one_or_none()
    if not manuscript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manuscript not found.")

    # Ownership check via project
    project = await get_project(session, manuscript.project_id, user_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this manuscript.",
        )
    return manuscript


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/{manuscript_id}/export",
    response_model=ExportTriggerResponse,
    summary="Trigger journal-formatted .docx export",
)
async def trigger_export(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> ExportTriggerResponse:
    """
    Generate a journal-compliant .docx from a CHECKLIST_PASSED manuscript.

    - Rejects manuscripts not in CHECKLIST_PASSED with HTTP 422.
    - Reads the assigned JournalTemplate, resolves the matching formatter,
      builds the document, uploads to storage, and persists exported_storage_key.
    - On success: manuscript.status transitions to EXPORTED.
    """
    manuscript = await _get_owned_manuscript(session, manuscript_id, current_user.id)

    storage = get_storage_service()
    generator = DocumentGenerator(storage=storage)

    try:
        exported_key = await generator.generate(
            manuscript_id=manuscript_id,
            session=session,
        )
    except DocumentGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document generation failed: {exc}",
        ) from exc

    # Reload to get updated status
    await session.refresh(manuscript)

    return ExportTriggerResponse(
        manuscript_id=manuscript_id,
        status=manuscript.status,
        exported_storage_key=exported_key,
        message="Document generated and uploaded successfully.",
    )


@router.get(
    "/{manuscript_id}/export/status",
    response_model=ExportStatusResponse,
    summary="Check export generation status",
)
async def get_export_status(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> ExportStatusResponse:
    """Return the current export status and storage key (if exported)."""
    manuscript = await _get_owned_manuscript(session, manuscript_id, current_user.id)

    return ExportStatusResponse(
        manuscript_id=manuscript_id,
        status=manuscript.status,
        exported_storage_key=manuscript.exported_storage_key,
        is_exported=manuscript.status == "EXPORTED",
    )


@router.get(
    "/{manuscript_id}/export/download",
    response_model=ExportDownloadResponse,
    summary="Get presigned download URL for the exported .docx",
)
async def get_export_download_url(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
    expires_in: int = 3600,
) -> ExportDownloadResponse:
    """
    Return a presigned URL (or direct serve URL in local storage mode)
    for downloading the exported .docx file.

    Requires the manuscript to have status EXPORTED.
    """
    manuscript = await _get_owned_manuscript(session, manuscript_id, current_user.id)

    if manuscript.status != "EXPORTED" or not manuscript.exported_storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No exported document found for manuscript {manuscript_id}. "
                "Trigger export first via POST /manuscripts/{id}/export."
            ),
        )

    storage = get_storage_service()
    download_url = await storage.generate_presigned_url(
        manuscript.exported_storage_key,
        expires_in=expires_in,
    )

    return ExportDownloadResponse(
        manuscript_id=manuscript_id,
        download_url=download_url,
        expires_in_seconds=expires_in,
    )
