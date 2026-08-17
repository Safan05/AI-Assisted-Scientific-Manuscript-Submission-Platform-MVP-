# backend/app/crud/extracted_metadata.py
"""CRUD for ExtractedMetadata records."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.manuscript import ExtractedMetadata
from app.schemas.manuscript_ir import (
    ManuscriptIR,
    Author,
    Affiliation,
    CorrespondingAuthor,
    SectionNode,
    Reference,
    FundingSource,
)


def metadata_to_ir(meta: Optional[ExtractedMetadata], word_count: int = 0) -> ManuscriptIR:
    """Converts an ExtractedMetadata ORM row to a typed ManuscriptIR model."""
    if not meta:
        return ManuscriptIR(
            title="Untitled Manuscript",
            abstract="",
            word_count=word_count,
        )

    def _load(cls, items: list) -> list:
        return [cls(**item) for item in (items or [])]

    return ManuscriptIR(
        title=meta.title or "Untitled Manuscript",
        authors=_load(Author, meta.authors),
        affiliations=_load(Affiliation, meta.affiliations),
        corresponding_author=(
            CorrespondingAuthor(**meta.corresponding_author)
            if meta.corresponding_author
            else None
        ),
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
        word_count=word_count,
    )


async def get_extracted_metadata(
    session: AsyncSession, manuscript_id: UUID
) -> Optional[ExtractedMetadata]:
    """Fetch the ExtractedMetadata row for a manuscript."""
    stmt = select(ExtractedMetadata).where(ExtractedMetadata.manuscript_id == manuscript_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def upsert_extracted_metadata(
    session: AsyncSession,
    manuscript_id: UUID,
    ir: ManuscriptIR,
) -> ExtractedMetadata:
    """
    Create or update the ExtractedMetadata row from a ManuscriptIR object.
    Uses manuscript_id uniqueness constraint: if a row exists it is updated
    in-place; otherwise a new row is inserted.
    """
    existing = await get_extracted_metadata(session, manuscript_id)

    def _serialise_list(items: list) -> list[dict]:
        return [item.model_dump() for item in items]

    now = datetime.utcnow()

    if existing:
        # Update in-place
        existing.title = ir.title
        existing.authors = _serialise_list(ir.authors)
        existing.affiliations = _serialise_list(ir.affiliations)
        existing.corresponding_author = (
            ir.corresponding_author.model_dump() if ir.corresponding_author else None
        )
        existing.abstract = ir.abstract
        existing.keywords = ir.keywords
        existing.sections = _serialise_list(ir.sections)
        existing.references = _serialise_list(ir.references)
        existing.funding = _serialise_list(ir.funding)
        existing.conflict_of_interest = ir.conflict_of_interest
        existing.ethics_statement = ir.ethics_statement
        existing.data_availability = ir.data_availability
        existing.author_contributions = ir.author_contributions
        existing.acknowledgements = ir.acknowledgements
        existing.updated_at = now
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return existing

    # Create new row
    metadata = ExtractedMetadata(
        manuscript_id=manuscript_id,
        title=ir.title,
        authors=_serialise_list(ir.authors),
        affiliations=_serialise_list(ir.affiliations),
        corresponding_author=(
            ir.corresponding_author.model_dump() if ir.corresponding_author else None
        ),
        abstract=ir.abstract,
        keywords=ir.keywords,
        sections=_serialise_list(ir.sections),
        references=_serialise_list(ir.references),
        funding=_serialise_list(ir.funding),
        conflict_of_interest=ir.conflict_of_interest,
        ethics_statement=ir.ethics_statement,
        data_availability=ir.data_availability,
        author_contributions=ir.author_contributions,
        acknowledgements=ir.acknowledgements,
        is_human_verified=False,
        created_at=now,
        updated_at=now,
    )
    session.add(metadata)
    await session.commit()
    await session.refresh(metadata)
    return metadata
