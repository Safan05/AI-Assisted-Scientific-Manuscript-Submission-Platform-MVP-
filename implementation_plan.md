# AI-Assisted Scientific Manuscript Platform — Master Implementation Blueprint

## Executive Summary

A full-stack platform that automates scientific manuscript parsing, journal-agnostic JSON transformation, metadata extraction, human verification, target journal pre-flight checking, and output document generation. The system is designed as **8 sequential execution modules**, each self-contained with clear inputs/outputs, enabling incremental development without context loss.

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend — Next.js 15 + Shadcn UI"
        FE_AUTH["Auth Pages"]
        FE_DASH["Dashboard"]
        FE_UPLOAD["Upload Flow"]
        FE_EDITOR["Metadata Editor"]
        FE_JOURNAL["Journal Selector"]
        FE_PREFLIGHT["Preflight Checklist"]
        FE_EXPORT["Export / Download"]
    end

    subgraph "Backend — FastAPI + Python 3.11+"
        API_GW["API Gateway (v1 Router)"]
        AUTH_SVC["Auth Service (JWT/OAuth2)"]
        INGEST_SVC["Ingestion Service"]
        PARSE_SVC["Parsing Engine"]
        META_SVC["Metadata Extraction"]
        JOURNAL_SVC["Journal Template Engine"]
        PREFLIGHT_SVC["Preflight Checker"]
        DOCGEN_SVC["Document Generator"]
        LLM_SVC["LLM Service (Abstract)"]
        STORAGE_SVC["Storage Service (Abstract)"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL"]
        BUNNY["Bunny.net / S3 Storage"]
    end

    subgraph "AI Layer (Phase 2)"
        OPENAI["OpenAI API"]
        CLAUDE["Anthropic Claude"]
        LOCAL["Ollama / vLLM (DGX)"]
    end

    FE_AUTH --> API_GW
    FE_DASH --> API_GW
    FE_UPLOAD --> API_GW
    FE_EDITOR --> API_GW
    FE_JOURNAL --> API_GW
    FE_PREFLIGHT --> API_GW
    FE_EXPORT --> API_GW

    API_GW --> AUTH_SVC
    API_GW --> INGEST_SVC
    API_GW --> PARSE_SVC
    API_GW --> META_SVC
    API_GW --> JOURNAL_SVC
    API_GW --> PREFLIGHT_SVC
    API_GW --> DOCGEN_SVC

    INGEST_SVC --> STORAGE_SVC
    DOCGEN_SVC --> STORAGE_SVC
    PARSE_SVC --> LLM_SVC
    META_SVC --> LLM_SVC

    STORAGE_SVC --> BUNNY
    LLM_SVC --> OPENAI
    LLM_SVC --> CLAUDE
    LLM_SVC --> LOCAL

    AUTH_SVC --> PG
    INGEST_SVC --> PG
    PARSE_SVC --> PG
    META_SVC --> PG
    JOURNAL_SVC --> PG
    PREFLIGHT_SVC --> PG
    DOCGEN_SVC --> PG
```

---

## 1. Complete Database Schema (PostgreSQL ERD)

```mermaid
erDiagram
    users ||--o{ projects : "owns"
    projects ||--o{ manuscripts : "contains"
    manuscripts ||--|| extracted_metadata : "has"
    manuscripts ||--o{ manuscript_assets : "has"
    manuscripts ||--o{ preflight_results : "has"
    manuscripts }o--|| journal_templates : "targets"
    journal_templates ||--o{ template_rules : "defines"
    preflight_results ||--o{ preflight_check_items : "contains"

    users {
        uuid id PK
        varchar email UK
        varchar hashed_password
        varchar full_name
        varchar role "admin | user"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    projects {
        uuid id PK
        uuid user_id FK
        varchar name
        text description
        varchar status "active | archived"
        timestamp created_at
        timestamp updated_at
    }

    manuscripts {
        uuid id PK
        uuid project_id FK
        varchar original_filename
        varchar storage_key "path in object storage"
        varchar status "DRAFT | PARSED | EDITED | TARGET_SELECTED | CHECKLIST_PASSED | EXPORTED"
        uuid target_journal_id FK "nullable"
        jsonb raw_parsed_json "full parsed document tree"
        integer word_count
        varchar exported_storage_key "nullable"
        timestamp created_at
        timestamp updated_at
    }

    extracted_metadata {
        uuid id PK
        uuid manuscript_id FK UK
        varchar title
        jsonb authors "array of AuthorObj"
        jsonb affiliations "array of AffiliationObj"
        jsonb corresponding_author "CorrespondingAuthorObj"
        text abstract
        jsonb keywords "string array"
        jsonb sections "array of SectionObj (heading tree)"
        jsonb references "array of ReferenceObj"
        jsonb funding "array of FundingObj"
        text conflict_of_interest
        text ethics_statement
        text data_availability
        text author_contributions
        text acknowledgements
        boolean is_human_verified
        timestamp verified_at
        timestamp created_at
        timestamp updated_at
    }

    manuscript_assets {
        uuid id PK
        uuid manuscript_id FK
        varchar asset_type "image | table | supplementary | figure"
        varchar original_name
        varchar storage_key
        varchar mime_type
        integer file_size_bytes
        integer order_index
        text caption "nullable"
        timestamp created_at
    }

    journal_templates {
        uuid id PK
        varchar name UK "e.g. Nature, IEEE Trans."
        varchar slug UK "nature, ieee-trans"
        text description
        jsonb heading_structure "required heading order + naming"
        jsonb reference_format "citation style config"
        jsonb formatting_rules "margins, font, spacing, columns"
        jsonb title_page_layout "fields required on title page"
        jsonb required_statements "ethics, COI, data availability, etc."
        integer max_abstract_words "nullable"
        integer max_total_words "nullable"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    template_rules {
        uuid id PK
        uuid template_id FK
        varchar rule_key "e.g. abstract_word_limit"
        varchar rule_type "word_count | required_field | regex | presence"
        jsonb rule_config "threshold, pattern, field_path, etc."
        varchar severity "PASS | WARN | FAIL"
        varchar message "Human-readable check description"
        integer sort_order
    }

    preflight_results {
        uuid id PK
        uuid manuscript_id FK
        uuid template_id FK
        varchar overall_status "PASS | WARN | FAIL"
        boolean human_confirmed
        timestamp confirmed_at "nullable"
        timestamp created_at
    }

    preflight_check_items {
        uuid id PK
        uuid preflight_result_id FK
        uuid rule_id FK
        varchar status "PASS | WARN | FAIL"
        varchar message
        jsonb details "nullable — extra context"
        boolean human_override "user can acknowledge a WARN"
    }
```

---

## 2. Journal-Agnostic Internal Representation (Pydantic v2 Models)

These models define the canonical JSON structure that **every manuscript** is parsed into, regardless of source format. All downstream operations (editing, preflight checking, document generation) operate on this schema.

```python
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
    level: int = Field(ge=1, le=6, description="Heading level 1–6")
    content: list[str] = Field(
        default_factory=list,
        description="Paragraph texts under this heading"
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
```

---

## 3. Abstract Storage Interface

```python
# backend/app/services/storage/base.py
"""Abstract storage interface — swap Bunny.net / MinIO / S3 via .env."""

from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageService(ABC):
    """Unified object storage interface."""

    @abstractmethod
    async def upload(
        self,
        key: str,
        data: BinaryIO,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file. Returns the full storage URL."""
        ...

    @abstractmethod
    async def download(self, key: str) -> bytes:
        """Download a file by key."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a file by key."""
        ...

    @abstractmethod
    async def generate_presigned_url(
        self, key: str, expires_in: int = 3600
    ) -> str:
        """Generate a time-limited download URL."""
        ...

    @abstractmethod
    async def list_objects(
        self, prefix: str, max_keys: int = 1000
    ) -> list[str]:
        """List object keys under a prefix."""
        ...
```

```python
# backend/app/services/storage/s3_compatible.py
"""Concrete implementation using boto3 — works with Bunny / MinIO / AWS S3."""

import boto3
from botocore.client import Config
from io import BytesIO
from .base import StorageService
from app.core.config import settings


class S3CompatibleStorage(StorageService):
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT_URL,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
            config=Config(s3={"addressing_style": "path"}),
        )
        self.bucket = settings.STORAGE_BUCKET_NAME

    async def upload(self, key, data, content_type="application/octet-stream"):
        self.client.upload_fileobj(
            data, self.bucket, key,
            ExtraArgs={"ContentType": content_type},
        )
        return f"{settings.STORAGE_CDN_URL}/{key}"

    async def download(self, key):
        buf = BytesIO()
        self.client.download_fileobj(self.bucket, key, buf)
        return buf.getvalue()

    async def delete(self, key):
        self.client.delete_object(Bucket=self.bucket, Key=key)

    async def generate_presigned_url(self, key, expires_in=3600):
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    async def list_objects(self, prefix, max_keys=1000):
        resp = self.client.list_objects_v2(
            Bucket=self.bucket, Prefix=prefix, MaxKeys=max_keys
        )
        return [obj["Key"] for obj in resp.get("Contents", [])]
```

```python
# backend/app/services/storage/factory.py
"""Factory to instantiate the correct storage backend from .env."""

from app.core.config import settings
from .base import StorageService
from .s3_compatible import S3CompatibleStorage


def get_storage_service() -> StorageService:
    provider = settings.STORAGE_PROVIDER.lower()  # "bunny" | "minio" | "s3"
    # All three use the S3 protocol — only endpoint/credentials differ
    if provider in ("bunny", "minio", "s3"):
        return S3CompatibleStorage()
    raise ValueError(f"Unknown storage provider: {provider}")
```

---

## 4. Abstract LLM Interface

```python
# backend/app/services/llm/base.py
"""Abstract LLM interface — swap OpenAI / Anthropic / Ollama via .env."""

from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel


class LLMMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMResponse(BaseModel):
    content: str
    model: str
    usage: Optional[dict] = None  # {"prompt_tokens": ..., "completion_tokens": ...}


class LLMService(ABC):
    """Unified LLM chat interface."""

    @abstractmethod
    async def chat(
        self,
        messages: list[LLMMessage],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        response_format: Optional[dict] = None,
    ) -> LLMResponse:
        """Send a chat completion request."""
        ...

    @abstractmethod
    async def structured_extract(
        self,
        prompt: str,
        system_prompt: str,
        schema: type[BaseModel],
        model: Optional[str] = None,
    ) -> BaseModel:
        """Extract structured data conforming to a Pydantic schema."""
        ...
```

```python
# backend/app/services/llm/openai_service.py
"""OpenAI-compatible implementation (also works with vLLM/Ollama OpenAI-compat endpoints)."""

import openai
from .base import LLMService, LLMMessage, LLMResponse
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
import json


class OpenAILLMService(LLMService):
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,  # OpenAI default or Ollama/vLLM endpoint
        )
        self.default_model = settings.LLM_DEFAULT_MODEL

    async def chat(self, messages, model=None, temperature=0.3,
                   max_tokens=4096, response_format=None):
        resp = await self.client.chat.completions.create(
            model=model or self.default_model,
            messages=[m.model_dump() for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )
        return LLMResponse(
            content=resp.choices[0].message.content,
            model=resp.model,
            usage=resp.usage.model_dump() if resp.usage else None,
        )

    async def structured_extract(self, prompt, system_prompt, schema,
                                  model=None):
        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=prompt),
        ]
        resp = await self.chat(
            messages, model=model,
            response_format={"type": "json_object"},
        )
        return schema.model_validate_json(resp.content)
```

```python
# backend/app/services/llm/anthropic_service.py
"""Anthropic Claude implementation."""

import anthropic
from .base import LLMService, LLMMessage, LLMResponse
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
import json


class AnthropicLLMService(LLMService):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.LLM_API_KEY)
        self.default_model = settings.LLM_DEFAULT_MODEL or "claude-sonnet-4-20250514"

    async def chat(self, messages, model=None, temperature=0.3,
                   max_tokens=4096, response_format=None):
        system_msgs = [m for m in messages if m.role == "system"]
        non_system = [m for m in messages if m.role != "system"]
        system_text = "\n".join(m.content for m in system_msgs) or None

        resp = await self.client.messages.create(
            model=model or self.default_model,
            system=system_text,
            messages=[{"role": m.role, "content": m.content} for m in non_system],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return LLMResponse(
            content=resp.content[0].text,
            model=resp.model,
            usage={"prompt_tokens": resp.usage.input_tokens,
                    "completion_tokens": resp.usage.output_tokens},
        )

    async def structured_extract(self, prompt, system_prompt, schema,
                                  model=None):
        enriched_system = (
            f"{system_prompt}\n\nYou MUST respond with valid JSON matching "
            f"this schema:\n{json.dumps(schema.model_json_schema(), indent=2)}"
        )
        messages = [
            LLMMessage(role="system", content=enriched_system),
            LLMMessage(role="user", content=prompt),
        ]
        resp = await self.chat(messages, model=model)
        return schema.model_validate_json(resp.content)
```

```python
# backend/app/services/llm/factory.py
"""Factory to instantiate the correct LLM backend from .env."""

from app.core.config import settings
from .base import LLMService


def get_llm_service() -> LLMService:
    provider = settings.LLM_PROVIDER.lower()  # "openai" | "anthropic" | "ollama" | "vllm"

    if provider in ("openai", "ollama", "vllm"):
        from .openai_service import OpenAILLMService
        return OpenAILLMService()
    elif provider == "anthropic":
        from .anthropic_service import AnthropicLLMService
        return AnthropicLLMService()
    raise ValueError(f"Unknown LLM provider: {provider}")
```

---

## 5. Manuscript Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : User uploads .docx
    DRAFT --> PARSED : Parsing engine completes
    PARSED --> EDITED : User verifies/edits metadata
    EDITED --> TARGET_SELECTED : User selects target journal
    TARGET_SELECTED --> CHECKLIST_PASSED : All preflight checks pass + human confirm
    TARGET_SELECTED --> TARGET_SELECTED : Preflight fails → user fixes
    CHECKLIST_PASSED --> EXPORTED : Document generation completes
    EXPORTED --> EDITED : User wants to re-edit
    EDITED --> PARSED : User re-triggers parsing
```

Transition rules are enforced server-side in `ManuscriptService.transition_status()`:

```python
VALID_TRANSITIONS = {
    "DRAFT":            ["PARSED"],
    "PARSED":           ["EDITED"],
    "EDITED":           ["TARGET_SELECTED", "PARSED"],
    "TARGET_SELECTED":  ["CHECKLIST_PASSED", "TARGET_SELECTED"],
    "CHECKLIST_PASSED": ["EXPORTED"],
    "EXPORTED":         ["EDITED"],
}
```

---

## 6. Complete File Tree

```text
swiss2/
├── backend/
│   ├── alembic/
│   │   ├── versions/                # Migration scripts
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── alembic.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app factory + CORS + lifespan
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py            # Pydantic Settings (.env loader)
│   │   │   ├── security.py          # JWT encode/decode, password hashing
│   │   │   └── deps.py              # FastAPI dependencies (get_db, get_current_user)
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py            # AsyncEngine + async sessionmaker
│   │   │   └── session.py           # get_async_session dependency
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py              # User SQLModel
│   │   │   ├── project.py           # Project SQLModel
│   │   │   ├── manuscript.py        # Manuscript + ExtractedMetadata SQLModels
│   │   │   ├── asset.py             # ManuscriptAsset SQLModel
│   │   │   ├── journal_template.py  # JournalTemplate + TemplateRule SQLModels
│   │   │   └── preflight.py         # PreflightResult + PreflightCheckItem SQLModels
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # TokenResponse, LoginRequest, RegisterRequest
│   │   │   ├── user.py              # UserRead, UserUpdate
│   │   │   ├── project.py           # ProjectCreate, ProjectRead, ProjectUpdate
│   │   │   ├── manuscript.py        # ManuscriptCreate, ManuscriptRead, ManuscriptUpdate
│   │   │   ├── manuscript_ir.py     # ManuscriptIR + nested models (Section 2 above)
│   │   │   ├── journal_template.py  # TemplateRead, TemplateList
│   │   │   └── preflight.py         # PreflightResultRead, CheckItemRead
│   │   ├── crud/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── journal_template.py
│   │   │   └── preflight.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py      # Registration, login, token refresh
│   │   │   ├── manuscript_service.py # Upload, status transitions, orchestration
│   │   │   ├── parsing/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── docling_parser.py # Docling → structured section tree, tables & figures
│   │   │   │   ├── metadata_extractor.py  # Heuristic + LLM metadata extraction
│   │   │   │   └── image_extractor.py     # Extract embedded images → storage
│   │   │   ├── preflight/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── checker.py       # Rule evaluation engine
│   │   │   │   └── rules/           # Individual rule implementations
│   │   │   │       ├── __init__.py
│   │   │   │       ├── word_count.py
│   │   │   │       ├── required_field.py
│   │   │   │       ├── abstract_format.py
│   │   │   │       └── reference_completeness.py
│   │   │   ├── docgen/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── generator.py     # Orchestrates .docx assembly
│   │   │   │   ├── formatters/      # Per-journal formatting logic
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── base_formatter.py
│   │   │   │   │   ├── nature_formatter.py
│   │   │   │   │   └── ieee_formatter.py
│   │   │   │   └── reference_formatter.py  # Citation style rendering
│   │   │   ├── storage/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py          # StorageService ABC
│   │   │   │   ├── s3_compatible.py # Bunny/MinIO/S3 implementation
│   │   │   │   └── factory.py       # get_storage_service()
│   │   │   └── llm/
│   │   │       ├── __init__.py
│   │   │       ├── base.py          # LLMService ABC
│   │   │       ├── openai_service.py
│   │   │       ├── anthropic_service.py
│   │   │       └── factory.py       # get_llm_service()
│   │   └── api/
│   │       ├── __init__.py
│   │       └── v1/
│   │           ├── __init__.py
│   │           ├── router.py        # Aggregates all endpoint routers
│   │           ├── endpoints/
│   │           │   ├── __init__.py
│   │           │   ├── auth.py      # POST /auth/register, /auth/login, /auth/refresh
│   │           │   ├── users.py     # GET /users/me, PATCH /users/me
│   │           │   ├── projects.py  # CRUD /projects
│   │           │   ├── manuscripts.py # Upload, get, list, update status, update metadata
│   │           │   ├── parsing.py   # POST /manuscripts/{id}/parse (trigger)
│   │           │   ├── journals.py  # GET /journals, GET /journals/{slug}
│   │           │   ├── preflight.py # POST /manuscripts/{id}/preflight, GET results
│   │           │   └── export.py    # POST /manuscripts/{id}/export, GET download
│   │           └── deps.py          # Route-level dependencies
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_manuscripts.py
│   │   ├── test_parsing.py
│   │   ├── test_preflight.py
│   │   └── test_export.py
│   ├── data/
│   │   └── seed/
│   │       └── journal_templates.json  # 5 baseline journal template configs
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Root layout (fonts, providers, theme)
│   │   │   ├── page.tsx             # Landing page
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx       # Sidebar + top-bar layout
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── projects/
│   │   │       │   ├── page.tsx     # Projects list
│   │   │       │   └── [id]/
│   │   │       │       ├── page.tsx # Project detail + manuscripts
│   │   │       │       └── manuscripts/
│   │   │       │           └── [mid]/
│   │   │       │               ├── page.tsx       # Manuscript overview
│   │   │       │               ├── editor/page.tsx    # Metadata editor
│   │   │       │               ├── journal/page.tsx   # Journal selection
│   │   │       │               ├── preflight/page.tsx # Preflight checklist
│   │   │       │               └── export/page.tsx    # Export & download
│   │   ├── components/
│   │   │   ├── ui/                  # Shadcn UI components
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── top-bar.tsx
│   │   │   │   └── page-header.tsx
│   │   │   ├── manuscripts/
│   │   │   │   ├── upload-dropzone.tsx
│   │   │   │   ├── status-badge.tsx
│   │   │   │   ├── metadata-form.tsx
│   │   │   │   ├── section-tree-editor.tsx
│   │   │   │   ├── reference-list-editor.tsx
│   │   │   │   └── author-table.tsx
│   │   │   ├── journals/
│   │   │   │   ├── journal-card.tsx
│   │   │   │   └── journal-selector.tsx
│   │   │   └── preflight/
│   │   │       ├── checklist-panel.tsx
│   │   │       └── check-item-row.tsx
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios/fetch wrapper + interceptors
│   │   │   ├── auth.ts              # Token storage, refresh logic
│   │   │   ├── utils.ts             # cn() helper + misc
│   │   │   └── types.ts             # TypeScript types mirroring backend schemas
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-manuscripts.ts
│   │   │   └── use-preflight.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yaml              # PostgreSQL + Backend + Frontend
├── .env.example                     # Root-level env template
└── README.md
```

---

## 7. Step-by-Step Execution Modules

Each module is a self-contained unit with **Prerequisites**, **Files to Create/Modify**, **API Endpoints**, **Inputs/Outputs**, and **Verification Steps**.

---

### Module 1: Project Scaffolding & Database Foundation

> **Goal**: Set up both repos, PostgreSQL connection, Alembic migrations, and the `users` + `projects` tables.

#### Prerequisites
- Python 3.11+, Node.js 20+, Docker & Docker Compose installed

#### Tasks
1. **Initialize backend**
   ```bash
   mkdir -p backend && cd backend
   # Create pyproject.toml with dependencies:
   # fastapi, uvicorn[standard], sqlmodel, asyncpg, alembic,
   # python-jose[cryptography], passlib[bcrypt], pydantic-settings,
   # boto3, python-docx, mammoth, docxcompose, docling, openai, anthropic,
   # python-multipart, httpx, pytest, pytest-asyncio
   ```

2. **Initialize frontend**
   ```bash
   npx -y create-next-app@latest ./frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   cd frontend && npx -y shadcn@latest init -d
   ```

3. **Create `docker-compose.yaml`** with PostgreSQL 16 service

4. **Create backend files**:
   - `app/core/config.py` — `Settings(BaseSettings)` loading from `.env`
   - `app/db/engine.py` — `create_async_engine` with `asyncpg`
   - `app/db/session.py` — `get_async_session` async generator
   - `app/models/user.py` — `User` SQLModel table
   - `app/models/project.py` — `Project` SQLModel table
   - `app/main.py` — FastAPI app with CORS, lifespan

5. **Initialize Alembic**
   ```bash
   alembic init alembic
   # Configure env.py to use async engine and import all models
   alembic revision --autogenerate -m "create users and projects"
   alembic upgrade head
   ```

#### Key API Endpoints (None yet — database-only module)

#### Verification
```bash
docker compose up -d db
alembic upgrade head  # Tables created without errors
python -c "from app.models.user import User; print('Models OK')"
```

---

### Module 2: Authentication & User Management

> **Goal**: JWT auth flow — register, login, token refresh, `GET /users/me`.

#### Files to Create
| File | Purpose |
|------|---------|
| `app/core/security.py` | `create_access_token()`, `verify_password()`, `get_password_hash()` |
| `app/core/deps.py` | `get_current_user()` FastAPI dependency |
| `app/schemas/auth.py` | `RegisterRequest`, `LoginRequest`, `TokenResponse` |
| `app/schemas/user.py` | `UserRead`, `UserUpdate` |
| `app/crud/user.py` | `create_user()`, `get_user_by_email()`, `get_user_by_id()` |
| `app/services/auth_service.py` | `register()`, `authenticate()`, `refresh_token()` |
| `app/api/v1/endpoints/auth.py` | Auth routes |
| `app/api/v1/endpoints/users.py` | User profile routes |
| `app/api/v1/router.py` | V1 aggregate router |

#### API Endpoints

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| `POST` | `/api/v1/auth/register` | No | `RegisterRequest` | `TokenResponse` |
| `POST` | `/api/v1/auth/login` | No | `OAuth2PasswordRequestForm` | `TokenResponse` |
| `POST` | `/api/v1/auth/refresh` | Bearer | — | `TokenResponse` |
| `GET` | `/api/v1/users/me` | Bearer | — | `UserRead` |
| `PATCH` | `/api/v1/users/me` | Bearer | `UserUpdate` | `UserRead` |

#### Verification
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!","full_name":"Test User"}'

# Login and use token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=test@test.com&password=Test1234!" | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/users/me
```

---

### Module 3: Project CRUD & Manuscript Upload

> **Goal**: Full project CRUD, secure .docx upload to Bunny.net/S3, and the `manuscripts` + `manuscript_assets` tables.

#### Files to Create
| File | Purpose |
|------|---------|
| `app/models/manuscript.py` | `Manuscript`, `ExtractedMetadata` SQLModels |
| `app/models/asset.py` | `ManuscriptAsset` SQLModel |
| `app/schemas/project.py` | CRUD schemas |
| `app/schemas/manuscript.py` | `ManuscriptCreate`, `ManuscriptRead` |
| `app/crud/project.py` | Project CRUD operations |
| `app/crud/manuscript.py` | Manuscript CRUD operations |
| `app/services/storage/*` | Storage abstraction (Section 3 above) |
| `app/services/manuscript_service.py` | Upload orchestration + status transitions |
| `app/api/v1/endpoints/projects.py` | Project routes |
| `app/api/v1/endpoints/manuscripts.py` | Manuscript routes |

#### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/projects` | Bearer | Create project |
| `GET` | `/api/v1/projects` | Bearer | List user's projects |
| `GET` | `/api/v1/projects/{id}` | Bearer | Get project detail |
| `PATCH` | `/api/v1/projects/{id}` | Bearer | Update project |
| `DELETE` | `/api/v1/projects/{id}` | Bearer | Soft-delete / archive |
| `POST` | `/api/v1/projects/{id}/manuscripts` | Bearer | Upload .docx (multipart) |
| `GET` | `/api/v1/projects/{id}/manuscripts` | Bearer | List manuscripts in project |
| `GET` | `/api/v1/manuscripts/{id}` | Bearer | Get manuscript detail |

#### Upload Flow
```
Client → POST multipart/form-data (.docx file)
    → ManuscriptService.upload()
        → Validate file type (.docx only)
        → Generate storage key: manuscripts/{user_id}/{project_id}/{uuid}/{filename}
        → StorageService.upload() → Bunny.net
        → Create Manuscript record (status=DRAFT)
        → Return ManuscriptRead
```

#### Verification
```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Paper","description":"Test project"}'

curl -X POST http://localhost:8000/api/v1/projects/{project_id}/manuscripts \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@manuscript.docx"
```

---

### Module 4: Parsing Engine & Metadata Extraction

> **Goal**: Parse uploaded .docx into the ManuscriptIR schema using Docling, extract embedded figures/tables, and populate `extracted_metadata`.

#### Parsing Engine: Docling Integration Overview
- **Backend**: [Docling](https://github.com/docling-project/docling) (IBM Research / LF AI & Data Foundation, MIT License).
- **Runtime**: In-process Python library (`pip install docling`) — runs CPU-only, no external microservice, no external API keys or GPU required for DOCX parsing (reads native document structure).
- **Capabilities**: Preserves heading hierarchy, extracts structured tables (with TableFormer recognition), and captures embedded figures with bounding boxes and captions.
- **Future-Proofing / PDF Support**: If the project later needs to support scanned or PDF manuscripts, Docling natively handles them via its PDF pipeline and optional OCR backends (EasyOCR/Tesseract/RapidOCR) using the exact same `DocumentConverter` API and `DoclingDocument` representation without requiring pipeline rearchitecture.

#### Files to Create
| File | Purpose |
|------|---------|
| `app/schemas/manuscript_ir.py` | Full IR schema (Section 2 above) |
| `app/services/parsing/docling_parser.py` | Document parsing, heading hierarchy, table & figure extraction via `Docling` |
| `app/services/parsing/metadata_extractor.py` | Heuristic + optional LLM metadata extraction operating on structured tree |
| `app/services/parsing/image_extractor.py` | Upload Docling-extracted pictures/figures → `ManuscriptAsset` records in storage |
| `app/services/llm/*` | LLM abstraction (Section 4 above) |
| `app/api/v1/endpoints/parsing.py` | Trigger parsing route |

#### Parsing Pipeline

```
POST /api/v1/manuscripts/{id}/parse
    → ManuscriptService.parse()
        1. StorageService.download(manuscript.storage_key) → raw bytes
        2. DoclingParser.parse(bytes) → DoclingParseResult (SectionNode[] tree, pictures, tables, markdown, raw JSON dict)
        3. ImageExtractor.extract(docling_result.pictures, manuscript_id) → ManuscriptAsset[] (uploaded to storage)
        4. MetadataExtractor.extract(docling_result.sections)
            a. Heuristic pass: regex-based title/author/keyword detection on structured tree
            b. LLM pass (if heuristics insufficient): structured extraction
        5. Build ManuscriptIR object
        6. Save to extracted_metadata table + raw_parsed_json on manuscript
        7. Transition status DRAFT → PARSED
        → Return ManuscriptIR
```

#### DoclingParser Core Logic
```python
import io
import os
import tempfile
from dataclasses import dataclass, field
from typing import Optional, Any
from pathlib import Path
from docling.document_converter import DocumentConverter
from app.schemas.manuscript_ir import SectionNode

@dataclass
class ExtractedPictureItem:
    index: int
    image_bytes: bytes
    mime_type: str = "image/png"
    caption: Optional[str] = None
    original_filename: Optional[str] = None
    bounding_box: Optional[dict[str, Any]] = None
    provenance: Optional[dict[str, Any]] = None

@dataclass
class DoclingParseResult:
    sections: list[SectionNode] = field(default_factory=list)
    pictures: list[ExtractedPictureItem] = field(default_factory=list)
    tables: list[dict[str, Any]] = field(default_factory=list)
    full_markdown: str = ""
    raw_dict: dict[str, Any] = field(default_factory=dict)

class DoclingParser:
    """
    Parses scientific manuscripts using Docling into a structured SectionNode tree,
    extracting embedded figures and structured tables.
    Runs in-process — no separate service, external API, or GPU required for DOCX.
    """
    def __init__(self, converter: Optional[DocumentConverter] = None):
        self.converter = converter or DocumentConverter()

    def parse(self, file_bytes: bytes, filename: str = "manuscript.docx") -> DoclingParseResult:
        suffix = Path(filename).suffix if Path(filename).suffix else ".docx"
        temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        try:
            temp_file.write(file_bytes)
            temp_file.flush()
            temp_file.close()

            conversion_result = self.converter.convert(temp_file.name)
        finally:
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)

        doc = conversion_result.document
        full_markdown = doc.export_to_markdown() if hasattr(doc, "export_to_markdown") else ""
        raw_dict = doc.export_to_dict() if hasattr(doc, "export_to_dict") else {}

        # 1. Build SectionNode hierarchy tree
        root_sections: list[SectionNode] = []
        stack: list[SectionNode] = []

        for item, level in doc.iterate_items():
            item_type = item.__class__.__name__
            label = str(getattr(item, "label", "")).lower()

            if "heading" in label or "header" in label or item_type == "SectionHeaderItem":
                heading_text = getattr(item, "text", "").strip()
                if not heading_text:
                    continue

                heading_level = getattr(item, "level", None)
                if heading_level is None or not isinstance(heading_level, int) or heading_level < 1:
                    heading_level = max(1, min(6, level if isinstance(level, int) else 1))

                node = SectionNode(heading=heading_text, level=heading_level, content=[], children=[])

                while stack and stack[-1].level >= heading_level:
                    stack.pop()

                if stack:
                    stack[-1].children.append(node)
                else:
                    root_sections.append(node)
                stack.append(node)

            elif "paragraph" in label or "text" in label or item_type in ("TextItem", "ParagraphItem", "ListItem"):
                text_content = getattr(item, "text", "").strip()
                if not text_content:
                    continue

                if stack:
                    stack[-1].content.append(text_content)
                else:
                    if not root_sections or root_sections[0].heading != "__preamble__":
                        root_sections.insert(0, SectionNode(heading="__preamble__", level=0, content=[], children=[]))
                    root_sections[0].content.append(text_content)

            elif "table" in label or item_type == "TableItem":
                table_md = item.export_to_markdown() if hasattr(item, "export_to_markdown") else ""
                caption = getattr(item.caption, "text", str(item.caption)).strip() if getattr(item, "caption", None) else ""
                table_entry = f"[Table: {caption}]\n{table_md}" if caption else table_md
                if table_entry.strip():
                    if stack:
                        stack[-1].content.append(table_entry)
                    else:
                        if not root_sections or root_sections[0].heading != "__preamble__":
                            root_sections.insert(0, SectionNode(heading="__preamble__", level=0, content=[], children=[]))
                        root_sections[0].content.append(table_entry)

        # 2. Extract Pictures / Figures
        pictures: list[ExtractedPictureItem] = []
        pic_idx = 0
        for item, _ in doc.iterate_items():
            if "picture" in str(getattr(item, "label", "")).lower() or item.__class__.__name__ == "PictureItem":
                pic_idx += 1
                caption = getattr(item.caption, "text", str(item.caption)).strip() if getattr(item, "caption", None) else None
                image_bytes = b""
                try:
                    pil_img = item.get_image(doc) if hasattr(item, "get_image") else getattr(getattr(item, "image", None), "pil_image", None)
                    if pil_img and hasattr(pil_img, "save"):
                        buf = io.BytesIO()
                        pil_img.save(buf, format="PNG")
                        image_bytes = buf.getvalue()
                except Exception:
                    pass

                pictures.append(ExtractedPictureItem(
                    index=pic_idx,
                    image_bytes=image_bytes,
                    caption=caption,
                    original_filename=f"figure_{pic_idx}.png"
                ))

        return DoclingParseResult(
            sections=root_sections,
            pictures=pictures,
            tables=[],
            full_markdown=full_markdown,
            raw_dict=raw_dict
        )
```

#### Verification
```bash
# Trigger parsing
curl -X POST http://localhost:8000/api/v1/manuscripts/{id}/parse \
  -H "Authorization: Bearer $TOKEN"

# Verify parsed data
curl http://localhost:8000/api/v1/manuscripts/{id} \
  -H "Authorization: Bearer $TOKEN" | jq '.extracted_metadata'
```

---

### Module 5: Metadata Editor UI (Frontend Core)

> **Goal**: Build the Next.js frontend with auth, dashboard, project management, and the inline metadata editor.

#### Key Frontend Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Axios client with JWT interceptor + refresh |
| `src/lib/auth.ts` | Token management (localStorage + context) |
| `src/lib/types.ts` | TS types mirroring all backend schemas |
| `src/hooks/use-auth.ts` | Auth context provider + hooks |
| `src/hooks/use-manuscripts.ts` | SWR/React Query hooks for manuscript data |
| `src/app/(auth)/login/page.tsx` | Login form |
| `src/app/(auth)/register/page.tsx` | Registration form |
| `src/app/(dashboard)/layout.tsx` | Dashboard shell (sidebar + topbar) |
| `src/app/(dashboard)/dashboard/page.tsx` | Overview with stats |
| `src/app/(dashboard)/projects/page.tsx` | Project list + create |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Project detail + manuscripts |
| `src/components/manuscripts/upload-dropzone.tsx` | Drag-and-drop .docx upload |
| `src/components/manuscripts/metadata-form.tsx` | Inline editing of ManuscriptIR fields |
| `src/components/manuscripts/section-tree-editor.tsx` | Recursive tree editor for sections |
| `src/components/manuscripts/reference-list-editor.tsx` | Reference inline editing |
| `src/components/manuscripts/author-table.tsx` | Author/affiliation editing table |
| `src/components/manuscripts/status-badge.tsx` | Color-coded status indicator |

#### Metadata Editor UX Flow
```
1. User navigates to /projects/{id}/manuscripts/{mid}/editor
2. Frontend fetches ManuscriptIR from GET /manuscripts/{mid}
3. Renders editable form with collapsible sections:
   ┌─ Title (text input)
   ├─ Authors (sortable table with add/remove)
   ├─ Affiliations (indexed list editor)
   ├─ Abstract (textarea with live word count)
   ├─ Keywords (tag input)
   ├─ Sections (recursive tree — expand/collapse/reorder)
   ├─ References (numbered list with structured field editing)
   ├─ Funding (repeatable group)
   ├─ Statements (COI, Ethics, Data Availability — textareas)
   └─ Save button → PATCH /manuscripts/{mid}/metadata
4. On save → backend validates against ManuscriptIR schema
5. Status transitions PARSED → EDITED
```

#### API Endpoints (Backend additions for this module)

| Method | Path | Description |
|--------|------|-------------|
| `PATCH` | `/api/v1/manuscripts/{id}/metadata` | Update extracted metadata (ManuscriptIR body) |
| `GET` | `/api/v1/manuscripts/{id}/assets` | List extracted images/assets |

#### Verification
- Frontend builds without errors: `npm run build`
- Login → Create project → Upload .docx → Trigger parse → Edit metadata → Save
- Verify PATCH request sends valid ManuscriptIR JSON

---

### Module 6: Journal Templates & Selection

> **Goal**: Seed 5 journal templates, build selection UI, and implement the `TARGET_SELECTED` transition.

#### Journal Template Seed Data (5 Baselines)

| Journal | Slug | Abstract Limit | Citation Style | Key Requirements |
|---------|------|---------------|----------------|-----------------|
| Nature | `nature` | 200 words | Superscript numbered | Ethics, COI, Data Availability, Author Contributions required |
| IEEE Transactions | `ieee-trans` | 250 words | Bracketed [1] | Two-column, structured abstract optional |
| Radiology | `radiology` | 250 words | Superscript numbered | Structured abstract (Purpose/Methods/Results/Conclusion) |
| MIDL | `midl` | 200 words | Author-Year (Harvard) | 8-page limit, specific heading structure |
| Medical Image Analysis | `media` | 400 words | Numbered | Highlights section, graphical abstract recommended |

#### Files to Create
| File | Purpose |
|------|---------|
| `app/models/journal_template.py` | `JournalTemplate`, `TemplateRule` SQLModels |
| `app/schemas/journal_template.py` | Read schemas |
| `app/crud/journal_template.py` | CRUD operations |
| `data/seed/journal_templates.json` | Seed data for 5 journals |
| `app/api/v1/endpoints/journals.py` | Journal listing + detail routes |
| Frontend: `src/components/journals/journal-card.tsx` | Visual journal card |
| Frontend: `src/components/journals/journal-selector.tsx` | Selection grid |
| Frontend: `src/app/(dashboard)/.../journal/page.tsx` | Journal selection page |

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/journals` | List all active journal templates |
| `GET` | `/api/v1/journals/{slug}` | Get template detail + rules |
| `PATCH` | `/api/v1/manuscripts/{id}/target-journal` | Set target journal → status = `TARGET_SELECTED` |

#### Verification
```bash
# Seed journals
python -m app.scripts.seed_journals

# List
curl http://localhost:8000/api/v1/journals -H "Authorization: Bearer $TOKEN"

# Select target
curl -X PATCH http://localhost:8000/api/v1/manuscripts/{id}/target-journal \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"journal_slug":"nature"}'
```

---

### Module 7: Preflight Checklist Engine

> **Goal**: Rule-based pre-submission checker with automated + human-confirmed verification.

#### Rule Engine Architecture

```python
# app/services/preflight/checker.py
class PreflightChecker:
    def __init__(self, rules: list[TemplateRule]):
        self.rule_handlers = {
            "word_count": WordCountRule,
            "required_field": RequiredFieldRule,
            "abstract_format": AbstractFormatRule,
            "reference_completeness": ReferenceCompletenessRule,
            "regex": RegexRule,
            "presence": PresenceRule,
        }

    async def run(self, ir: ManuscriptIR, template: JournalTemplate) -> PreflightResult:
        items = []
        for rule in template.rules:
            handler = self.rule_handlers[rule.rule_type](rule)
            result = handler.evaluate(ir)
            items.append(PreflightCheckItem(
                rule_id=rule.id,
                status=result.status,
                message=result.message,
                details=result.details,
            ))
        overall = "FAIL" if any(i.status == "FAIL" for i in items) \
                  else "WARN" if any(i.status == "WARN" for i in items) \
                  else "PASS"
        return PreflightResult(overall_status=overall, items=items)
```

#### Example Rule Implementation
```python
# app/services/preflight/rules/word_count.py
class WordCountRule:
    def __init__(self, rule: TemplateRule):
        self.max_words = rule.rule_config.get("max_words")
        self.field = rule.rule_config.get("field", "total")  # "total" | "abstract"

    def evaluate(self, ir: ManuscriptIR) -> CheckResult:
        if self.field == "abstract":
            count = len(ir.abstract.split())
        else:
            count = ir.word_count

        if count > self.max_words:
            return CheckResult(
                status="FAIL",
                message=f"{self.field.title()} word count ({count}) exceeds limit ({self.max_words})",
                details={"count": count, "limit": self.max_words},
            )
        elif count > self.max_words * 0.9:
            return CheckResult(
                status="WARN",
                message=f"{self.field.title()} word count ({count}) is near limit ({self.max_words})",
                details={"count": count, "limit": self.max_words},
            )
        return CheckResult(status="PASS", message=f"{self.field.title()} word count OK ({count}/{self.max_words})")
```

#### Files to Create
| File | Purpose |
|------|---------|
| `app/models/preflight.py` | `PreflightResult`, `PreflightCheckItem` SQLModels |
| `app/schemas/preflight.py` | Read schemas |
| `app/crud/preflight.py` | CRUD operations |
| `app/services/preflight/checker.py` | Rule evaluation engine |
| `app/services/preflight/rules/*.py` | Individual rule implementations |
| `app/api/v1/endpoints/preflight.py` | Preflight routes |
| Frontend: `src/components/preflight/checklist-panel.tsx` | Checklist UI |
| Frontend: `src/components/preflight/check-item-row.tsx` | Individual check row |
| Frontend: `src/app/(dashboard)/.../preflight/page.tsx` | Preflight page |

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/manuscripts/{id}/preflight` | Run preflight checks |
| `GET` | `/api/v1/manuscripts/{id}/preflight` | Get latest preflight result |
| `POST` | `/api/v1/manuscripts/{id}/preflight/confirm` | Human confirmation → status = `CHECKLIST_PASSED` |

#### Frontend Checklist UX
```
┌──────────────────────────────────────────────────────────┐
│  Pre-flight Submission Checklist — Nature                │
├──────────────────────────────────────────────────────────┤
│  ✅ PASS  Abstract word count (187/200)                  │
│  ✅ PASS  Ethics statement present                       │
│  ⚠️ WARN  Word count near limit (4,850/5,000)            │
│  ❌ FAIL  Missing Data Availability statement            │
│  ✅ PASS  Conflict of interest declared                  │
│  ✅ PASS  All references have titles                     │
│  ☐ PASS  Author contributions present                   │
├──────────────────────────────────────────────────────────┤
│  Overall: ❌ FAIL — Resolve all FAIL items               │
│                                                          │
│  [ ] I confirm all items have been reviewed              │
│  [Confirm & Proceed]  (disabled until all PASS/ACK)     │
└──────────────────────────────────────────────────────────┘
```

#### Verification
```bash
# Run preflight
curl -X POST http://localhost:8000/api/v1/manuscripts/{id}/preflight \
  -H "Authorization: Bearer $TOKEN" | jq '.overall_status'

# Confirm
curl -X POST http://localhost:8000/api/v1/manuscripts/{id}/preflight/confirm \
  -H "Authorization: Bearer $TOKEN"
```

---

### Module 8: Document Generation Engine

> **Goal**: Generate a perfectly formatted, journal-compliant .docx from ManuscriptIR + JournalTemplate.

#### Generator Architecture

```python
# app/services/docgen/generator.py
class DocumentGenerator:
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.formatters = {
            "nature": NatureFormatter,
            "ieee-trans": IEEEFormatter,
            "radiology": RadiologyFormatter,
            "midl": MIDLFormatter,
            "media": MediaFormatter,
        }

    async def generate(self, manuscript: Manuscript,
                       ir: ManuscriptIR,
                       template: JournalTemplate) -> str:
        formatter = self.formatters[template.slug]()
        doc = Document()  # python-docx

        # 1. Apply base formatting (margins, font, spacing)
        formatter.apply_document_style(doc, template.formatting_rules)

        # 2. Build title page
        formatter.build_title_page(doc, ir, template.title_page_layout)

        # 3. Build abstract
        formatter.build_abstract(doc, ir)

        # 4. Build main body sections (recursive)
        formatter.build_sections(doc, ir.sections)

        # 5. Build references
        ref_formatter = ReferenceFormatter(template.reference_format)
        formatter.build_references(doc, ir.references, ref_formatter)

        # 6. Build required statements
        formatter.build_statements(doc, ir, template.required_statements)

        # 7. Save to buffer → upload to storage
        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)

        output_key = f"exports/{manuscript.id}/{template.slug}_{datetime.utcnow().isoformat()}.docx"
        url = await self.storage.upload(output_key, buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

        return output_key
```

#### Base Formatter Interface
```python
# app/services/docgen/formatters/base_formatter.py
class BaseFormatter(ABC):
    @abstractmethod
    def apply_document_style(self, doc: Document, rules: dict): ...

    @abstractmethod
    def build_title_page(self, doc: Document, ir: ManuscriptIR, layout: dict): ...

    @abstractmethod
    def build_abstract(self, doc: Document, ir: ManuscriptIR): ...

    def build_sections(self, doc: Document, sections: list[SectionNode]):
        """Default recursive section builder — override for custom behavior."""
        for section in sections:
            doc.add_heading(section.heading, level=min(section.level, 4))
            for para_text in section.content:
                doc.add_paragraph(para_text)
            self.build_sections(doc, section.children)

    @abstractmethod
    def build_references(self, doc, refs, ref_formatter): ...

    @abstractmethod
    def build_statements(self, doc, ir, required): ...
```

#### Files to Create
| File | Purpose |
|------|---------|
| `app/services/docgen/generator.py` | Orchestrator |
| `app/services/docgen/formatters/base_formatter.py` | ABC for formatters |
| `app/services/docgen/formatters/nature_formatter.py` | Nature-specific formatting |
| `app/services/docgen/formatters/ieee_formatter.py` | IEEE-specific formatting |
| `app/services/docgen/reference_formatter.py` | Citation style rendering |
| `app/api/v1/endpoints/export.py` | Export routes |
| Frontend: `src/app/(dashboard)/.../export/page.tsx` | Export page |

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/manuscripts/{id}/export` | Trigger document generation |
| `GET` | `/api/v1/manuscripts/{id}/export/download` | Get presigned download URL |
| `GET` | `/api/v1/manuscripts/{id}/export/status` | Check generation status |

#### Verification
```bash
# Trigger export
curl -X POST http://localhost:8000/api/v1/manuscripts/{id}/export \
  -H "Authorization: Bearer $TOKEN"

# Download
curl http://localhost:8000/api/v1/manuscripts/{id}/export/download \
  -H "Authorization: Bearer $TOKEN" -o output.docx

# Open output.docx and verify formatting matches target journal
```

---

## 8. Phase 2 Extension Points

These features are designed into the architecture but implemented after Phase 1 MVP is stable.

| Feature | Service Location | Dependencies |
|---------|-----------------|--------------|
| AI Cover Letter | `app/services/ai/cover_letter.py` | `LLMService`, `ManuscriptIR`, `JournalTemplate` |
| AI Novelty Statement | `app/services/ai/novelty.py` | `LLMService`, `ManuscriptIR` |
| Journal Recommendation | `app/services/ai/journal_recommender.py` | `LLMService`, `ManuscriptIR`, all `JournalTemplate`s |
| Reference Validation | `app/services/validation/reference_validator.py` | CrossRef API, DOI.org API |
| Metadata Validation | `app/services/validation/metadata_validator.py` | Heuristic rules + `LLMService` |
| Completeness Checker | `app/services/validation/completeness_checker.py` | Combines preflight + reference + metadata checks |
| Reviewer Recommendation | `app/services/ai/reviewer_recommender.py` | `LLMService`, Semantic Scholar API |

Each Phase 2 feature follows the same pattern:
1. New service in `app/services/ai/` or `app/services/validation/`
2. New API endpoint in `app/api/v1/endpoints/`
3. New frontend component + page
4. Database table if state persistence is needed

---

## 9. Environment Variables Reference

```env
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/swiss2
DATABASE_ECHO=false

# ── Authentication ────────────────────────────────────────
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Storage ───────────────────────────────────────────────
STORAGE_PROVIDER=bunny           # bunny | minio | s3
STORAGE_ENDPOINT_URL=https://de-s3.storage.bunnycdn.com
STORAGE_ACCESS_KEY=your-zone-name
STORAGE_SECRET_KEY=your-api-password
STORAGE_BUCKET_NAME=your-zone-name
STORAGE_REGION=de
STORAGE_CDN_URL=https://your-zone.b-cdn.net

# ── LLM ──────────────────────────────────────────────────
LLM_PROVIDER=openai              # openai | anthropic | ollama | vllm
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.openai.com/v1  # or http://localhost:11434/v1 for Ollama
LLM_DEFAULT_MODEL=gpt-4o

# ── App ───────────────────────────────────────────────────
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

---

## 10. Recommended Build Order & Time Estimates

| Order | Module | Est. Effort | Cumulative |
|-------|--------|-------------|------------|
| 1 | Scaffolding & Database | 4–6 hrs | 4–6 hrs |
| 2 | Auth & User Management | 4–6 hrs | 8–12 hrs |
| 3 | Projects & Upload | 6–8 hrs | 14–20 hrs |
| 4 | Parsing Engine | 8–12 hrs | 22–32 hrs |
| 5 | Frontend (Auth + Dashboard + Editor) | 12–16 hrs | 34–48 hrs |
| 6 | Journal Templates | 6–8 hrs | 40–56 hrs |
| 7 | Preflight Checker | 6–8 hrs | 46–64 hrs |
| 8 | Document Generation | 10–14 hrs | 56–78 hrs |

**Total MVP Estimate**: ~56–78 developer-hours (1.5–2 weeks at full intensity)

> [!IMPORTANT]
> Each module is designed to be independently testable. Complete Module N's verification steps before starting Module N+1. This prevents cascading issues and keeps the codebase stable at every step.

> [!TIP]
> Start with Modules 1–4 (backend core) before touching the frontend. The backend APIs serve as the contract that the frontend codes against. Having working APIs first eliminates frontend guesswork.
