"""
app/services/docgen/reference_formatter.py

Citation-style renderer driven entirely by the JournalTemplate's
reference_format JSONB column. No per-journal logic is hardcoded here.

Supported citation_style values (read from template.reference_format["citation_style"]):
  - "superscript"        → Nature-style ¹²
  - "bracketed_numbers"  → Vancouver/PLOS [1], [2]
  - "author_year"        → Harvard (Smith et al., 2023)

The style key is the single switch; everything else (formatting details) is
handled by the sub-renderers below.
"""

from __future__ import annotations

from app.schemas.manuscript_ir import Reference


class ReferenceFormatter:
    """
    Renders a Reference object into a formatted bibliography string
    and an inline citation marker, driven by template config.
    """

    SUPPORTED_STYLES = {"superscript", "bracketed_numbers", "author_year"}

    def __init__(self, reference_format: dict) -> None:
        self._config = reference_format
        raw_style = reference_format.get("citation_style", "bracketed_numbers")
        if raw_style not in self.SUPPORTED_STYLES:
            # Graceful fallback: log and default to bracketed numbers
            import logging
            logging.getLogger(__name__).warning(
                "Unknown citation_style '%s'; falling back to 'bracketed_numbers'", raw_style
            )
            raw_style = "bracketed_numbers"
        self._style = raw_style

    # ── Inline Citation Marker ─────────────────────────────────────────────────

    def inline_citation(self, index: int, authors: list[str] | None = None, year: int | None = None) -> str:
        """Return the inline citation token for a given reference index."""
        if self._style == "superscript":
            # Unicode superscript digits for plain-text approximation.
            # In actual docx, a run with vertAlign="superscript" is added by the formatter.
            return f"^{index}"
        if self._style == "author_year":
            if authors and year:
                first_author_surname = authors[0].split()[-1] if authors else "Unknown"
                et_al = " et al." if len(authors) > 1 else ""
                return f"({first_author_surname}{et_al}, {year})"
            return f"({year})" if year else f"(Ref. {index})"
        # Default: bracketed_numbers
        return f"[{index}]"

    # ── Bibliography Entry ─────────────────────────────────────────────────────

    def format_entry(self, ref: Reference) -> str:
        """
        Render a full bibliography entry string.
        Falls back to raw_text if structured fields are absent.
        """
        if not ref.authors and not ref.title:
            # No structured data — use raw_text verbatim
            return f"{ref.index}. {ref.raw_text}"

        if self._style == "author_year":
            return self._harvard(ref)
        if self._style == "superscript":
            return self._nature_numbered(ref)
        return self._vancouver(ref)

    # ── Style Sub-renderers ────────────────────────────────────────────────────

    @staticmethod
    def _nature_numbered(ref: Reference) -> str:
        """Nature superscript-numbered bibliography format."""
        parts: list[str] = []
        if ref.authors:
            authors_str = ", ".join(ref.authors[:6])
            if len(ref.authors) > 6:
                authors_str += " et al."
            parts.append(authors_str)
        if ref.title:
            parts.append(ref.title)
        if ref.journal:
            journal_part = f"*{ref.journal}*"
            if ref.volume:
                journal_part += f" **{ref.volume}**"
            if ref.pages:
                journal_part += f", {ref.pages}"
            if ref.year:
                journal_part += f" ({ref.year})"
            parts.append(journal_part)
        if ref.doi:
            parts.append(f"https://doi.org/{ref.doi}")
        entry = ". ".join(parts) + "."
        return f"{ref.index}. {entry}"

    @staticmethod
    def _vancouver(ref: Reference) -> str:
        """Vancouver / PLOS-style bracketed numbered format."""
        parts: list[str] = []
        if ref.authors:
            authors_str = ", ".join(ref.authors[:6])
            if len(ref.authors) > 6:
                authors_str += " et al."
            parts.append(authors_str)
        if ref.title:
            parts.append(ref.title)
        if ref.journal:
            journal_part = ref.journal
            if ref.year:
                journal_part += f". {ref.year}"
            if ref.volume:
                journal_part += f";{ref.volume}"
            if ref.pages:
                journal_part += f":{ref.pages}"
            parts.append(journal_part)
        if ref.doi:
            parts.append(f"doi:{ref.doi}")
        elif ref.pmid:
            parts.append(f"PMID:{ref.pmid}")
        entry = ". ".join(parts) + "."
        return f"[{ref.index}] {entry}"

    @staticmethod
    def _harvard(ref: Reference) -> str:
        """Harvard author-year format."""
        parts: list[str] = []
        if ref.authors:
            authors_str = ", ".join(ref.authors[:3])
            if len(ref.authors) > 3:
                authors_str += " et al."
            parts.append(authors_str)
        year_part = f"({ref.year})" if ref.year else "(n.d.)"
        parts.append(year_part)
        if ref.title:
            parts.append(f"'{ref.title}'")
        if ref.journal:
            journal_part = f"*{ref.journal}*"
            if ref.volume:
                journal_part += f", {ref.volume}"
            if ref.pages:
                journal_part += f", pp. {ref.pages}"
            parts.append(journal_part)
        if ref.doi:
            parts.append(f"https://doi.org/{ref.doi}")
        return " ".join(parts) + "."
