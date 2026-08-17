# AI-Assisted Scientific Manuscript Submission Platform (MVP)

An end-to-end full-stack web platform designed to automate scientific manuscript parsing, journal-agnostic JSON transformation, metadata extraction, human verification, target journal pre-flight checking, and output document generation (`.docx`).

---

## 📊 Executive Audit & Progress Summary

| Module | Status | Highlights |
| :--- | :---: | :--- |
| **Module 1: Scaffolding & Database** | ✅ Completed | FastAPI, SQLModel, Asyncpg, Alembic, Next.js 16 (App Router), Neon PostgreSQL setup |
| **Module 2: Auth & User Management** | ✅ Completed | JWT Auth (OAuth2 Form & JSON), bcrypt hashing, `GET /users/me`, router guards |
| **Module 3: Project CRUD & Storage** | ✅ Completed | Project lifecycle, secure `.docx` upload, `StorageService` abstraction (Bunny.net/S3/Local) |
| **Module 4: Manuscript Parsing Engine** | ✅ Completed | `Docling` parsing backend with `python-docx` fallback, `ImageExtractor`, `MetadataExtractor` with heuristic & LLM title/author discrimination |
| **Module 5: Frontend UI & Metadata Editor** | ✅ Completed | Anthropic warm palette, Collapsible Sidebar, Recursive Section Tree & Citation Editor |
| **Module 6: Journal Templates & Selection** | ✅ Completed | CRUD for `journal_templates` & `template_rules`, seeded 6 major venue standards (Nature, PLOS ONE, IEEE, MIA, Radiology, MIDL) |
| **Module 7: Pre-flight Checklist Engine** | ✅ Completed | Rule-based compliance evaluation engine (`word_count`, `required_field`, `regex`, `presence`), server-side `/confirm` gate, and interactive checklist UI |
| **Module 8: Document Generator & Export** | ✅ Completed | Journal-compliant target `.docx` builder with concrete formatters (`Nature`, `PLOS ONE`, `IEEE`, `MIA`, `Radiology`, `MIDL`), download & regeneration UI |

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
- **Authentication**: JWT Tokens (OAuth2 Password Bearer flow) with native `bcrypt`
- **Database**: PostgreSQL (Connected to cloud Neon Postgres instance or local Docker container)
- **Document Parsing**: [Docling](https://github.com/docling-project/docling) (LF AI & Data Foundation) with resilient `python-docx` fallback parser.
- **Document Generation**: `python-docx` with extensible `BaseFormatter` and concrete journal formatters.

### Core Abstractions
1. **`StorageService`** (`app/services/storage/`): Abstract interface wrapping both S3-compatible cloud storage and a **`LocalStorage` driver** (`STORAGE_PROVIDER=local`) storing files in `data/storage/`.
2. **`LLMService`** (`app/services/llm/`): Abstract interface supporting OpenAI API, Anthropic Claude, and local models (Ollama / vLLM on DGX). Switch via `LLM_PROVIDER` env var.
3. **`ManuscriptIR`** (`app/schemas/manuscript_ir.py`): Canonical, journal-agnostic internal representation schema for manuscripts.
4. **`DoclingParser`** (`app/services/parsing/docling_parser.py`): Parser producing structured `SectionNode` trees, extracting embedded figures with captions, and parsing tables.
5. **`JournalTemplate` & `TemplateRule`** (`app/models/journal_template.py`): Schema-driven target journal specifications with validation rule configs.
6. **`PreflightChecker`** (`app/services/preflight/checker.py`): Evaluates compliance against journal rules, produces diagnostic items, and aggregates pass/warn/fail status.
7. **`DocumentGenerator`** (`app/services/docgen/generator.py`): Orchestrates `.docx` generation, applying journal styling, title layout, section recursion, citations, declarations, and storage uploads.

---

## 🏛️ Seeded Journal Standards & Concrete Formatters

Authoritative submission guidelines and matching output formatters are encoded for 6 top-tier venues:

### 1. **Nature** (`slug: nature`)
- **Abstract Limit**: 200 words (fully referenced summary paragraph; hard `FAIL` if exceeded).
- **Main Text Budget**: 2,500 words for standard 6-page article (`WARN` if exceeded).
- **Mandatory Disclosures**: Competing Interests, Data Availability, Author Contributions.
- **Formatting**: Times New Roman 12pt, double-spaced, superscript citations.

### 2. **PLOS ONE** (`slug: plos-one`)
- **Abstract Limit**: 300 words (unstructured single-paragraph; hard `FAIL` if exceeded).
- **Mandatory Disclosures**: Data Availability Statement with repository links/accession numbers.
- **Formatting**: No citations in abstract, bracketed numeric citations `[1]`.

### 3. **IEEE Transactions** (`slug: ieee`)
- **Keywords / Index Terms**: 3–5 taxonomy keywords mandatory.
- **Formatting**: 10pt Times New Roman, Roman numeral major headings (`I. INTRODUCTION`), bracketed hanging-indent references, single-spaced content.

### 4. **Medical Image Analysis** (`slug: medical-image-analysis`)
- **Highlights**: Mandatory 3–5 bullet points of novel findings.
- **Mandatory Disclosures**: CRediT Author Statement, Conflict of Interest.
- **Formatting**: Elsevier standard layout, 11pt Times New Roman.

### 5. **Radiology (RSNA)** (`slug: radiology`)
- **Abstract**: Structured (Background, Methods, Results, Conclusion) $\le 300$ words.
- **Summary & Key Results**: Summary statement $\le 30$ words + 3 key result bullet points.
- **Formatting**: Double-spaced, 12pt Times New Roman.

### 6. **MIDL (Medical Imaging with Deep Learning)** (`slug: midl`)
- **Abstract Limit**: 250 words.
- **Mandatory Disclosures**: Code & Data Availability statement.
- **Formatting**: 11pt Times New Roman, centered author/affiliation blocks.

---

## 🛡️ Pre-flight & Export Pipeline

1. **Upload & Parse**: Original `.docx` parsed into `ManuscriptIR` (`DRAFT` → `PARSED`).
2. **Metadata Review**: Edit title, authors, affiliations, sections, and statements (`PARSED` → `EDITED`).
3. **Journal Selection**: Pick target journal from seeded database catalog (`EDITED` → `TARGET_SELECTED`).
4. **Pre-flight Check**: Rule-based engine checks constraints (`word_count`, `required_field`, `regex`, `presence`).
5. **Human Confirmation Gate**: Author reviews checklist and signs off (`TARGET_SELECTED` → `CHECKLIST_PASSED`).
6. **Document Generation**: Format factory compiles submission-ready `.docx` package and stores it (`CHECKLIST_PASSED` → `EXPORTED`).
7. **Download**: Author downloads final `.docx` package via presigned/local download URL.

---

## 📂 Codebase File Tree

```text
swiss2/
├── docker-compose.yaml     ⭐ Full-stack Docker orchestration (Postgres, Backend, Frontend)
├── backend/
│   ├── Dockerfile          ⭐ Backend container build recipe
│   ├── alembic/
│   │   └── versions/
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
│   │   │   │   ├── export.py       ⭐ Document generation trigger, status & download
│   │   │   │   └── storage.py
│   │   │   └── router.py
│   │   ├── crud/
│   │   ├── models/
│   │   ├── schemas/
│   │   │   └── manuscript_ir.py
│   │   ├── services/
│   │   │   ├── template_seeder.py  ⭐ 6 Journal standards seeder
│   │   │   ├── docgen/             ⭐ Document Generation Engine (Module 8)
│   │   │   │   ├── formatters/     ⭐ BaseFormatter + Concrete Journal formatters
│   │   │   │   ├── generator.py    ⭐ DocumentGenerator orchestrator
│   │   │   │   └── reference_formatter.py
│   │   │   ├── preflight/
│   │   │   ├── storage/
│   │   │   ├── llm/
│   │   │   └── parsing/
│   │   └── main.py
├── frontend/
│   ├── Dockerfile          ⭐ Next.js multi-stage container build recipe
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/manuscripts/[mid]/
│   │   │   │   │       ├── editor/page.tsx
│   │   │   │   │       ├── journal/page.tsx   ⭐ Journal Selector UI
│   │   │   │   │       ├── preflight/page.tsx ⭐ Pre-flight Checklist UI
│   │   │   │   │       └── export/page.tsx    ⭐ Document Export & Download UI
│   │   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   │   ├── use-auth.tsx
│   │   │   ├── use-manuscripts.ts
│   │   │   ├── use-journals.ts
│   │   │   ├── use-preflight.ts
│   │   │   └── use-export.ts                  ⭐ React Query export hooks
│   │   └── lib/
│   │       ├── api.ts                         ⭐ Axios client with exportApi
│   │       ├── types.ts
│   │       └── utils.ts
```

---

## ⚡ API Routes Overview (`/api/v1`)

### Document Export & Generation (Module 8)
- **`POST /api/v1/manuscripts/{id}/export`**: Triggers journal-compliant `.docx` generation from `CHECKLIST_PASSED` manuscripts.
- **`GET /api/v1/manuscripts/{id}/export/status`**: Checks export progress and retrieved storage key.
- **`GET /api/v1/manuscripts/{id}/export/download`**: Obtains presigned/direct download URL for generated `.docx`.

### Pre-flight Checklist & Health Evaluation
- **`POST /api/v1/manuscripts/{id}/preflight`**: Evaluates manuscript metadata against target journal rules.
- **`GET /api/v1/manuscripts/{id}/preflight`**: Retrieves latest evaluation results.
- **`POST /api/v1/manuscripts/{id}/preflight/override`**: Overrides warnings with human rationale.
- **`POST /api/v1/manuscripts/{id}/preflight/confirm`**: Verifies zero unresolved `FAIL` items (`TARGET_SELECTED` → `CHECKLIST_PASSED`).

### Journal Templates & Standards
- **`GET /api/v1/journals`**: Lists active target journal templates.
- **`GET /api/v1/journals/{id_or_slug}`**: Retrieves detailed template with validation rules.
- **`POST /api/v1/journals/seed`**: Seeds 6 target journal standards.

### Manuscripts & Pipeline
- **`POST /api/v1/manuscripts/{id}/parse`**: Parses `.docx` (`DRAFT` → `PARSED`).
- **`PATCH /api/v1/manuscripts/{id}/metadata`**: Commits edited IR (`PARSED` → `EDITED`).
- **`PATCH /api/v1/manuscripts/{id}/target-journal`**: Assigns target journal (`EDITED` → `TARGET_SELECTED`).
- **`GET /api/v1/manuscripts/{id}/metadata`**: Fetches canonical `ManuscriptIR`.
- **`GET /api/v1/manuscripts/{id}/assets`**: Fetches extracted figures and tables.

---

## 📖 Complete Installation & Setup Guide

### System Prerequisites
Ensure you have the following installed on your machine:
- **Python 3.10+** (Tested on Python 3.11)
- **Node.js 18+** & **npm**
- **PostgreSQL 14+** (Or use a free [Neon](https://neon.tech) cloud PostgreSQL database, or Docker)
- **Docker & Docker Compose** *(Optional, if using containerized setup)*

---

### Option A: Local Development Setup (Step-by-Step)

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd swiss2
```

#### 2. Backend Setup
1. Navigate into the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Install backend dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install -e .
   ```
4. Create your `.env` configuration file inside `backend/`:
   ```env
   # Database (Replace with your local or Neon Postgres connection string)
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/swiss2
   DATABASE_ECHO=false

   # Authentication
   JWT_SECRET_KEY=super-secret-jwt-signing-key-for-development
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
   JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

   # Local Document Storage
   STORAGE_PROVIDER=local
   LOCAL_STORAGE_DIR=data/storage

   # Optional LLM Metadata Extraction Fallback
   LLM_PROVIDER=openai
   OPENAI_API_KEY=
   ```
5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will automatically start on `http://localhost:8000` and seed the 6 journal templates into the database.*

---

#### 3. Frontend Setup
1. In a new terminal window, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create your `.env.local` file inside `frontend/`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Start the Next.js frontend development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### Option B: Docker Compose Setup (One-Command Deployment)

If you prefer running everything in containers without configuring local Python or Node environments:

1. In the project root directory, run:
   ```bash
   docker-compose up --build
   ```
2. This automatically:
   - Spawns a dedicated PostgreSQL 16 container (`port 5432`)
   - Runs database migrations & starts the FastAPI backend (`http://localhost:8000`)
   - Builds and boots the Next.js production frontend (`http://localhost:3000`)
   - Mounts persistent storage volumes for databases and generated `.docx` exports.

---

### 🧪 Verifying the Submission Flow

1. Register an account at `http://localhost:3000/register` or sign in.
2. Click **"+ New Project"** and create a research project.
3. Upload any standard `.docx` manuscript.
4. Click **"Parse Manuscript"** to extract title, authors, affiliations, sections, and statements.
5. In the **Metadata Editor**, review the extracted fields or add any missing details.
6. Click **"Select Target Journal"** and choose from **Nature**, **IEEE**, **Medical Image Analysis**, **Radiology**, or **MIDL**.
7. In the **Pre-flight Checklist**, verify structural compliance and check off human confirmation.
8. On the **Export** page, click **"Generate Document"** to compile the formatted output and download your submission-ready `.docx` package!
