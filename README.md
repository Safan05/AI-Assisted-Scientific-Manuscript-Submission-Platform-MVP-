# AI-Assisted Scientific Manuscript Submission Platform

An end-to-end full-stack web platform designed to automate scientific manuscript parsing, journal-agnostic JSON transformation, metadata extraction, human verification, target journal pre-flight checking, and output document generation (`.docx`).

---

## 📊 Executive Audit & Progress Summary

| Module | Status | Highlights |
| :--- | :---: | :--- |
| **Module 1: Scaffolding & Database** | ✅ Completed | FastAPI, SQLModel, Asyncpg, Alembic, Next.js 15/16, Shadcn UI, Neon DB setup |
| **Module 2: Auth & User Management** | ✅ Completed | JWT Auth (OAuth2 Bearer), bcrypt hashing, `GET/PATCH /users/me`, router guards |
| **Module 3: Project CRUD & Storage** | ✅ Completed | Project lifecycle, secure `.docx` upload, `StorageService` abstraction (Bunny.net/S3/Local) |
| **Module 4: Manuscript Parsing Engine** | ✅ Completed | `Docling` parsing backend, `ImageExtractor`, `MetadataExtractor` (heuristic + LLM), 4 API endpoints |
| **Module 5: Frontend UI & Metadata Editor** | ✅ Completed | Swiss Typographic System, Auth, Dashboard, Projects, Dropzone, Recursive Section Tree & Citation Editor |
| **Module 6: Journal Templates & Selection** | ✅ Completed | CRUD for `journal_templates` & `template_rules`, seeded Nature & PLOS ONE standards with primary sources, Swiss selector UI |
| **Module 7: Pre-flight Checklist** | ⏳ Pending | Rule-based automated pre-submission health checker + human overrides |
| **Module 8: Document Generator** | ⏳ Pending | Journal-compliant target `.docx` builder using `python-docx` |

---

## 🛠️ Tech Stack & Architecture

### Frontend (Swiss / International Typographic Style)
- **Framework**: Next.js 16 (App Router, TypeScript, `src/` directory layout)
- **Design System**: Strict Swiss / International Typographic Style:
  - **Colors**: Near-white canvas (`#FAFAFA`), ink black (`#111111`), signal red (`#D0021B`) for active states & primary CTAs only, hairlines (`#E0E0E0`), secondary (`#707070`).
  - **Typography**: Inter (Grotesque UI) + JetBrains Mono (numerical stats, word counts, citations, IDs).
  - **Signature Badge**: Monospace bracketed status codes: `[ 01 · DRAFT ]`, `[ 02 · PARSED ]`, `[ 03 · EDITED ]`, `[ 04 · TARGET_SELECTED ]`.
  - **Grid & Lines**: 12-col layout with 1px hairline rules instead of soft shadows or heavy cards. Sharp corners (`radius: 2px`).
- **State & Data**: TanStack React Query + Axios JWT Interceptors.

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Models**: SQLModel / SQLAlchemy (Async Engine via `asyncpg`)
- **Migrations**: Alembic (Configured for async PostgreSQL and SQLModel metadata auto-generation)
- **Authentication**: JWT Tokens (OAuth2 Password Bearer flow) with `passlib` (bcrypt)
- **Database**: PostgreSQL (Connected to cloud Neon Postgres instance)
- **Document Parsing**: [Docling](https://github.com/docling-project/docling) (IBM Research / LF AI & Data Foundation, MIT License) — in-process, CPU-only, no GPU or external API required for DOCX

### Core Abstractions
1. **`StorageService`** (`app/services/storage/`): Abstract interface wrapping both S3-compatible cloud storage (Bunny.net, MinIO, AWS S3) and a **`LocalStorage` driver** (`STORAGE_PROVIDER=local`) for offline local development storing files in `data/storage/`.
2. **`LLMService`** (`app/services/llm/`): Abstract interface supporting OpenAI API, Anthropic Claude, and local models (Ollama / vLLM on DGX). Switch via `LLM_PROVIDER` env var — no code changes required.
3. **`ManuscriptIR`** (`app/schemas/manuscript_ir.py`): Journal-agnostic internal JSON representation schema for manuscripts.
4. **`DoclingParser`** (`app/services/parsing/docling_parser.py`): Docling-backed parser producing structured `SectionNode` trees, extracting embedded figures with captions, and parsing tables via TableFormer.
5. **`JournalTemplate` & `TemplateRule`** (`app/models/journal_template.py`): Schema-driven target journal specifications with validation rule configs.

---

## 🏛️ Module 6 — Journal Standards & Seed Data

Two distinct journal profiles are seeded with primary author guideline sources to ensure Module 7's preflight rule evaluation genuinely discriminates between different publication standards:

### 1. **Nature** (`slug: nature`) — Restrictive, Structured
*Primary Source: [nature.com/nature/for-authors/initial-submission](https://www.nature.com/nature/for-authors/initial-submission)*
- **Abstract Limit**: 200 words (fully referenced summary paragraph; hard `FAIL` if exceeded).
- **Main Text Budget**: 2,500 words for standard 6-page article (`WARN` if exceeded).
- **Mandatory Disclosures**: Competing Interests Statement (`FAIL` if absent).
- **Reference Guideline**: Max ~50 references (`WARN` if exceeded).
- **Formatting**: LaTeX/MathType numbered equations only (never images), line numbers required on all pages.

### 2. **PLOS ONE** (`slug: plos-one`) — Open, Reproducibility-Focused
*Primary Source: [journals.plos.org/plosone/s/submission-guidelines](https://journals.plos.org/plosone/s/submission-guidelines) & [Data Availability Policy](https://journals.plos.org/plosone/s/data-availability)*
- **Abstract Limit**: 300 words (unstructured single-paragraph; hard `FAIL` if exceeded).
- **Main Text Budget**: `null` — **No word limit** on main text.
- **Mandatory Disclosures**: Data Availability Statement with repository links or accession numbers (`FAIL` if absent).
- **Formatting Rules**: Abstract must contain **no citations** (`WARN` regex check). Bracketed citation numbers `[1]`, not superscripts.

---

## 📂 Codebase File Tree

```text
swiss2/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── manuscripts.py
│   │   │   │   ├── parsing.py
│   │   │   │   ├── journals.py     ⭐ CRUD for journal_templates & rules
│   │   │   │   └── storage.py
│   │   │   └── router.py
│   │   ├── crud/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── asset.py
│   │   │   ├── extracted_metadata.py
│   │   │   └── journal_template.py ⭐ CRUD repository for templates & rules
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── asset.py
│   │   │   └── journal_template.py
│   │   ├── schemas/
│   │   │   ├── manuscript_ir.py
│   │   │   ├── asset.py
│   │   │   └── journal_template.py ⭐ Pydantic schemas for templates & rules
│   │   ├── services/
│   │   │   ├── template_seeder.py  ⭐ Authoritative Nature & PLOS ONE seeder
│   │   │   ├── manuscript_service.py
│   │   │   ├── storage/
│   │   │   ├── llm/
│   │   │   └── parsing/
│   │   └── main.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── manuscripts/
│   │   │   │   │           └── [mid]/
│   │   │   │   │               ├── editor/page.tsx
│   │   │   │   │               └── journal/page.tsx ⭐ Dedicated Journal Selector
│   │   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── journals/
│   │   │   │   └── journal-selector.tsx ⭐ Swiss 2-column template selector
│   │   │   └── manuscripts/
│   │   ├── hooks/
│   │   │   ├── use-auth.tsx
│   │   │   ├── use-manuscripts.ts
│   │   │   └── use-journals.ts     ⭐ React Query hooks for templates & rules
│   │   └── lib/
│   │       ├── api.ts              ⭐ journalApi client
│   │       └── types.ts            ⭐ JournalTemplate & TemplateRule types
```

---

## ⚡ API Routes Overview (`/api/v1`)

### Journal Templates & Standards
- **`GET /api/v1/journals`**: Lists active target journal templates.
- **`GET /api/v1/journals/{id_or_slug}`**: Retrieves detailed template with validation rules.
- **`POST /api/v1/journals`**: Creates a new journal template.
- **`PATCH /api/v1/journals/{id}`**: Updates template parameters.
- **`DELETE /api/v1/journals/{id}`**: Deletes template and associated rules.
- **`GET /api/v1/journals/{id}/rules`**: Lists validation rules for template.
- **`POST /api/v1/journals/{id}/rules`**: Adds a validation rule to a template.
- **`PATCH /api/v1/journals/{id}/rules/{rule_id}`**: Modifies a rule configuration.
- **`DELETE /api/v1/journals/{id}/rules/{rule_id}`**: Removes a validation rule.
- **`POST /api/v1/journals/seed`**: Triggers idempotent seeding of Nature & PLOS ONE standards.

### Manuscripts & Pipeline
- **`POST /api/v1/manuscripts/{id}/parse`**: Parses `.docx` via Docling (`DRAFT` → `PARSED`).
- **`PATCH /api/v1/manuscripts/{id}/metadata`**: Commits edited IR (`PARSED` → `EDITED`).
- **`PATCH /api/v1/manuscripts/{id}`**: Assigns `target_journal_id` (`EDITED` → `TARGET_SELECTED`).
- **`GET /api/v1/manuscripts/{id}/ir`**: Fetches canonical `ManuscriptIR`.
- **`GET /api/v1/manuscripts/{id}/assets`**: Fetches extracted figures and tables.

---

## 🚀 Remaining Work & Next Steps

### 1. Module 7: Pre-flight Checklist Engine
- Implement rule evaluation engine (`WordCountRule`, `RequiredFieldRule`, `AbstractFormatRule`, `RegexRule`, `PresenceRule`).
- Create `POST /api/v1/manuscripts/{id}/preflight` endpoint returning evaluated checklist item results (`PASS`, `WARN`, `FAIL`).
- Build interactive checklist UI with manual human verification checkboxes before enabling export (`TARGET_SELECTED` → `CHECKLIST_PASSED`).

### 2. Module 8: Document Generation Engine
- Implement `DocumentGenerator` using `python-docx` and journal formatters (`NatureFormatter`, `PlosFormatter`).
- Apply journal-specific styling (margins, fonts, two-column layout, title page formatting, citation rendering).
- Create `POST /api/v1/manuscripts/{id}/export` endpoint to upload formatted `.docx` and generate download link (`CHECKLIST_PASSED` → `EXPORTED`).
