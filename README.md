# AI-Assisted Scientific Manuscript Submission Platform

An end-to-end full-stack web platform designed to automate scientific manuscript parsing, journal-agnostic JSON transformation, metadata extraction, human verification, target journal pre-flight checking, and output document generation (`.docx`).

---

## 📊 Executive Audit & Progress Summary

| Module | Status | Highlights |
| :--- | :---: | :--- |
| **Module 1: Scaffolding & Database** | ✅ Completed | FastAPI, SQLModel, Asyncpg, Alembic, Next.js 15, Shadcn UI, Neon DB setup |
| **Module 2: Auth & User Management** | ✅ Completed | JWT Auth (OAuth2 Bearer), bcrypt hashing, `GET/PATCH /users/me`, router guards |
| **Module 3: Project CRUD & Storage** | ✅ Completed | Project lifecycle, secure `.docx` upload, `StorageService` abstraction (Bunny.net/S3) |
| **Module 4: Manuscript Parsing Engine** | ⏳ Pending | `python-docx` parsing, image extraction, heuristic/LLM metadata extraction |
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

### Core Abstractions
1. **`StorageService`** (`app/services/storage/`): Abstract interface wrapping both S3-compatible cloud storage (Bunny.net, MinIO, AWS S3) and a **`LocalStorage` driver** (`STORAGE_PROVIDER=local`) for offline local development storing files in `data/storage/`.
2. **`LLMService`** (`app/services/llm/`): Abstract interface supporting OpenAI API, Anthropic Claude, and local models (Ollama / vLLM on DGX).
3. **`ManuscriptIR`** (`app/schemas/manuscript_ir.py`): Journal-agnostic internal JSON representation schema for manuscripts.

---

## 🏗️ Detailed Audit of Completed Work (How It Was Done)

### 1. Database Schema & Migrations
Two database migrations have been generated and executed on the PostgreSQL database:
- **Migration 1 (`d173c614043f`)**: Created `users` and `projects` tables with indexing on `email` and `user_id`.
- **Migration 2 (`ae12d0a4069f`)**: Created `manuscripts`, `extracted_metadata`, `manuscript_assets`, `journal_templates`, and `template_rules` tables with foreign keys and `JSONB` fields for complex structures.

### 2. Service & Repository Layer Architecture
- **`app/core/`**: Pydantic `Settings` loading from `.env` (with `STORAGE_PROVIDER`, `LOCAL_STORAGE_DIR`, and `DATABASE_URL`), security utilities (JWT encoding/decoding, password hashing), and FastAPI dependency injection (`get_current_user`, `SessionDep`).
- **`app/crud/`**: Async CRUD handlers for `User`, `Project`, and `Manuscript`.
- **`app/services/`**:
  - `auth_service.py`: Registration and authentication business logic.
  - `manuscript_service.py`: Orchestrates `.docx` manuscript upload and record creation.
  - `storage/`: `LocalStorage` (for offline local disk storage) and `S3CompatibleStorage` implementing `StorageService` using path-style S3 addressing (configured for Bunny.net/MinIO/S3).
  - `llm/`: `OpenAILLMService` and `AnthropicLLMService` implementing `LLMService` with `structured_extract()` for schema-based extractions.

### 3. API Routes Overview (`/api/v1`)
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
│   │   │   │   └── storage.py      # Local storage file serving route
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── deps.py
│   │   │   └── security.py
│   │   ├── crud/
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   └── manuscript.py
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
│   │   │   └── manuscript_ir.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── manuscript_service.py
│   │   │   ├── storage/
│   │   │   │   ├── base.py
│   │   │   │   ├── local_storage.py   # Local filesystem storage driver
│   │   │   │   ├── s3_compatible.py  # Bunny.net / S3 / MinIO driver
│   │   │   │   └── factory.py
│   │   │   └── llm/
│   │   │       ├── base.py
│   │   │       ├── openai_service.py
│   │   │       ├── anthropic_service.py
│   │   │       └── factory.py
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

### 1. Module 4: Parsing Engine & Metadata Extraction
- Implement `DocxParser` using `python-docx` to extract heading hierarchy (`SectionNode` tree).
- Implement `ImageExtractor` to pull embedded images/figures from `.docx` zip containers and upload to `StorageService`.
- Implement `MetadataExtractor` using heuristic regex rules + fallback `LLMService` calls to extract title, authors, affiliations, abstract, keywords, and references into `ManuscriptIR`.
- Create `POST /api/v1/manuscripts/{id}/parse` endpoint to trigger parsing pipeline and update manuscript status from `DRAFT` to `PARSED`.

### 2. Module 5: Frontend UI (Auth, Dashboard & Metadata Editor)
- Create Login & Registration pages (`/login`, `/register`).
- Create Dashboard layout with sidebar navigation, project creation modal, and manuscript listing.
- Build the **Manuscript Editor UI** (`/projects/[id]/manuscripts/[mid]/editor`):
  - Inline Title & Abstract editor with live word count.
  - Sortable Author & Affiliation table.
  - Collapsible Section Tree Editor.
  - Numbered Reference List Editor with structured field parsing.
  - Required statement textareas (Ethics, COI, Data Availability).

### 3. Module 6: Journal Templates & Selection
- Seed initial template configurations for 5 target journals (Nature, IEEE Transactions, Radiology, MIDL, Medical Image Analysis).
- Create `GET /api/v1/journals` and `GET /api/v1/journals/{slug}` endpoints.
- Build Journal Selection UI with visual cards and rule summaries.

### 4. Module 7: Pre-flight Checklist Engine
- Implement rule evaluation engine (`WordCountRule`, `RequiredFieldRule`, `AbstractFormatRule`, `ReferenceCompletenessRule`).
- Create `POST /api/v1/manuscripts/{id}/preflight` endpoint returning checklist item statuses (`PASS`, `WARN`, `FAIL`).
- Build interactive checklist UI with manual human verification checkboxes before enabling export.

### 5. Module 8: Document Generation Engine
- Implement `DocumentGenerator` using `python-docx` and journal formatters (`NatureFormatter`, `IEEEFormatter`).
- Apply journal-specific styling (margins, fonts, two-column layout, title page formatting, citation rendering).
- Create `POST /api/v1/manuscripts/{id}/export` endpoint to upload formatted `.docx` and generate presigned download link.

---

## ⚡ How to Run Locally

### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment (if not already done)
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows

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
