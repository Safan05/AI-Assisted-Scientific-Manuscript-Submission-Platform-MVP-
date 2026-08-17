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
| **Module 6: Journal Templates** | ⏳ Pending | 5 baseline journal definitions (Nature, IEEE, Radiology, MIDL, Medical Image Analysis) |
| **Module 7: Pre-flight Checklist** | ⏳ Pending | Rule-based automated pre-submission health checker + human overrides |
| **Module 8: Document Generator** | ⏳ Pending | Journal-compliant target `.docx` builder using `python-docx` |

---

## 🛠️ Tech Stack & Architecture

### Frontend (Swiss / International Typographic Style)
- **Framework**: Next.js 16 (App Router, TypeScript, `src/` directory layout)
- **Design System**: Strict Swiss / International Typographic Style:
  - **Colors**: Near-white canvas (`#FAFAFA`), ink black (`#111111`), signal red (`#D0021B`) for active states & primary CTAs only, hairlines (`#E0E0E0`), secondary (`#707070`).
  - **Typography**: Inter (Grotesque UI) + JetBrains Mono (numerical stats, word counts, citations, IDs).
  - **Signature Badge**: Monospace bracketed status codes: `[ 01 · DRAFT ]`, `[ 02 · PARSED ]`, `[ 03 · EDITED ]`.
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

### 3. Module 5 — Frontend Architecture & Pages

The frontend is built with Next.js 16 App Router using a strict **Swiss / International Typographic Style**:

```text
frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                # Swiss auth chrome with hairline header/footer
│   │   ├── login/page.tsx            # Login with JWT persistence
│   │   └── register/page.tsx         # Account creation with academic profile
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar with coded sections [01 OVERVIEW, 02 PROJECTS]
│   │   ├── dashboard/page.tsx        # High-level numeric metrics & live manuscript feed
│   │   ├── projects/
│   │   │   ├── page.tsx              # Project workspace manager + creation drawer
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Project detail, document list & dropzone
│   │   │       └── manuscripts/
│   │   │           └── [mid]/editor/
│   │   │               └── page.tsx  # Core Manuscript Metadata Editor page
│   ├── globals.css                   # Swiss design tokens, font scales, sharp 2px radius
│   ├── layout.tsx                    # Root layout with Inter + JetBrains Mono & Providers
│   └── page.tsx                      # Root redirect to /dashboard
├── components/
│   ├── manuscripts/
│   │   ├── status-badge.tsx          # Signature element: [ 01 · DRAFT ], [ 02 · PARSED ] ...
│   │   ├── upload-dropzone.tsx       # Drag-and-drop .docx ingest with auto Docling parse
│   │   ├── author-table.tsx          # Contributor order, affiliations & corresponding author
│   │   ├── section-tree-editor.tsx   # Recursive section tree with academic numbering (1, 1.1)
│   │   ├── reference-list-editor.tsx # Numbered citation list with DOI/metadata editor
│   │   └── metadata-form.tsx         # Unified editor tabs with live word counts & signal-red save
│   └── providers.tsx                 # TanStack QueryClient + AuthProvider
├── hooks/
│   ├── use-auth.tsx                  # User session, login, register, logout hooks
│   └── use-manuscripts.ts            # React Query hooks for manuscript CRUD & parse
└── lib/
    ├── api.ts                        # Axios client with JWT interceptor & 401 redirect
    ├── auth.ts                       # Token storage and auth context
    ├── types.ts                      # Full TypeScript interfaces matching backend models
    └── utils.ts                      # ClassName merger (cn)
```

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
- **`POST /api/v1/manuscripts/{id}/parse`**: Triggers full Docling parsing pipeline → returns `ManuscriptIR`.
- **`GET /api/v1/manuscripts/{id}/ir`**: Returns the current `ManuscriptIR` from the DB.
- **`GET /api/v1/manuscripts/{id}/extracted_metadata`**: Alias for `/ir`.
- **`PATCH /api/v1/manuscripts/{id}/metadata`**: Saves edited `ManuscriptIR` to database, updates word count, transitions status from `PARSED` → `EDITED`.
- **`GET /api/v1/manuscripts/{id}/assets`**: Lists all extracted figures/assets for a manuscript.
- **`GET /api/v1/storage/files/{file_path:path}`**: Serves/downloads files stored via local storage mode.

---

## 🚀 Remaining Work & Next Steps

### 1. Module 6: Journal Templates & Selection
- Seed initial template configurations for 5 target journals (Nature, IEEE Transactions, Radiology, MIDL, Medical Image Analysis).
- Create `GET /api/v1/journals` and `GET /api/v1/journals/{slug}` endpoints.
- Build Journal Selection UI with visual cards and rule summaries.

### 2. Module 7: Pre-flight Checklist Engine
- Implement rule evaluation engine (`WordCountRule`, `RequiredFieldRule`, `AbstractFormatRule`, `ReferenceCompletenessRule`).
- Create `POST /api/v1/manuscripts/{id}/preflight` endpoint returning checklist item statuses (`PASS`, `WARN`, `FAIL`).
- Build interactive checklist UI with manual human verification checkboxes before enabling export.

### 3. Module 8: Document Generation Engine
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

# Install dependencies
npm install

# Start Next.js development server (runs with Turbopack)
npm run dev
```
- Frontend application available at: `http://localhost:3000`

### 3. Verification Workflow
1. Navigate to `http://localhost:3000/register` and create an author account.
2. Land on `/dashboard` and click `[ + NEW PROJECT ]` to create a research workspace.
3. In `/projects/[id]`, click `[ + UPLOAD MANUSCRIPT ]` and drag a `.docx` paper into the dropzone.
4. Watch the pipeline ingest the file and automatically run the **Docling Parsing Engine**, transitioning status `[ 01 · DRAFT ]` → `[ 02 · PARSED ]`.
5. Click `[ OPEN EDITOR → ]` to launch the **Metadata Editor** (`/projects/[id]/manuscripts/[mid]/editor`):
   - Edit Title, Abstract (with live word count), and Keywords.
   - Reorder and update Authors and Affiliations.
   - Inspect and edit the recursive Section Tree with numbered hierarchy (`1`, `1.1`, `1.2`...).
   - Edit citations in the numbered Bibliography.
   - Toggle `[ EXTRACTED FIGURES ]` to view embedded figures.
6. Click the signal-red `[ SAVE & COMMIT IR → ]` button to commit edits. Status automatically transitions to `[ 03 · EDITED ]`.
