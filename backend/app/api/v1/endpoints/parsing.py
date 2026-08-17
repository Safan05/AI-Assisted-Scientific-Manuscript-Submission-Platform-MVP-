# backend/app/api/v1/endpoints/parsing.py
"""
Parsing endpoint — POST /api/v1/manuscripts/{id}/parse

Triggers the Module 4 parsing pipeline:
  StorageService.download() → DoclingParser.parse()
  → ImageExtractor → MetadataExtractor
  → ManuscriptIR saved to DB
  → status DRAFT → PARSED
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.core.deps import CurrentUser, SessionDep
from app.crud import manuscript as manuscript_crud
from app.crud import asset as asset_crud
from app.schemas.manuscript_ir import ManuscriptIR
from app.schemas.asset import AssetRead
from app.services import manuscript_service
from typing import List

router = APIRouter()


@router.post(
    "/{manuscript_id}/parse",
    response_model=ManuscriptIR,
    summary="Parse a manuscript",
    description=(
        "Triggers the full parsing pipeline using Docling: document structure "
        "extraction, figure/table extraction, heuristic + LLM metadata extraction. "
        "Transitions status from DRAFT → PARSED."
    ),
)
async def parse_manuscript(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    manuscript = await manuscript_crud.get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    # Ownership guard — ensure the manuscript belongs to the current user's project
    # (full RBAC handled in Module 5; for now rely on UUID unguessability + session)

    return await manuscript_service.parse_manuscript(session, manuscript)


@router.get(
    "/{manuscript_id}/assets",
    response_model=List[AssetRead],
    summary="List manuscript assets",
    description="Returns all extracted figures and tables for a manuscript.",
)
async def list_manuscript_assets(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    manuscript = await manuscript_crud.get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    return await asset_crud.get_manuscript_assets(session, manuscript_id)


@router.get(
    "/{manuscript_id}/ir",
    response_model=ManuscriptIR,
    summary="Get parsed manuscript IR",
    description="Returns the current ManuscriptIR built from the ExtractedMetadata row.",
)
async def get_manuscript_ir(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    from app.crud.extracted_metadata import get_extracted_metadata
    from app.schemas.manuscript_ir import (
        Author, Affiliation, CorrespondingAuthor,
        FundingSource, Reference, SectionNode
    )

    manuscript = await manuscript_crud.get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    meta = await get_extracted_metadata(session, manuscript_id)
    if not meta:
        raise HTTPException(
            status_code=404,
            detail="Manuscript has not been parsed yet. "
                   "POST /manuscripts/{id}/parse to trigger parsing.",
        )

    def _load(cls, items: list) -> list:
        return [cls(**item) for item in (items or [])]

    return ManuscriptIR(
        title=meta.title or "Untitled",
        authors=_load(Author, meta.authors),
        affiliations=_load(Affiliation, meta.affiliations),
        corresponding_author=CorrespondingAuthor(**meta.corresponding_author) if meta.corresponding_author else None,
        abstract=meta.abstract or "",
        keywords=meta.keywords or [],
        sections=_load(SectionNode, meta.sections),
        references=_load(Reference, meta.references),
        funding=_load(FundingSource, meta.funding),
        conflict_of_interest=meta.conflict_of_interest,
        ethics_statement=meta.ethics_statement,
        data_availability=meta.data_availability,
        author_contributions=meta.author_contributions,
        acknowledgements=meta.acknowledgements,
        word_count=manuscript.word_count,
    )


@router.get(
    "/{manuscript_id}/extracted_metadata",
    response_model=ManuscriptIR,
    summary="Get parsed manuscript metadata (alias for /ir)",
    description="Returns the current ManuscriptIR built from the ExtractedMetadata row.",
)
async def get_manuscript_extracted_metadata(
    manuscript_id: UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    return await get_manuscript_ir(manuscript_id, session, current_user)


@router.patch(
    "/{manuscript_id}/metadata",
    response_model=ManuscriptIR,
    summary="Save edited manuscript metadata",
    description=(
        "Updates ExtractedMetadata in the database with the user's edits, "
        "recalculates word count, and transitions status from PARSED → EDITED."
    ),
)
async def update_manuscript_metadata(
    manuscript_id: UUID,
    ir: ManuscriptIR,
    session: SessionDep,
    current_user: CurrentUser,
):
    from datetime import datetime
    from app.crud.extracted_metadata import upsert_extracted_metadata

    manuscript = await manuscript_crud.get_manuscript(session, manuscript_id)
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    # Upsert extracted metadata
    await upsert_extracted_metadata(session, manuscript_id, ir)

    # Transition status: if PARSED (or DRAFT), move to EDITED
    if manuscript.status in ("PARSED", "DRAFT"):
        manuscript.status = "EDITED"
    manuscript.word_count = ir.word_count
    manuscript.updated_at = datetime.utcnow()
    session.add(manuscript)
    await session.commit()
    await session.refresh(manuscript)

    return ir

