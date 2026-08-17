# Swiss2 Scientific Manuscript Platform — Backend API

High-performance scientific manuscript processing and document generation service built with **FastAPI**, **SQLModel**, **Alembic**, and **PostgreSQL (Neon Cloud)**.

---

## 🛠️ Architecture & Features

- **Document Parsing**: Hybrid parser utilizing LF AI `Docling` with a fallback `python-docx` parser. Converts uploaded `.docx` manuscripts into a structured, journal-agnostic Intermediate Representation (`ManuscriptIR`).
- **Metadata Discrimination**: Two-pass heuristic & regex token classifier in `MetadataExtractor` with LLM augmentation for extracting titles, author hierarchies, affiliations, abstracts, citations, and required statements.
- **Pre-flight Compliance Engine**: Rule engine evaluating manuscripts against target journal guidelines (`word_count`, `required_field`, `regex`, `presence`).
- **Document Generation Engine (Module 8)**: Generates journal-compliant `.docx` packages from `ManuscriptIR` + `JournalTemplate` using custom formatters:
  - `NatureFormatter` (Nature)
  - `PlosOneFormatter` (PLOS ONE)
  - `IEEEFormatter` (IEEE Transactions)
  - `MIAFormatter` (Medical Image Analysis)
  - `RadiologyFormatter` (Radiology / RSNA)
  - `MIDLFormatter` (Medical Imaging with Deep Learning)
- **Flexible Storage Layer**: Pluggable storage providers (`LocalStorage`, `Bunny.net`, `S3`, `MinIO`).

---

## ⚙️ Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<dbname>?ssl=require
DATABASE_ECHO=false

# Authentication
JWT_SECRET_KEY=your-secure-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Storage ("local" | "bunny" | "minio" | "s3")
STORAGE_PROVIDER=local
LOCAL_STORAGE_DIR=data/storage

# LLM Metadata Extraction (Optional fallback to heuristics if unset)
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
```

---

## 🚀 Quick Start

### 1. Set Up Virtual Environment & Dependencies
```powershell
# Create & activate venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -e .
```

### 2. Database Migrations
```powershell
# Run pending Alembic migrations
.\.venv\Scripts\alembic upgrade head
```

### 3. Run Development Server
```powershell
# Start Uvicorn with auto-reload
uvicorn app.main:app --reload --port 8000
```

- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📦 Directory Structure

```text
backend/
├── alembic/              # Database migration scripts
├── app/
│   ├── api/v1/
│   │   ├── endpoints/    # Auth, Users, Projects, Manuscripts, Journals, Preflight, Export
│   │   └── router.py
│   ├── core/             # Config, security (bcrypt/JWT), dependencies
│   ├── crud/             # Async database operations
│   ├── db/               # Async session & engine setup
│   ├── models/           # SQLModel database tables
│   ├── schemas/          # Pydantic schemas (ManuscriptIR, etc.)
│   ├── services/
│   │   ├── docgen/       # Formatter registry & generator engine
│   │   ├── parsing/      # Docling & python-docx parsers, metadata extractor
│   │   ├── preflight/    # Rule verification engine
│   │   ├── storage/      # Local / S3 storage abstraction
│   │   └── template_seeder.py # Seeded standards for 6 journals
│   └── main.py
└── pyproject.toml
```
