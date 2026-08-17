# backend/app/services/manuscript_service.py
"""
Manuscript service — upload and parsing orchestration.

Parsing Pipeline (Module 4):
  StorageService.download() → DoclingParser.parse()
  → ImageExtractor.extract() → MetadataExtractor.extract()
  → build ManuscriptIR → upsert ExtractedMetadata → save raw JSON
  → transition status DRAFT → PARSED
"""

from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import extracted_metadata as meta_crud
from app.models.manuscript import Manuscript
from app.schemas.manuscript_ir import ManuscriptIR
from app.services.parsing.docling_parser import DoclingParser
from app.services.parsing.image_extractor import ImageExtractor
from app.services.parsing.metadata_extractor import MetadataExtractor
from app.services.storage.factory import get_storage_service

logger = logging.getLogger(__name__)


# ─── Upload ───────────────────────────────────────────────────────────────────

async def upload_manuscript(
    session: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    file: UploadFile,
) -> Manuscript:
    """Validate, store, and register a new .docx manuscript in DRAFT status."""
    if not file.filename or not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    storage = get_storage_service()

    # Create the manuscript record in DRAFT status so we have an ID for storage key
    manuscript = Manuscript(
        project_id=project_id,
        original_filename=file.filename,
        storage_key="",  # Filled in below
        status="DRAFT",
    )
    session.add(manuscript)
    await session.commit()
    await session.refresh(manuscript)

    # Upload to storage backend
    storage_key = f"manuscripts/{user_id}/{project_id}/{manuscript.id}/{file.filename}"
    await storage.upload(storage_key, file.file, content_type=file.content_type or "application/octet-stream")

    manuscript.storage_key = storage_key
    session.add(manuscript)
    await session.commit()
    await session.refresh(manuscript)

    return manuscript


# ─── Parse ────────────────────────────────────────────────────────────────────

async def parse_manuscript(
    session: AsyncSession,
    manuscript: Manuscript,
) -> ManuscriptIR:
    """
    Full parsing pipeline for a manuscript that is in DRAFT status.

    Steps:
      1. Download raw .docx bytes from storage.
      2. Parse with DoclingParser → structured section tree + pictures.
      3. Upload extracted figures via ImageExtractor → ManuscriptAsset records.
      4. Extract metadata (heuristic + optional LLM) → ManuscriptIR.
      5. Persist ExtractedMetadata row + raw_parsed_json on Manuscript.
      6. Transition manuscript status to PARSED.

    Args:
        session: Async DB session.
        manuscript: The Manuscript ORM record to parse.

    Returns:
        The populated ManuscriptIR.

    Raises:
        HTTPException 400 if the manuscript is not in DRAFT status.
        HTTPException 500 on unrecoverable parsing failure.
    """
    if manuscript.status not in ("DRAFT", "PARSED"):
        raise HTTPException(
            status_code=400,
            detail=f"Manuscript status '{manuscript.status}' cannot be re-parsed. "
                   "Only DRAFT or PARSED manuscripts may be re-submitted for parsing.",
        )

    storage = get_storage_service()

    # ── 1. Download ───────────────────────────────────────────────────────────
    logger.info("Parsing manuscript %s — downloading from storage...", manuscript.id)
    try:
        file_bytes = await storage.download(manuscript.storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Stored manuscript file not found: {manuscript.storage_key}",
        ) from exc

    # ── 2. Parse via Docling ──────────────────────────────────────────────────
    logger.info("Parsing manuscript %s with DoclingParser...", manuscript.id)
    try:
        parser = DoclingParser()
        parse_result = parser.parse(file_bytes, filename=manuscript.original_filename)
    except Exception as exc:
        logger.exception("DoclingParser failed for manuscript %s", manuscript.id)
        raise HTTPException(
            status_code=500,
            detail=f"Document parsing failed: {exc}",
        ) from exc

    # ── 3. Extract & upload figures ───────────────────────────────────────────
    logger.info(
        "Uploading %d extracted figures for manuscript %s...",
        len(parse_result.pictures),
        manuscript.id,
    )
    image_extractor = ImageExtractor(storage=storage, session=session)
    await image_extractor.extract(
        pictures=parse_result.pictures,
        manuscript_id=manuscript.id,
    )

    # ── 4. Metadata extraction ────────────────────────────────────────────────
    logger.info("Extracting metadata for manuscript %s...", manuscript.id)
    try:
        # Attempt to wire up LLM service; fall back to heuristic-only if not configured.
        llm = None
        try:
            from app.services.llm.factory import get_llm_service
            llm = get_llm_service()
        except Exception:
            logger.info(
                "LLM service not available — running heuristic-only metadata extraction."
            )

        extractor = MetadataExtractor(llm=llm)
        ir = await extractor.extract(
            sections=parse_result.sections,
            full_markdown=parse_result.full_markdown,
        )
    except Exception as exc:
        logger.exception("MetadataExtractor failed for manuscript %s", manuscript.id)
        raise HTTPException(
            status_code=500,
            detail=f"Metadata extraction failed: {exc}",
        ) from exc

    # ── 5. Persist extracted metadata ─────────────────────────────────────────
    logger.info("Persisting extracted metadata for manuscript %s...", manuscript.id)
    await meta_crud.upsert_extracted_metadata(session, manuscript.id, ir)

    # Store full Docling raw JSON dict on manuscript for downstream use
    manuscript.raw_parsed_json = parse_result.raw_dict or {}
    manuscript.word_count = ir.word_count
    manuscript.status = "PARSED"
    manuscript.updated_at = datetime.utcnow()
    session.add(manuscript)
    await session.commit()
    await session.refresh(manuscript)

    logger.info(
        "Manuscript %s parsed successfully — %d sections, %d refs, %d figures, %d words.",
        manuscript.id,
        len(ir.sections),
        len(ir.references),
        len(parse_result.pictures),
        ir.word_count,
    )
    return ir
