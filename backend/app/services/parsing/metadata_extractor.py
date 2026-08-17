# backend/app/services/parsing/metadata_extractor.py
"""
Metadata Extractor — derives ManuscriptIR fields from the structured
SectionNode tree produced by DoclingParser.

Two-pass extraction strategy:
1. Heuristic pass — fast, zero-cost regex/keyword rules that handle
   well-structured manuscripts (the common case).
2. LLM fallback — fires only for fields that heuristics could not
   confidently populate, sending a compact text context to the
   configured LLM provider.

Operates entirely on the DoclingParseResult.sections tree and
DoclingParseResult.full_markdown — no raw .docx bytes required.

FIX (v2): Corrected _parse_authors to NOT pick the title line as an author.
The old heuristic took author_lines[0] which was often the manuscript title
(e.g. "Unified Penetration Testing Framework" → parsed as author).
The new logic applies multiple guards:
  - Min word count for a title (≥ 5 unique title words → skip that line)
  - Preamble line ordering: title first, then author names
  - Looks for lines with common author-name patterns (short, 2-4 token names)
  - Prioritises lines that follow the title in the preamble
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from app.schemas.manuscript_ir import (
    Author,
    Affiliation,
    CorrespondingAuthor,
    FundingSource,
    ManuscriptIR,
    Reference,
    SectionNode,
)
from app.services.llm.base import LLMService

logger = logging.getLogger(__name__)

# ── Heading aliases used by heuristic matching ─────────────────────────────────
_ABSTRACT_HEADINGS = {"abstract", "summary", "synopsis"}
_KEYWORDS_HEADINGS = {"keywords", "key words", "index terms"}
_INTRO_HEADINGS = {"introduction", "background", "overview"}
_REFERENCES_HEADINGS = {"references", "bibliography", "works cited", "literature cited"}
_COI_HEADINGS = {"conflict of interest", "conflicts of interest", "competing interests", "disclosures"}
_ETHICS_HEADINGS = {"ethics statement", "ethics", "ethical approval", "ethics approval", "institutional review"}
_DATA_AVAIL_HEADINGS = {"data availability", "data availability statement", "code availability"}
_AUTHOR_CONTRIB_HEADINGS = {"author contributions", "authors' contributions", "contributions"}
_ACKNOWLEDGE_HEADINGS = {"acknowledgements", "acknowledgments", "acknowledgement"}
_FUNDING_HEADINGS = {"funding", "funding sources", "financial support", "grant support"}

# Words that strongly suggest a line is a title, not an author name
_TITLE_INDICATOR_WORDS = {
    "of", "in", "on", "for", "with", "using", "based",
    "towards", "toward", "via", "through", "deep", "learning", "neural",
    "network", "framework", "approach", "method", "system", "model",
    "analysis", "detection", "segmentation", "classification", "recognition",
    "study", "review", "survey", "evaluation", "assessment", "performance",
}

# Words that appear in affiliation lines (not author names)
_AFFIL_KEYWORDS = {
    "university", "institute", "department", "dept", "hospital", "school",
    "faculty", "college", "laboratory", "lab", "center", "centre",
    "research", "foundation", "clinic", "medical", "health",
}

# ── LLM extraction schema (compact for structured_extract) ─────────────────────

from pydantic import BaseModel


class LLMAuthorBlock(BaseModel):
    title: Optional[str] = None
    authors_raw: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[list[str]] = None
    corresponding_author_name: Optional[str] = None
    corresponding_author_email: Optional[str] = None


class MetadataExtractor:
    """
    Extracts ManuscriptIR fields from the structured section tree
    produced by DoclingParser, with an optional LLM fallback pass.
    """

    def __init__(self, llm: Optional[LLMService] = None):
        self.llm = llm

    # ──────────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────────

    async def extract(
        self,
        sections: list[SectionNode],
        full_markdown: str = "",
    ) -> ManuscriptIR:
        """
        Run heuristic + optional LLM extraction on the parsed section tree.
        """
        flat = self._flatten(sections)

        # ── Heuristic pass ──────────────────────────────────────────────────
        title = self._extract_title(sections, flat)
        abstract = self._extract_abstract(flat)
        keywords = self._extract_keywords(flat)
        references = self._extract_references(flat)
        coi = self._extract_section_text(flat, _COI_HEADINGS)
        ethics = self._extract_section_text(flat, _ETHICS_HEADINGS)
        data_avail = self._extract_section_text(flat, _DATA_AVAIL_HEADINGS)
        author_contrib = self._extract_section_text(flat, _AUTHOR_CONTRIB_HEADINGS)
        acknowledgements = self._extract_section_text(flat, _ACKNOWLEDGE_HEADINGS)
        funding = self._extract_funding(flat)

        # Authors heuristic — pass the extracted title so it can be skipped
        authors_raw = self._extract_raw_authors_block(sections, exclude_title=title)

        # ── LLM fallback pass ───────────────────────────────────────────────
        llm_result: Optional[LLMAuthorBlock] = None
        needs_llm = not title or not abstract or not keywords

        if needs_llm and self.llm:
            try:
                llm_result = await self._llm_extract_header(
                    full_markdown or self._sections_to_text(sections)
                )
            except Exception as e:
                logger.warning("LLM metadata extraction failed: %s", e)

        if llm_result:
            if not title and llm_result.title:
                title = llm_result.title
            if not abstract and llm_result.abstract:
                abstract = llm_result.abstract
            if not keywords and llm_result.keywords:
                keywords = llm_result.keywords

        # ── Build authors list ───────────────────────────────────────────────
        authors = self._parse_authors(
            llm_result.authors_raw if llm_result else authors_raw,
            exclude_title=title,
        )
        corresponding_author: Optional[CorrespondingAuthor] = None
        if llm_result and llm_result.corresponding_author_name:
            corresponding_author = CorrespondingAuthor(
                full_name=llm_result.corresponding_author_name,
                email=llm_result.corresponding_author_email or "",
            )
        else:
            corresponding_author = self._extract_corresponding_from_preamble(sections)

        # ── Word count ───────────────────────────────────────────────────────
        body_text = self._sections_to_text(sections)
        word_count = len(body_text.split()) if body_text else 0

        # ── Assemble body sections (exclude meta-sections) ───────────────────
        meta_headings = (
            _ABSTRACT_HEADINGS
            | _KEYWORDS_HEADINGS
            | _REFERENCES_HEADINGS
            | _COI_HEADINGS
            | _ETHICS_HEADINGS
            | _DATA_AVAIL_HEADINGS
            | _AUTHOR_CONTRIB_HEADINGS
            | _ACKNOWLEDGE_HEADINGS
            | _FUNDING_HEADINGS
        )
        body_sections = [
            s for s in sections
            if s.heading.lower() not in meta_headings and s.heading != "__preamble__"
        ]

        return ManuscriptIR(
            title=title or "Untitled",
            authors=authors,
            affiliations=[],
            corresponding_author=corresponding_author,
            abstract=abstract or "",
            keywords=keywords or [],
            sections=body_sections,
            references=references,
            funding=funding,
            conflict_of_interest=coi,
            ethics_statement=ethics,
            data_availability=data_avail,
            author_contributions=author_contrib,
            acknowledgements=acknowledgements,
            word_count=word_count,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Heuristic helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _flatten(self, sections: list[SectionNode]) -> list[SectionNode]:
        """Flatten the full section tree into a single level list (DFS)."""
        result: list[SectionNode] = []
        for s in sections:
            result.append(s)
            if s.children:
                result.extend(self._flatten(s.children))
        return result

    def _find_section(
        self, flat: list[SectionNode], aliases: set[str]
    ) -> Optional[SectionNode]:
        """Return the first section whose heading normalises to one of the aliases."""
        for s in flat:
            if s.heading.strip().lower() in aliases:
                return s
        return None

    def _extract_title(
        self, sections: list[SectionNode], flat: list[SectionNode]
    ) -> Optional[str]:
        """
        Title heuristic:
        1. First Heading 1 node.
        2. First content line of __preamble__ that is >= 10 chars, not an
           email / ORCID / URL / author-name line (short < 5 words), and
           not an affiliation line.
        """
        # 1. First H1 in the document
        for s in flat:
            if s.level == 1 and s.heading and s.heading != "__preamble__":
                return s.heading.strip()

        # 2. Preamble first meaningful line
        preamble = next((s for s in sections if s.heading == "__preamble__"), None)
        if preamble and preamble.content:
            for line in preamble.content:
                line = line.strip()
                if (
                    len(line) >= 10
                    and "@" not in line
                    and "http" not in line
                    and "orcid" not in line.lower()
                    and not re.match(r"^\d", line)  # starts with number → affil
                    and not any(kw in line.lower() for kw in _AFFIL_KEYWORDS)
                ):
                    return line

        return None

    def _is_likely_title(self, text: str) -> bool:
        """
        Return True if this text looks more like a manuscript title than a name.
        Criteria:
        - 5 or more words
        - Contains typical title vocabulary (articles, prepositions, technical words)
        - NOT a short personal name pattern
        """
        if text.count(",") >= 2:
            return False
            
        words = text.split()
        if len(words) >= 5:
            lower_words = {w.lower().strip(".,;:") for w in words}
            indicator_count = len(lower_words & _TITLE_INDICATOR_WORDS)
            if indicator_count >= 1:
                return True
            # Long enough to be a title even without indicator words,
            # but if it has multiple commas, it's likely an author list, not a title.
            if len(words) >= 6:
                return True
        return False

    def _is_likely_author_line(self, line: str) -> bool:
        """
        Return True if this line looks like an author name list.
        Criteria:
        - NOT affiliation keywords / email / URL
        - NOT a title (fails _is_likely_title)
        - Contains ≥ 1 comma-separated short name that matches human name pattern
          (1-4 tokens, first token uppercase, allows initials like 'A.')
        """
        if "@" in line or "http" in line or "orcid" in line.lower():
            return False
        if any(kw in line.lower() for kw in _AFFIL_KEYWORDS):
            return False
        if re.match(r"^\d", line):
            return False

        # Strip superscript markers at end of the whole line
        cleaned = re.sub(r"[\d,*†‡§¶]+$", "", line).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)

        # If it looks like a title, it's not an author line
        if self._is_likely_title(cleaned):
            return False

        # Check for comma/semicolon separated name list
        parts = re.split(r"[,;]", cleaned)
        short_name_count = 0
        for part in parts:
            # Strip inline superscripts attached to names: "Smith1" → "Smith"
            part = re.sub(r"[\d*†‡§¶]+", "", part).strip()
            if not part:
                continue
            tokens = part.split()
            if not tokens or len(tokens) > 5:
                continue
            # Each token is either: starts uppercase, OR is an initial (e.g. "A.")
            def _is_name_token(t: str) -> bool:
                t = t.rstrip(".")
                return bool(t) and (t[0].isupper() or (len(t) == 1 and t.isalpha()))

            if all(_is_name_token(t) for t in tokens):
                short_name_count += 1

        return short_name_count >= 1

    def _extract_raw_authors_block(
        self, sections: list[SectionNode], exclude_title: Optional[str] = None
    ) -> Optional[str]:
        """
        Extract author candidate lines from the preamble.
        Skips: the title line, affiliation lines, email lines, URL lines.
        Returns only lines that look like author names.
        """
        preamble = next((s for s in sections if s.heading == "__preamble__"), None)
        if not preamble or not preamble.content:
            return None

        title_lower = (exclude_title or "").strip().lower()

        candidate_lines: list[str] = []
        for line in preamble.content:
            line = line.strip()
            if not line:
                continue
            # Skip the title line itself
            if title_lower and line.lower() == title_lower:
                continue
            if self._is_likely_author_line(line):
                candidate_lines.append(line)

        return "\n".join(candidate_lines) if candidate_lines else None

    def _extract_corresponding_from_preamble(
        self, sections: list[SectionNode]
    ) -> Optional[CorrespondingAuthor]:
        """Try to find a corresponding author email in the preamble block."""
        preamble = next((s for s in sections if s.heading == "__preamble__"), None)
        if not preamble:
            return None
        for line in preamble.content:
            if "@" in line:
                email_match = re.search(r"[\w.\-+]+@[\w.\-]+\.\w{2,}", line)
                if email_match:
                    return CorrespondingAuthor(
                        full_name="",
                        email=email_match.group(0),
                    )
        return None

    def _extract_abstract(self, flat: list[SectionNode]) -> Optional[str]:
        """Find abstract section and join its content paragraphs."""
        section = self._find_section(flat, _ABSTRACT_HEADINGS)
        if section and section.content:
            return "\n\n".join(p.strip() for p in section.content if p.strip())
        return None

    def _extract_keywords(self, flat: list[SectionNode]) -> Optional[list[str]]:
        """Find keywords section and split by common delimiters."""
        section = self._find_section(flat, _KEYWORDS_HEADINGS)
        if not section or not section.content:
            return None

        raw = " ".join(section.content)
        parts = re.split(r"[;,|•·\n]+", raw)
        keywords = [p.strip(" .·•") for p in parts if p.strip(" .·•")]
        return keywords if keywords else None

    def _extract_section_text(
        self, flat: list[SectionNode], aliases: set[str]
    ) -> Optional[str]:
        """Return joined content text for a named section, or None."""
        section = self._find_section(flat, aliases)
        if section and section.content:
            return "\n\n".join(p.strip() for p in section.content if p.strip())
        return None

    def _extract_funding(self, flat: list[SectionNode]) -> list[FundingSource]:
        """Parse funding section into FundingSource objects (best-effort)."""
        section = self._find_section(flat, _FUNDING_HEADINGS)
        if not section or not section.content:
            return []

        sources: list[FundingSource] = []
        for line in section.content:
            line = line.strip()
            if not line:
                continue
            grant_match = re.search(
                r"(?:grant|award|contract|agreement)[\s#:]*([A-Z0-9-]+)", line, re.IGNORECASE
            )
            grant_number = grant_match.group(1) if grant_match else None
            sources.append(FundingSource(funder=line[:500], grant_number=grant_number))

        return sources

    def _extract_references(self, flat: list[SectionNode]) -> list[Reference]:
        """
        Parse reference section into Reference objects.
        Handles numbered references: [1], 1., 1)
        """
        section = self._find_section(flat, _REFERENCES_HEADINGS)
        if not section or not section.content:
            return []

        refs: list[Reference] = []
        idx = 0

        for line in section.content:
            line = line.strip()
            if not line:
                continue

            numbered = re.match(r"^[\[\(]?(\d+)[\]\).]?\s+", line)
            if numbered:
                idx = int(numbered.group(1))
                raw_text = line[numbered.end():].strip()
            else:
                if refs:
                    refs[-1] = Reference(
                        index=refs[-1].index,
                        raw_text=refs[-1].raw_text + " " + line,
                        authors=refs[-1].authors,
                        title=refs[-1].title,
                        doi=refs[-1].doi,
                    )
                    continue
                else:
                    idx += 1
                    raw_text = line

            doi_match = re.search(
                r"https?://doi\.org/(\S+)|doi:\s*(\S+)", raw_text, re.IGNORECASE
            )
            doi = (
                (doi_match.group(1) or doi_match.group(2)).rstrip(".,)")
                if doi_match
                else None
            )
            year_match = re.search(r"\b(19|20)\d{2}\b", raw_text)
            year = int(year_match.group(0)) if year_match else None

            refs.append(Reference(index=idx, raw_text=raw_text, year=year, doi=doi))

        return refs

    def _parse_authors(
        self,
        authors_raw: Optional[str],
        exclude_title: Optional[str] = None,
    ) -> list[Author]:
        """
        Parse a raw author string into Author objects.

        Guards against picking the manuscript title as an author:
        - Skips any line that matches the title text
        - Skips any line that _is_likely_title() returns True for
        - Only processes lines that _is_likely_author_line() approves
        """
        if not authors_raw:
            return []

        title_lower = (exclude_title or "").strip().lower()
        lines = [l.strip() for l in authors_raw.split("\n") if l.strip()]

        # Find the best author line — first line that passes all guards
        author_line: Optional[str] = None
        for line in lines:
            if title_lower and line.lower() == title_lower:
                continue
            if self._is_likely_title(line):
                continue
            if not self._is_likely_author_line(line):
                continue
            author_line = line
            break

        if not author_line:
            return []

        authors: list[Author] = []
        # Strip common superscript markers before splitting
        author_line_clean = re.sub(r"\s*[\d*†‡§¶]+\s*(?=[,;]|$)", "", author_line)
        parts = re.split(r"[,;]", author_line_clean)
        for part in parts:
            part = part.strip().strip("*†‡§¶ ")
            if not part:
                continue
            name_parts = part.split()
            if len(name_parts) >= 2:
                authors.append(
                    Author(
                        given_name=" ".join(name_parts[:-1]),
                        surname=name_parts[-1],
                    )
                )
            elif len(name_parts) == 1:
                authors.append(Author(given_name="", surname=name_parts[0]))

        return authors

    # ──────────────────────────────────────────────────────────────────────────
    # LLM helpers
    # ──────────────────────────────────────────────────────────────────────────

    async def _llm_extract_header(self, text: str) -> LLMAuthorBlock:
        """
        Fire a single structured LLM call to extract key manuscript header fields.
        Uses only the first ~4000 characters (title page + abstract) to keep cost low.
        """
        context = text[:4000].strip()
        prompt = (
            "The following is the beginning of a scientific manuscript. "
            "Extract the title, authors (as a comma-separated string), abstract, "
            "keywords (as a list), and corresponding author name and email.\n\n"
            f"---\n{context}"
        )

        raw = await self.llm.structured_extract(
            prompt=prompt,
            schema=LLMAuthorBlock,
        )
        return LLMAuthorBlock(**raw)

    # ──────────────────────────────────────────────────────────────────────────
    # Utility
    # ──────────────────────────────────────────────────────────────────────────

    def _sections_to_text(self, sections: list[SectionNode]) -> str:
        """Convert sections tree to flat plain text for LLM context."""
        parts: list[str] = []

        def walk(nodes: list[SectionNode]) -> None:
            for node in nodes:
                if node.heading and node.heading != "__preamble__":
                    parts.append(f"\n{'#' * max(node.level, 1)} {node.heading}\n")
                for line in node.content:
                    parts.append(line)
                if node.children:
                    walk(node.children)

        walk(sections)
        return "\n".join(parts)
