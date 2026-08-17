# backend/app/services/parsing/image_extractor.py
"""
Image Extractor — takes Docling-extracted picture items and persists
them as ManuscriptAsset records in the database and object storage.

Receives ExtractedPictureItem objects produced by DoclingParser rather
than re-reading the raw .docx bytes. This keeps image extraction
decoupled from the parsing backend and ensures Docling's caption
and bounding-box provenance is preserved on the asset record.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import ManuscriptAsset
from app.services.parsing.docling_parser import ExtractedPictureItem
from app.services.storage.base import StorageService

logger = logging.getLogger(__name__)


class ImageExtractor:
    """
    Uploads Docling-extracted picture items to object storage and
    creates ManuscriptAsset database records.
    """

    def __init__(self, storage: StorageService, session: AsyncSession):
        self.storage = storage
        self.session = session

    async def extract(
        self,
        pictures: list[ExtractedPictureItem],
        manuscript_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> list[ManuscriptAsset]:
        """
        Persist each picture extracted by DoclingParser to storage and DB.

        Args:
            pictures: List of ExtractedPictureItem produced by DoclingParser.parse().
            manuscript_id: UUID of the parent Manuscript record.
            user_id: Optional user ID used for storage key namespacing.

        Returns:
            List of persisted ManuscriptAsset records.
        """
        assets: list[ManuscriptAsset] = []

        for pic in pictures:
            if not pic.image_bytes:
                logger.debug(
                    "Skipping picture %d (no image bytes extracted — possibly vector/embedded OLE).",
                    pic.index,
                )
                continue

            try:
                # Build a clean storage key
                filename = pic.original_filename or f"figure_{pic.index}.png"
                uid_segment = f"{user_id}/" if user_id else ""
                storage_key = (
                    f"manuscripts/{uid_segment}{manuscript_id}/figures/{filename}"
                )

                # Upload to storage backend
                file_obj = io.BytesIO(pic.image_bytes)
                await self.storage.upload(
                    key=storage_key,
                    data=file_obj,
                    content_type=pic.mime_type,
                )

                # Build asset DB record
                # Captions from Docling may contain bounding-box references in addition to text
                caption = pic.caption
                if caption and len(caption) > 1000:
                    caption = caption[:1000]  # Guard against excessively long captions

                asset = ManuscriptAsset(
                    manuscript_id=manuscript_id,
                    asset_type="figure",
                    original_name=filename,
                    storage_key=storage_key,
                    mime_type=pic.mime_type,
                    file_size_bytes=len(pic.image_bytes),
                    order_index=pic.index,
                    caption=caption,
                    created_at=datetime.utcnow(),
                )
                self.session.add(asset)
                assets.append(asset)

                logger.info(
                    "Uploaded figure %d for manuscript %s → %s",
                    pic.index,
                    manuscript_id,
                    storage_key,
                )

            except Exception as e:
                logger.error(
                    "Failed to upload figure %d for manuscript %s: %s",
                    pic.index,
                    manuscript_id,
                    e,
                )
                # Non-fatal: continue with remaining figures

        if assets:
            await self.session.flush()  # Write without committing — caller commits the transaction

        return assets
