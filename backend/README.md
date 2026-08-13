# Swiss2 Scientific Manuscript Platform — Backend API

FastAPI, SQLModel, and Alembic based backend service connected to Neon Postgres.

Refer to the main [Root README](../README.md) for full project architecture, complete audit, API routes, and setup instructions.

## Quick Start (Backend)
```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run database migrations
alembic upgrade head

# Launch Uvicorn dev server
uvicorn app.main:app --reload --port 8000
```
API Documentation: `http://localhost:8000/docs`
