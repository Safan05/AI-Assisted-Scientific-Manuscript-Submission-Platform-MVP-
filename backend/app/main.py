from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import async_session_maker
from app.services.template_seeder import seed_journal_templates

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed baseline journal templates on startup
    try:
        async with async_session_maker() as session:
            await seed_journal_templates(session)
    except Exception as e:
        print(f"Startup seeding notice: {e}")
    yield

app = FastAPI(
    title="Swiss2 API",
    version="0.1.0",
    description="API for AI-Assisted Scientific Manuscript Platform",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.router import api_router

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
