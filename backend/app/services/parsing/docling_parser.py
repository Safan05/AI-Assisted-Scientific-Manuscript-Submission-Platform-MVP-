# backend/app/services/parsing/docling_parser.py
"""
Docling Document Parser Backend.

Replaces naive python-docx section-walking with Docling (IBM Research / LF AI & Data Foundation)
as the core document parsing engine for scientific manuscripts.

Docling provides:
1. Native DOCX parsing reading structured XML (runs in-process, CPU-only, no external API or GPU needed).
2. Advanced table structure recognition via TableFormer.
3. Embedded figure / picture extraction with captions and bounding box provenance.
4. Accurate heading hierarchy and reading-order reconstruction.

NOTE ON FUTURE PDF / SCANNED MANUSCRIPT EXTENSIONS:
If the platform later expands to support scanned or PDF manuscripts, Docling handles those natively
via its unified DocumentConverter pipeline and optional OCR backends (EasyOCR, Tesseract, RapidOCR).
Because Docling uses the identical DocumentConverter API and DoclingDocument output representation
across formats, no pipeline rearchitecture will be required.
"""

from __future__ import annotations

import io
import os
import tempfile
import logging
from dataclasses import dataclass, field
from typing import Optional, Any
from pathlib import Path

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import DocumentStream
except ImportError:
    DocumentConverter = None
    DocumentStream = None

from app.schemas.manuscript_ir import SectionNode

logger = logging.getLogger(__name__)



@dataclass
class ExtractedPictureItem:
    """Represents a picture/figure extracted from the document by Docling."""
    index: int
    image_bytes: bytes
    mime_type: str = "image/png"
    caption: Optional[str] = None
    original_filename: Optional[str] = None
    bounding_box: Optional[dict[str, Any]] = None
    provenance: Optional[dict[str, Any]] = None


@dataclass
class DoclingParseResult:
    """Result container returned by DoclingParser."""
    sections: list[SectionNode] = field(default_factory=list)
    pictures: list[ExtractedPictureItem] = field(default_factory=list)
    tables: list[dict[str, Any]] = field(default_factory=list)
    full_markdown: str = ""
    raw_dict: dict[str, Any] = field(default_factory=dict)


class DoclingParser:
    """
    Parses scientific manuscripts using Docling into a structured SectionNode tree,
    extracting embedded figures and structured tables.
    """

    def __init__(self, converter: Optional[DocumentConverter] = None):
        # Docling runs in-process — no separate service, external API, or GPU required for DOCX.
        self.converter = converter or DocumentConverter()

    def parse(self, file_bytes: bytes, filename: str = "manuscript.docx") -> DoclingParseResult:
        """
        Parse raw manuscript bytes into SectionNode tree, pictures, and tables.

        Args:
            file_bytes: Raw binary content of the .docx manuscript downloaded from storage.
            filename: Original file name (used for format detection and naming).

        Returns:
            DoclingParseResult containing sections tree, extracted figures, tables, markdown, and raw JSON dict.
        """
        # Convert manuscript using Docling
        # Use a temporary file to support all platform environments seamlessly
        suffix = Path(filename).suffix if Path(filename).suffix else ".docx"
        temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        try:
            temp_file.write(file_bytes)
            temp_file.flush()
            temp_file.close()

            conversion_result = self.converter.convert(temp_file.name)
        finally:
            if os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except OSError as e:
                    logger.warning("Failed to remove temporary file %s: %s", temp_file.name, e)

        doc = conversion_result.document

        # Export full markdown & raw JSON dictionary
        try:
            full_markdown = doc.export_to_markdown()
        except Exception as e:
            logger.warning("Failed to export markdown from DoclingDocument: %s", e)
            full_markdown = ""

        try:
            raw_dict = doc.export_to_dict()
        except Exception as e:
            logger.warning("Failed to export dict from DoclingDocument: %s", e)
            raw_dict = {}

        # 1. Build SectionNode Tree
        sections = self._build_section_tree(doc)

        # 2. Extract Embedded Pictures / Figures
        pictures = self._extract_pictures(doc)

        # 3. Extract Tables
        tables = self._extract_tables(doc)

        return DoclingParseResult(
            sections=sections,
            pictures=pictures,
            tables=tables,
            full_markdown=full_markdown,
            raw_dict=raw_dict,
        )

    def _build_section_tree(self, doc: Any) -> list[SectionNode]:
        """
        Walks the DoclingDocument item hierarchy and builds a nested SectionNode tree,
        preserving heading levels, paragraphs, and formatted table representations.
        """
        root_sections: list[SectionNode] = []
        stack: list[SectionNode] = []

        # Iterate through document items in logical reading order
        for item, level in doc.iterate_items():
            item_type = item.__class__.__name__
            label = str(getattr(item, "label", "")).lower()

            # Handle Section Headers / Headings
            if "heading" in label or "header" in label or item_type == "SectionHeaderItem":
                heading_text = getattr(item, "text", "").strip()
                if not heading_text:
                    continue

                # Determine heading level (Docling provides item.level or fallback to tree nesting)
                heading_level = getattr(item, "level", None)
                if heading_level is None or not isinstance(heading_level, int) or heading_level < 1:
                    heading_level = max(1, min(6, level if isinstance(level, int) else 1))

                node = SectionNode(
                    heading=heading_text,
                    level=heading_level,
                    content=[],
                    children=[],
                )

                # Pop stack until top of stack is parent with level < current heading_level
                while stack and stack[-1].level >= heading_level:
                    stack.pop()

                if stack:
                    stack[-1].children.append(node)
                else:
                    root_sections.append(node)

                stack.append(node)

            # Handle Paragraphs & Body Text
            elif "paragraph" in label or "text" in label or item_type in ("TextItem", "ParagraphItem", "ListItem"):
                text_content = getattr(item, "text", "").strip()
                if not text_content:
                    continue

                if stack:
                    stack[-1].content.append(text_content)
                else:
                    # Text before any heading — preamble (e.g. title, raw author block, abstract)
                    if not root_sections or root_sections[0].heading != "__preamble__":
                        preamble_node = SectionNode(
                            heading="__preamble__",
                            level=0,
                            content=[],
                            children=[],
                        )
                        root_sections.insert(0, preamble_node)
                    root_sections[0].content.append(text_content)

            # Handle Tables
            elif "table" in label or item_type == "TableItem":
                table_md = ""
                # Attempt to export table to markdown
                if hasattr(item, "export_to_markdown"):
                    try:
                        table_md = item.export_to_markdown()
                    except Exception:
                        table_md = ""

                # Fallback to string or dataframe markdown if available
                if not table_md and hasattr(item, "export_to_dataframe"):
                    try:
                        table_md = item.export_to_dataframe().to_markdown()
                    except Exception:
                        table_md = str(getattr(item, "text", ""))

                caption = ""
                if hasattr(item, "caption") and item.caption:
                    caption = getattr(item.caption, "text", str(item.caption)).strip()

                table_entry = f"[Table: {caption}]\n{table_md}" if caption else table_md
                if table_entry.strip():
                    if stack:
                        stack[-1].content.append(table_entry)
                    else:
                        if not root_sections or root_sections[0].heading != "__preamble__":
                            root_sections.insert(0, SectionNode(heading="__preamble__", level=0, content=[], children=[]))
                        root_sections[0].content.append(table_entry)

        return root_sections

    def _extract_pictures(self, doc: Any) -> list[ExtractedPictureItem]:
        """
        Extracts embedded figures and pictures from the DoclingDocument,
        capturing image data, captions, and bounding box provenance.
        """
        pictures: list[ExtractedPictureItem] = []
        pic_index = 0

        for item, _ in doc.iterate_items():
            item_type = item.__class__.__name__
            label = str(getattr(item, "label", "")).lower()

            if "picture" in label or "image" in label or item_type == "PictureItem":
                pic_index += 1
                caption_text: Optional[str] = None
                if hasattr(item, "caption") and item.caption:
                    caption_text = getattr(item.caption, "text", str(item.caption)).strip()

                # Extract bounding box / provenance if available
                bbox_dict: Optional[dict[str, Any]] = None
                prov_dict: Optional[dict[str, Any]] = None
                if hasattr(item, "prov") and item.prov:
                    try:
                        first_prov = item.prov[0] if isinstance(item.prov, list) and item.prov else item.prov
                        if hasattr(first_prov, "bbox"):
                            bbox = first_prov.bbox
                            bbox_dict = {
                                "l": getattr(bbox, "l", None),
                                "t": getattr(bbox, "t", None),
                                "r": getattr(bbox, "r", None),
                                "b": getattr(bbox, "b", None),
                                "coord_origin": str(getattr(bbox, "coord_origin", "BOTTOMLEFT")),
                            }
                        if hasattr(first_prov, "page_no"):
                            prov_dict = {"page_no": first_prov.page_no}
                    except Exception as e:
                        logger.debug("Could not parse provenance for picture item: %s", e)

                # Extract PIL Image or raw bytes
                image_bytes = b""
                mime_type = "image/png"

                try:
                    # Docling PictureItem can retrieve PIL Image via item.get_image(doc) or item.image
                    pil_img = None
                    if hasattr(item, "get_image"):
                        pil_img = item.get_image(doc)
                    elif hasattr(item, "image") and item.image:
                        pil_img = getattr(item.image, "pil_image", item.image)

                    if pil_img is not None and hasattr(pil_img, "save"):
                        buf = io.BytesIO()
                        pil_img.save(buf, format="PNG")
                        image_bytes = buf.getvalue()
                        mime_type = "image/png"
                except Exception as e:
                    logger.warning("Failed to extract image bytes for picture %d: %s", pic_index, e)

                pictures.append(
                    ExtractedPictureItem(
                        index=pic_index,
                        image_bytes=image_bytes,
                        mime_type=mime_type,
                        caption=caption_text,
                        original_filename=f"figure_{pic_index}.png",
                        bounding_box=bbox_dict,
                        provenance=prov_dict,
                    )
                )

        return pictures

    def _extract_tables(self, doc: Any) -> list[dict[str, Any]]:
        """
        Extracts structured tables with metadata and markdown representations.
        """
        tables: list[dict[str, Any]] = []
        table_idx = 0

        for item, _ in doc.iterate_items():
            item_type = item.__class__.__name__
            label = str(getattr(item, "label", "")).lower()

            if "table" in label or item_type == "TableItem":
                table_idx += 1
                caption_text: Optional[str] = None
                if hasattr(item, "caption") and item.caption:
                    caption_text = getattr(item.caption, "text", str(item.caption)).strip()

                table_md = ""
                if hasattr(item, "export_to_markdown"):
                    try:
                        table_md = item.export_to_markdown()
                    except Exception:
                        table_md = ""

                tables.append({
                    "index": table_idx,
                    "caption": caption_text,
                    "markdown": table_md,
                    "num_rows": getattr(item, "num_rows", None),
                    "num_cols": getattr(item, "num_cols", None),
                })

        return tables
