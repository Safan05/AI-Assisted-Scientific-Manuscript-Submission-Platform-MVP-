"""
app/services/docgen/generator.py

Document Generation Orchestrator.

Workflow per the Module 8 spec:
  1. Guard: reject if manuscript.status != CHECKLIST_PASSED
  2. Deserialize ManuscriptIR from extracted_metadata.sections + fields
  3. Resolve formatter by template.slug
  4. Apply document style (margins, font, spacing)
  5. Build title page
  6. Build abstract
  7. Build body sections (recursive)
  8. Build references
  9. Build required statements
  10. Save to BytesIO → upload via StorageService
  11. Persist exported_storage_key on Manuscript row
  12. Update manuscript.status → EXPORTED
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from io import BytesIO
from uuid import UUID

from docx import Document
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.manuscript import ExtractedMetadata, Manuscript
from app.models.journal_template import JournalTemplate
from app.schemas.manuscript_ir import (
    Affiliation,
    Author,
    CorrespondingAuthor,
    FundingSource,
    ManuscriptIR,
    Reference,
    SectionNode,
)
from app.services.docgen.formatters.base_formatter import BaseFormatter
from app.services.docgen.formatters.nature_formatter import NatureFormatter
from app.services.docgen.formatters.plos_one_formatter import PlosOneFormatter
from app.services.docgen.formatters.ieee_formatter import IEEEFormatter
from app.services.docgen.formatters.mia_formatter import MIAFormatter
from app.services.docgen.formatters.radiology_formatter import RadiologyFormatter
from app.services.docgen.formatters.midl_formatter import MIDLFormatter
from app.services.docgen.reference_formatter import ReferenceFormatter
from app.services.storage.base import StorageService

logger = logging.getLogger(__name__)

# ── Formatter Registry ─────────────────────────────────────────────────────────
# Map journal slugs → formatter classes.
# Add new formatters here as they are implemented.
FORMATTER_REGISTRY: dict[str, type[BaseFormatter]] = {
    "nature":                 NatureFormatter,
    "plos-one":               PlosOneFormatter,
    "ieee":                   IEEEFormatter,
    "medical-image-analysis": MIAFormatter,
    "radiology":              RadiologyFormatter,
    "midl":                   MIDLFormatter,
}

# Status that permits document export
EXPORT_ALLOWED_STATUS = "CHECKLIST_PASSED"
EXPORTED_STATUS       = "EXPORTED"


class DocumentGenerationError(Exception):
    """Raised when generation cannot proceed due to a business rule violation."""


class DocumentGenerator:
    """
    Orchestrates the full docx generation pipeline for a given manuscript.
    Injected with a concrete StorageService at construction time.
    """

    def __init__(self, storage: StorageService) -> None:
        self.storage = storage

    # ── Public API ─────────────────────────────────────────────────────────────

    async def generate(
        self,
        manuscript_id: UUID,
        session: AsyncSession,
    ) -> str:
        """
        Full pipeline: load → validate → format → upload → persist.

        Returns:
            exported_storage_key — the storage path of the generated .docx.

        Raises:
            DocumentGenerationError — if manuscript is not CHECKLIST_PASSED,
                                       template is missing, or formatter unknown.
        """
        # ── Step 1: Load Manuscript ────────────────────────────────────────────
        manuscript = await self._load_manuscript(session, manuscript_id)

        # ── Step 2: Guard — only CHECKLIST_PASSED manuscripts may be exported ─
        if manuscript.status != EXPORT_ALLOWED_STATUS:
            raise DocumentGenerationError(
                f"Manuscript {manuscript_id} has status '{manuscript.status}'. "
                f"Export is only permitted for manuscripts in '{EXPORT_ALLOWED_STATUS}' status. "
                f"Complete the preflight checklist and human confirmation first."
            )

        # ── Step 3: Load JournalTemplate ──────────────────────────────────────
        if not manuscript.target_journal_id:
            raise DocumentGenerationError(
                f"Manuscript {manuscript_id} has no target journal selected. "
                "Select a journal template before exporting."
            )

        template = await self._load_template(session, manuscript.target_journal_id)

        # ── Step 4: Load & Deserialize ManuscriptIR ───────────────────────────
        ir = await self._load_ir(session, manuscript)

        # ── Step 5: Resolve Formatter ─────────────────────────────────────────
        formatter_cls = FORMATTER_REGISTRY.get(template.slug)
        if formatter_cls is None:
            # Unknown slug: fall back to Nature formatter and log a warning
            logger.warning(
                "No formatter registered for template slug '%s'. Falling back to NatureFormatter.",
                template.slug,
            )
            formatter_cls = NatureFormatter
        formatter = formatter_cls()

        # ── Step 6: Build Document ────────────────────────────────────────────
        doc = Document()
        ref_formatter = ReferenceFormatter(template.reference_format)

        formatter.apply_document_style(doc, template.formatting_rules)
        formatter.build_title_page(doc, ir, template.title_page_layout)
        formatter.build_abstract(doc, ir)
        formatter.build_sections(doc, ir.sections)
        formatter.build_references(doc, ir.references, ref_formatter)
        formatter.build_statements(doc, ir, template.required_statements)

        # ── Step 7: Serialize to buffer ───────────────────────────────────────
        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)

        # ── Step 8: Upload via StorageService ─────────────────────────────────
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        output_key = f"exports/{manuscript.id}/{template.slug}_{ts}.docx"
        await self.storage.upload(
            output_key,
            buf,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        logger.info("Uploaded generated .docx to storage: %s", output_key)

        # ── Step 9: Persist exported_storage_key + status transition ──────────
        manuscript.exported_storage_key = output_key
        manuscript.status = EXPORTED_STATUS
        manuscript.updated_at = datetime.utcnow()
        session.add(manuscript)
        await session.commit()
        await session.refresh(manuscript)

        return output_key

    # ── Private Helpers ────────────────────────────────────────────────────────

    @staticmethod
    async def _load_manuscript(session: AsyncSession, manuscript_id: UUID) -> Manuscript:
        stmt = select(Manuscript).where(Manuscript.id == manuscript_id)
        result = await session.execute(stmt)
        manuscript = result.scalar_one_or_none()
        if not manuscript:
            raise DocumentGenerationError(f"Manuscript {manuscript_id} not found.")
        return manuscript

    @staticmethod
    async def _load_template(session: AsyncSession, template_id: UUID) -> JournalTemplate:
        stmt = select(JournalTemplate).where(JournalTemplate.id == template_id)
        result = await session.execute(stmt)
        template = result.scalar_one_or_none()
        if not template:
            raise DocumentGenerationError(f"JournalTemplate {template_id} not found.")
        return template

    @staticmethod
    async def _load_ir(session: AsyncSession, manuscript: Manuscript) -> ManuscriptIR:
        """
        Reconstruct a ManuscriptIR from the ExtractedMetadata row.
        The JSONB columns store the structured data serialised by the parsing engine.
        """
        stmt = select(ExtractedMetadata).where(
            ExtractedMetadata.manuscript_id == manuscript.id
        )
        result = await session.execute(stmt)
        meta = result.scalar_one_or_none()

        if not meta:
            raise DocumentGenerationError(
                f"No ExtractedMetadata found for manuscript {manuscript.id}. "
                "Run the parsing pipeline (Module 4) first."
            )

        # Deserialize JSONB list fields into typed Pydantic objects
        authors = [Author(**a) for a in (meta.authors or [])]
        affiliations = [Affiliation(**a) for a in (meta.affiliations or [])]
        references = [Reference(**r) for r in _ensure_list(meta.references)]
        funding = [FundingSource(**f) for f in _ensure_list(meta.funding)]
        sections = _deserialize_section_nodes(meta.sections or [])

        corresponding_author: CorrespondingAuthor | None = None
        if meta.corresponding_author:
            corresponding_author = CorrespondingAuthor(**meta.corresponding_author)

        return ManuscriptIR(
            title=meta.title or manuscript.original_filename,
            authors=authors,
            affiliations=affiliations,
            corresponding_author=corresponding_author,
            abstract=meta.abstract or "",
            keywords=_ensure_list(meta.keywords),
            sections=sections,
            references=references,
            funding=funding,
            conflict_of_interest=meta.conflict_of_interest,
            ethics_statement=meta.ethics_statement,
            data_availability=meta.data_availability,
            author_contributions=meta.author_contributions,
            acknowledgements=meta.acknowledgements,
            word_count=manuscript.word_count,
        )


# ── Utility ────────────────────────────────────────────────────────────────────

def _ensure_list(value) -> list:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return list(value)


def _deserialize_section_nodes(raw_sections: list[dict]) -> list[SectionNode]:
    """Recursively deserialize JSONB section tree into SectionNode objects."""
    nodes: list[SectionNode] = []
    for raw in raw_sections:
        children = _deserialize_section_nodes(raw.get("children", []))
        node = SectionNode(
            heading=raw.get("heading", ""),
            level=raw.get("level", 1),
            content=raw.get("content", []),
            children=children,
        )
        nodes.append(node)
    return nodes
