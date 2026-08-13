from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.user import get_user_by_email, create_user
from app.schemas.auth import RegisterRequest, TokenResponse
from app.core.security import verify_password, create_access_token

async def register(session: AsyncSession, user_in: RegisterRequest) -> TokenResponse:
    existing_user = await get_user_by_email(session, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = await create_user(session, user_in)
    
    access_token = create_access_token(subject=user.id)
    return TokenResponse(access_token=access_token)

async def authenticate(session: AsyncSession, form_data: OAuth2PasswordRequestForm) -> TokenResponse:
    user = await get_user_by_email(session, email=form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = create_access_token(subject=user.id)
    return TokenResponse(access_token=access_token)
