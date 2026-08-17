# AI-Assisted Scientific Manuscript Submission Platform

An end-to-end full-stack web platform designed to automate scientific manuscript parsing, journal-agnostic JSON transformation, metadata extraction, human verification, target journal pre-flight checking, and output document generation (`.docx`).

---

## 📊 Executive Audit & Progress Summary

| Module | Status | Highlights |
| :--- | :---: | :--- |
| **Module 1: Scaffolding & Database** | ✅ Completed | FastAPI, SQLModel, Asyncpg, Alembic, Next.js 15, Shadcn UI, Neon DB setup |
| **Module 2: Auth & User Management** | ✅ Completed | JWT Auth (OAuth2 Bearer), bcrypt hashing, `GET/PATCH /users/me`, router guards |
| **Module 3: Project CRUD & Storage** | ✅ Completed | Project lifecycle, secure `.docx` upload, `StorageService` abstraction (Bunny.net/S3) |
| **Module 4: Manuscript Parsing Engine** | ✅ Completed | `Docling` parsing backend, `ImageExtractor`, `MetadataExtractor` (heuristic + LLM), 3 new API endpoints |
| **Module 5: Metadata Editor UI** | ⏳ Pending | Next.js inline manuscript metadata editor (Tree view, authors, references) |
| **Module 6: Journal Templates** | ⏳ Pending | 5 baseline journal definitions (Nature, IEEE, Radiology, MIDL, Medical Image Analysis) |
| **Module 7: Pre-flight Checklist** | ⏳ Pending | Rule-based automated pre-submission health checker + human overrides |
| **Module 8: Document Generator** | ⏳ Pending | Journal-compliant target `.docx` builder using `python-docx` |

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **Framework**: Next.js 15 (App Router, TypeScript, `src/` directory layout)
- **Styling**: Tailwind CSS v4, Lucide Icons
- **UI Components**: Shadcn UI (Component primitives)

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Models**: SQLModel / SQLAlchemy (Async Engine via `asyncpg`)
- **Migrations**: Alembic (Configured for async PostgreSQL and SQLModel metadata auto-generation)
- **Authentication**: JWT Tokens (OAuth2 Password Bearer flow) with `passlib` (bcrypt)
- **Database**: PostgreSQL (Currently connected to cloud Neon Postgres instance)
- **Document Parsing**: [Docling](https://github.com/docling-project/docling) (IBM Research / LF AI & Data Foundation, MIT License) — in-process, CPU-only, no GPU or external API required for DOCX

### Core Abstractions
1. **`StorageService`** (`app/services/storage/`): Abstract interface wrapping both S3-compatible cloud storage (Bunny.net, MinIO, AWS S3) and a **`LocalStorage` driver** (`STORAGE_PROVIDER=local`) for offline local development storing files in `data/storage/`.
2. **`LLMService`** (`app/services/llm/`): Abstract interface supporting OpenAI API, Anthropic Claude, and local models (Ollama / vLLM on DGX). Switch via `LLM_PROVIDER` env var — no code changes required.
3. **`ManuscriptIR`** (`app/schemas/manuscript_ir.py`): Journal-agnostic internal JSON representation schema for manuscripts.
4. **`DoclingParser`** (`app/services/parsing/docling_parser.py`): Docling-backed parser that produces a structured `SectionNode` tree, extracts embedded figures with captions and bounding-box provenance, and recognises table structure via TableFormer.

---

## 🏗️ Detailed Audit of Completed Work (How It Was Done)

### 1. Database Schema & Migrations
Two database migrations have been generated and executed on the PostgreSQL database:
- **Migration 1 (`d173c614043f`)**: Created `users` and `projects` tables with indexing on `email` and `user_id`.
- **Migration 2 (`ae12d0a4069f`)**: Created `manuscripts`, `extracted_metadata`, `manuscript_assets`, `journal_templates`, and `template_rules` tables with foreign keys and `JSONB` fields for complex structures.

### 2. Service & Repository Layer Architecture
- **`app/core/`**: Pydantic `Settings` loading from `.env` (with `STORAGE_PROVIDER`, `LOCAL_STORAGE_DIR`, and `DATABASE_URL`), security utilities (JWT encoding/decoding, password hashing), and FastAPI dependency injection (`get_current_user`, `SessionDep`).
- **`app/crud/`**: Async CRUD handlers for `User`, `Project`, `Manuscript`, `ManuscriptAsset`, and `ExtractedMetadata`.
- **`app/services/`**:
  - `auth_service.py`: Registration and authentication business logic.
  - `manuscript_service.py`: Orchestrates `.docx` manuscript upload **and the full parsing pipeline** (download → Docling parse → image extract → metadata extract → DB persist → status transition).
  - `storage/`: `LocalStorage` (for offline local disk storage) and `S3CompatibleStorage` implementing `StorageService` using path-style S3 addressing (configured for Bunny.net/MinIO/S3).
  - `llm/`: `OpenAILLMService` and `AnthropicLLMService` implementing `LLMService` with `structured_extract()` for schema-based extractions.
  - `parsing/`: **`DoclingParser`** (Docling integration), **`ImageExtractor`** (Docling picture items → `ManuscriptAsset` records), **`MetadataExtractor`** (heuristic regex + LLM fallback producing `ManuscriptIR`).

### 3. Module 4 — Parsing Pipeline Detail

The parsing pipeline is triggered by `POST /api/v1/manuscripts/{id}/parse` and runs as follows:

```
StorageService.download(storage_key)
  → DoclingParser.parse(bytes) → DoclingParseResult
      ├── sections: SectionNode[] (heading hierarchy, paragraphs, tables as markdown)
      ├── pictures: ExtractedPictureItem[] (image bytes + captions + bounding boxes)
      ├── full_markdown: str
      └── raw_dict: dict (Docling native JSON export)
  → ImageExtractor.extract(pictures) → ManuscriptAsset[] (uploaded to storage + DB)
  → MetadataExtractor.extract(sections, full_markdown)
      ├── Heuristic pass: title, abstract, keywords, references, COI, ethics, funding …
      └── LLM pass (optional, fires only for missing fields using first 4k chars)
  → ManuscriptIR (canonical structured representation)
  → upsert ExtractedMetadata row + raw_parsed_json on Manuscript
  → status: DRAFT → PARSED
```

**Key design decisions:**
- Docling runs in-process — no separate service, external API, or GPU required for DOCX parsing.
- LLM is optional — if unconfigured or failing, the heuristic-only path runs silently without error.
- Re-parsing is safe — calling `POST /parse` on an already-`PARSED` manuscript updates the metadata in-place.
- Future PDF/scanned support requires zero rearchitecture: Docling's `DocumentConverter` handles PDF + OCR via the same API.

### 4. API Routes Overview (`/api/v1`)
- **`POST /api/v1/auth/register`**: Registers a new user and returns JWT token.
- **`POST /api/v1/auth/login`**: OAuth2 compatible login endpoint returning JWT token.
- **`GET /api/v1/users/me`**: Fetches authenticated user profile.
- **`PATCH /api/v1/users/me`**: Updates authenticated user profile.
- **`POST /api/v1/projects`**: Creates a new project workspace.
- **`GET /api/v1/projects`**: Lists projects belonging to the logged-in user.
- **`GET /api/v1/projects/{id}`**: Retrieves project details.
- **`POST /api/v1/projects/{id}/manuscripts`**: Uploads a `.docx` file, stores it in storage, and initializes manuscript state.
- **`GET /api/v1/projects/{id}/manuscripts`**: Lists all manuscripts in a project.
- **`GET /api/v1/manuscripts/{id}`**: Retrieves detailed manuscript record.
- **`POST /api/v1/manuscripts/{id}/parse`** ⭐ _New_: Triggers full Docling parsing pipeline → returns `ManuscriptIR`.
- **`GET /api/v1/manuscripts/{id}/ir`** ⭐ _New_: Returns the current `ManuscriptIR` from the DB.
- **`GET /api/v1/manuscripts/{id}/assets`** ⭐ _New_: Lists all extracted figures/assets for a manuscript.
- **`GET /api/v1/storage/files/{file_path:path}`**: Serves/downloads files stored via local storage mode.

---

## 📂 Codebase File Tree Audit

```text
swiss2/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   ├── d173c614043f_create_users_and_projects.py
│   │   │   └── ae12d0a4069f_create_manuscripts_assets_and_journal_.py
│   │   ├── env.py                  # Async Alembic runner
│   │   ├── script.py.mako          # Configured template with sqlmodel import
│   │   └── alembic.ini
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── manuscripts.py
│   │   │   │   ├── parsing.py      ⭐ parse / assets / IR endpoints
│   │   │   │   └── storage.py      # Local storage file serving route
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── deps.py
│   │   │   └── security.py
│   │   ├── crud/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── asset.py            ⭐ ManuscriptAsset CRUD
│   │   │   └── extracted_metadata.py ⭐ ExtractedMetadata upsert
│   │   ├── db/
│   │   │   ├── engine.py
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── asset.py
│   │   │   └── journal_template.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── manuscript.py
│   │   │   ├── manuscript_ir.py    ⭐ ManuscriptIR + SectionNode + Author …
│   │   │   └── asset.py            ⭐ AssetRead schema
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── manuscript_service.py  ⭐ upload + parse orchestration
│   │   │   ├── storage/
│   │   │   │   ├── base.py
│   │   │   │   ├── local_storage.py
│   │   │   │   ├── s3_compatible.py
│   │   │   │   └── factory.py
│   │   │   ├── llm/                ⭐ LLM abstraction layer
│   │   │   │   ├── base.py
│   │   │   │   ├── openai_service.py
│   │   │   │   ├── anthropic_service.py
│   │   │   │   └── factory.py
│   │   │   └── parsing/            ⭐ Docling-backed parsing engine
│   │   │       ├── __init__.py
│   │   │       ├── docling_parser.py   # Docling → SectionNode[] + figures
│   │   │       ├── image_extractor.py  # figures → ManuscriptAsset records
│   │   │       └── metadata_extractor.py # heuristic + LLM → ManuscriptIR
│   │   └── main.py
│   ├── .env                        # Configured with Neon DB connection
│   ├── pyproject.toml
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── button.tsx
│   │   └── lib/
│   │       └── utils.ts
│   ├── components.json
│   ├── next.config.ts
│   └── package.json
├── docker-compose.yaml
└── implementation_plan.md
```

---

## 🚀 Remaining Work & Next Steps

### 1. Module 5: Frontend UI (Auth, Dashboard & Metadata Editor)
- Create Login & Registration pages (`/login`, `/register`).
- Create Dashboard layout with sidebar navigation, project creation modal, and manuscript listing.
- Build the **Manuscript Editor UI** (`/projects/[id]/manuscripts/[mid]/editor`):
  - Inline Title & Abstract editor with live word count.
  - Sortable Author & Affiliation table.
  - Collapsible Section Tree Editor.
  - Numbered Reference List Editor with structured field parsing.
  - Required statement textareas (Ethics, COI, Data Availability).

### 2. Module 6: Journal Templates & Selection
- Seed initial template configurations for 5 target journals (Nature, IEEE Transactions, Radiology, MIDL, Medical Image Analysis).
- Create `GET /api/v1/journals` and `GET /api/v1/journals/{slug}` endpoints.
- Build Journal Selection UI with visual cards and rule summaries.

### 3. Module 7: Pre-flight Checklist Engine
- Implement rule evaluation engine (`WordCountRule`, `RequiredFieldRule`, `AbstractFormatRule`, `ReferenceCompletenessRule`).
- Create `POST /api/v1/manuscripts/{id}/preflight` endpoint returning checklist item statuses (`PASS`, `WARN`, `FAIL`).
- Build interactive checklist UI with manual human verification checkboxes before enabling export.

### 4. Module 8: Document Generation Engine
- Implement `DocumentGenerator` using `python-docx` and journal formatters (`NatureFormatter`, `IEEEFormatter`).
- Apply journal-specific styling (margins, fonts, two-column layout, title page formatting, citation rendering).
- Create `POST /api/v1/manuscripts/{id}/export` endpoint to upload formatted `.docx` and generate presigned download link.

---

## ⚡ How to Run Locally

### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate       # Linux / macOS
# OR: .\.venv\Scripts\Activate.ps1  # Windows

# Install dependencies (includes Docling)
pip install -e .

# Run migrations (already applied to Neon DB)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Documentation available at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start Next.js development server
npm run dev
```
- Frontend application available at: `http://localhost:3000`

### 3. Trigger Parsing (after uploading a manuscript)
```bash
# Upload a manuscript first via POST /api/v1/projects/{id}/manuscripts
# Then trigger parsing:
curl -X POST http://localhost:8000/api/v1/manuscripts/{manuscript_id}/parse \
  -H "Authorization: Bearer $TOKEN"

# Retrieve the structured ManuscriptIR:
curl http://localhost:8000/api/v1/manuscripts/{manuscript_id}/ir \
  -H "Authorization: Bearer $TOKEN" | jq .

# List extracted figures:
curl http://localhost:8000/api/v1/manuscripts/{manuscript_id}/assets \
  -H "Authorization: Bearer $TOKEN" | jq .
```
