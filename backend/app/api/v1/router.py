from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, projects, manuscripts, storage, parsing, journals, preflight

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(manuscripts.router, prefix="/manuscripts", tags=["manuscripts"])
api_router.include_router(parsing.router, prefix="/manuscripts", tags=["parsing"])
api_router.include_router(journals.router, prefix="/journals", tags=["journals"])
api_router.include_router(preflight.router, prefix="/manuscripts", tags=["preflight"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])

