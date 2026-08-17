# backend/app/schemas/manuscript_ir.py
"""Journal-Agnostic Internal Representation (IR) Schema."""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


# ── Author & Affiliation ──────────────────────────────────────────
class Author(BaseModel):
    given_name: str
    surname: str
    email: Optional[str] = None
    orcid: Optional[str] = None
    is_corresponding: bool = False
    affiliation_indices: list[int] = Field(
        default_factory=list,
        description="1-based indices into the affiliations list"
    )


class Affiliation(BaseModel):
    index: int = Field(description="1-based display index")
    institution: str
    department: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None


class CorrespondingAuthor(BaseModel):
    full_name: str
    email: str
    affiliation: Optional[str] = None
    phone: Optional[str] = None


# ── Document Sections (Recursive Tree) ────────────────────────────
class SectionNode(BaseModel):
    heading: str
    level: int = Field(ge=0, le=6, description="Heading level 0–6 (0 = preamble / root)")
    content: list[str] = Field(
        default_factory=list,
        description="Paragraph texts and table markdown under this heading"
    )
    children: list[SectionNode] = Field(default_factory=list)


# ── References ────────────────────────────────────────────────────
class Reference(BaseModel):
    index: int = Field(description="1-based citation order")
    raw_text: str = Field(description="Original reference string as parsed")
    authors: Optional[list[str]] = None
    title: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    volume: Optional[str] = None
    pages: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    url: Optional[str] = None


# ── Funding ───────────────────────────────────────────────────────
class FundingSource(BaseModel):
    funder: str
    grant_number: Optional[str] = None
    recipient: Optional[str] = None


# ── Top-Level IR ──────────────────────────────────────────────────
class ManuscriptStatus(str, Enum):
    DRAFT = "DRAFT"
    PARSED = "PARSED"
    EDITED = "EDITED"
    TARGET_SELECTED = "TARGET_SELECTED"
    CHECKLIST_PASSED = "CHECKLIST_PASSED"
    EXPORTED = "EXPORTED"


class ManuscriptIR(BaseModel):
    """
    The canonical, journal-agnostic internal representation of a
    scientific manuscript. Every manuscript in the system is
    normalized to this schema after parsing.
    """
    title: str
    authors: list[Author] = Field(default_factory=list)
    affiliations: list[Affiliation] = Field(default_factory=list)
    corresponding_author: Optional[CorrespondingAuthor] = None
    abstract: str = ""
    keywords: list[str] = Field(default_factory=list)
    sections: list[SectionNode] = Field(
        default_factory=list,
        description="Full heading hierarchy of the manuscript body"
    )
    references: list[Reference] = Field(default_factory=list)
    funding: list[FundingSource] = Field(default_factory=list)
    conflict_of_interest: Optional[str] = None
    ethics_statement: Optional[str] = None
    data_availability: Optional[str] = None
    author_contributions: Optional[str] = None
    acknowledgements: Optional[str] = None
    word_count: int = 0
