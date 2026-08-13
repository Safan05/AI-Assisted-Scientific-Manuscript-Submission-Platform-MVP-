from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.core.deps import SessionDep
from app.schemas.auth import RegisterRequest, TokenResponse
from app.services import auth_service

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(session: SessionDep, user_in: RegisterRequest):
    return await auth_service.register(session, user_in)

@router.post("/login", response_model=TokenResponse)
async def login(session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()):
    return await auth_service.authenticate(session, form_data)
