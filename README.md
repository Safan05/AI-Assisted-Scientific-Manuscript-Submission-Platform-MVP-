# AI-Assisted Scientific Manuscript Submission Platform

An end-to-end full-stack web platform designed to automate scientific manuscript parsing, journal-agnostic JSON transformation, metadata extraction, human verification, target journal pre-flight checking, and output document generation (`.docx`).

---

## 📊 Executive Audit & Progress Summary

| Module | Status | Highlights |
| :--- | :---: | :--- |
| **Module 1: Scaffolding & Database** | ✅ Completed | FastAPI, SQLModel, Asyncpg, Alembic, Next.js 16 (App Router), Neon PostgreSQL setup |
| **Module 2: Auth & User Management** | ✅ Completed | JWT Auth (OAuth2 Form & JSON), bcrypt hashing, `GET /users/me`, router guards |
| **Module 3: Project CRUD & Storage** | ✅ Completed | Project lifecycle, secure `.docx` upload, `StorageService` abstraction (Bunny.net/S3/Local) |
| **Module 4: Manuscript Parsing Engine** | ✅ Completed | `Docling` parsing backend with `python-docx` fallback, `ImageExtractor`, `MetadataExtractor` |
| **Module 5: Frontend UI & Metadata Editor** | ✅ Completed | Anthropic warm palette, Collapsible Sidebar, Recursive Section Tree & Citation Editor |
| **Module 6: Journal Templates & Selection** | ✅ Completed | CRUD for `journal_templates` & `template_rules`, seeded Nature & PLOS ONE standards with primary sources |
| **Module 7: Pre-flight Checklist Engine** | ✅ Completed | Rule-based compliance evaluation engine (`word_count`, `required_field`, `regex`, `presence`), server-side `/confirm` gate, and interactive checklist UI |
| **Module 8: Document Generator** | ⏳ Next | Journal-compliant target `.docx` builder using `python-docx` (`NatureFormatter`, `PlosFormatter`) |

---

## 🛠️ Tech Stack & Architecture

### Frontend (Modern Academic Design System)
- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript, `src/` directory layout)
- **Design System**: Anti-slop academic aesthetic inspired by Anthropic & Swiss typography:
  - **Colors**: Warm ivory canvas (`#faf9f5`), rich ink (`#141413`), secondary surface (`#f5f3ec`), hairlines (`#e6e4dc`).
  - **Typography**: Inter (UI) + JetBrains Mono (numerical stats, word counts, citations, IDs).
  - **Precision Accents**: 10% opacity dot-matrix grids (`bg-grid-dots`), subtle corner crosshairs (`scientific-box`).
  - **Collapsible Sidebar**: Compact 16-px to 64-px expand/collapse navigation drawer.
- **State & Data**: TanStack React Query + Axios JWT Interceptors with automated Pydantic validation error formatting.

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ORM & Models**: SQLModel / SQLAlchemy (Async Engine via `asyncpg`)
- **Migrations**: Alembic (Configured for async PostgreSQL and SQLModel metadata)
- **Authentication**: JWT Tokens (OAuth2 Password Bearer flow) with `passlib` (bcrypt)
- **Database**: PostgreSQL (Connected to cloud Neon Postgres instance)
- **Document Parsing**: [Docling](https://github.com/docling-project/docling) (LF AI & Data Foundation) with resilient `python-docx` fallback parser.

### Core Abstractions
1. **`StorageService`** (`app/services/storage/`): Abstract interface wrapping both S3-compatible cloud storage and a **`LocalStorage` driver** (`STORAGE_PROVIDER=local`) storing files in `data/storage/`.
2. **`LLMService`** (`app/services/llm/`): Abstract interface supporting OpenAI API, Anthropic Claude, and local models (Ollama / vLLM on DGX). Switch via `LLM_PROVIDER` env var.
3. **`ManuscriptIR`** (`app/schemas/manuscript_ir.py`): Canonical, journal-agnostic internal representation schema for manuscripts.
4. **`DoclingParser`** (`app/services/parsing/docling_parser.py`): Parser producing structured `SectionNode` trees, extracting embedded figures with captions, and parsing tables.
5. **`JournalTemplate` & `TemplateRule`** (`app/models/journal_template.py`): Schema-driven target journal specifications with validation rule configs.
6. **`PreflightChecker`** (`app/services/preflight/checker.py`): Evaluates compliance against journal rules, produces diagnostic items, and aggregates pass/warn/fail status.

---

## 🏛️ Seeded Journal Standards (Primary Sources)

Authoritative submission guidelines from **Nature** and **PLOS ONE** are encoded directly into the database:

### 1. **Nature** (`slug: nature`) - Restrictive, Structured
*Primary Source: [nature.com/nature/for-authors/initial-submission](https://www.nature.com/nature/for-authors/initial-submission)*
- **Abstract Limit**: 200 words (fully referenced summary paragraph; hard `FAIL` if exceeded).
- **Main Text Budget**: 2,500 words for standard 6-page article (`WARN` if exceeded).
- **Mandatory Disclosures**: Competing Interests Statement (`FAIL` if absent).
- **Reference Guideline**: Max ~50 references (`WARN` if exceeded).
- **Formatting**: LaTeX/MathType numbered equations only (never images), line numbers required on all pages.

### 2. **PLOS ONE** (`slug: plos-one`) - Open, Reproducibility-Focused
*Primary Source: [journals.plos.org/plosone/s/submission-guidelines](https://journals.plos.org/plosone/s/submission-guidelines) & [Data Availability Policy](https://journals.plos.org/plosone/s/data-availability)*
- **Abstract Limit**: 300 words (unstructured single-paragraph; hard `FAIL` if exceeded).
- **Main Text Budget**: `null` (No word limit on main text).
- **Mandatory Disclosures**: Data Availability Statement with repository links or accession numbers (`FAIL` if absent).
- **Formatting Rules**: Abstract must contain **no citations** (`WARN` regex check). Bracketed citation numbers `[1]`, not superscripts.

---

## 🛡️ Module 7 - Pre-flight Evaluation Engine

The Pre-flight system validates manuscript metadata against target journal submission constraints:

- **Rule Types Evaluated**:
  1. `word_count`: Threshold checks on abstract, main text, and full manuscript with 5% warning buffers.
  2. `required_field`: Presence verification for mandatory statements (`conflict_of_interest`, `data_availability`, `ethics_statement`).
  3. `regex`: Pattern matching and exclusion heuristics (e.g. prohibited citations in abstracts).
  4. `presence`: Array count bounds and existence checks (e.g. reference count limits).
- **Server-Side Hard Gate**: `POST /api/v1/manuscripts/{id}/preflight/confirm` returns **HTTP 400** if unresolved `FAIL` items remain, preventing unverified submissions.
- **Interactive UI**: Itemized diagnostic cards, expandable actual vs expected values, warning acknowledgment toggles, and "Fix in Editor" deep links.

---

## 📂 Codebase File Tree

```text
swiss2/
├── backend/
│   ├── alembic/
│   │   └── versions/
│   │       ├── ae12d0a4069f_create_manuscripts_assets_and_journal_.py
│   │       ├── c56a78b9d012_create_preflight_results_and_check_items.py ⭐ Preflight tables
│   │       └── d173c614043f_create_users_and_projects.py
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── manuscripts.py
│   │   │   │   ├── parsing.py
│   │   │   │   ├── journals.py     ⭐ CRUD for journal_templates & rules
│   │   │   │   ├── preflight.py    ⭐ Pre-flight check, override & confirm endpoints
│   │   │   │   └── storage.py
│   │   │   └── router.py
│   │   ├── crud/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── asset.py
│   │   │   ├── extracted_metadata.py
│   │   │   ├── journal_template.py
│   │   │   └── preflight.py        ⭐ PreflightResult & PreflightCheckItem CRUD
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── asset.py
│   │   │   ├── journal_template.py
│   │   │   └── preflight.py        ⭐ SQLModel tables for preflight results
│   │   ├── schemas/
│   │   │   ├── manuscript_ir.py
│   │   │   ├── asset.py
│   │   │   ├── journal_template.py
│   │   │   └── preflight.py        ⭐ Pydantic schemas for evaluation items
│   │   ├── services/
│   │   │   ├── template_seeder.py  ⭐ Authoritative Nature & PLOS ONE seeder
│   │   │   ├── preflight/
│   │   │   │   └── checker.py      ⭐ PreflightChecker evaluation engine
│   │   │   ├── manuscript_service.py
│   │   │   ├── storage/
│   │   │   ├── llm/
│   │   │   └── parsing/
│   │   └── main.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── manuscripts/
│   │   │   │   │           └── [mid]/
│   │   │   │   │               ├── editor/page.tsx
│   │   │   │   │               ├── journal/page.tsx   ⭐ Journal Selector UI
│   │   │   │   │               └── preflight/page.tsx ⭐ Pre-flight Checklist UI
│   │   │   │   └── layout.tsx                         ⭐ Collapsible Sidebar & Header
│   │   ├── components/
│   │   │   ├── journals/
│   │   │   │   └── journal-selector.tsx
│   │   │   ├── preflight/
│   │   │   │   ├── checklist-item-card.tsx            ⭐ Status cards & overrides
│   │   │   │   └── preflight-summary-banner.tsx       ⭐ Diagnostics overview bar
│   │   │   └── manuscripts/
│   │   ├── hooks/
│   │   │   ├── use-auth.tsx
│   │   │   ├── use-manuscripts.ts
│   │   │   ├── use-journals.ts
│   │   │   └── use-preflight.ts                       ⭐ React Query preflight hooks
│   │   └── lib/
│   │       ├── api.ts                                 ⭐ Axios client & preflightApi
│   │       ├── types.ts                               ⭐ PreflightResult & CheckItem types
│   │       └── utils.ts                               ⭐ FastAPI error parser & helpers
```

---

## ⚡ API Routes Overview (`/api/v1`)

### Pre-flight Checklist & Health Evaluation
- **`POST /api/v1/manuscripts/{id}/preflight`**: Evaluates manuscript metadata against target journal rules, saving diagnostic items.
- **`GET /api/v1/manuscripts/{id}/preflight`**: Retrieves the latest preflight evaluation for a manuscript.
- **`POST /api/v1/manuscripts/{id}/preflight/override`**: Sets human override rationale on warning items.
- **`POST /api/v1/manuscripts/{id}/preflight/confirm`**: Verifies zero unresolved `FAIL` items and transitions status:
  $$\mathbf{TARGET\_SELECTED} \longrightarrow \mathbf{CHECKLIST\_PASSED}$$

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
- **`POST /api/v1/manuscripts/{id}/parse`**: Parses `.docx` (`DRAFT` → `PARSED`).
- **`PATCH /api/v1/manuscripts/{id}/metadata`**: Commits edited IR (`PARSED` → `EDITED`).
- **`PATCH /api/v1/manuscripts/{id}`**: Assigns `target_journal_id` (`EDITED` → `TARGET_SELECTED`).
- **`GET /api/v1/manuscripts/{id}/ir`**: Fetches canonical `ManuscriptIR`.
- **`GET /api/v1/manuscripts/{id}/assets`**: Fetches extracted figures and tables.

---

## 🚀 Next Milestone: Module 8 — Document Generation Engine

- Implement `DocumentGenerator` using `python-docx` with modular journal formatters (`NatureFormatter`, `PlosFormatter`).
- Render journal-specific typography, margins, title block layouts, numbered vs bracketed citations, figure placement, and declarations.
- Implement `POST /api/v1/manuscripts/{id}/export` endpoint returning generated submission-ready Word `.docx` packages (`CHECKLIST_PASSED` → `EXPORTED`).
