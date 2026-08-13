from fastapi import APIRouter
from app.core.deps import SessionDep, CurrentUser
from app.schemas.user import UserRead, UserUpdate
from app.crud.user import update_user

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: CurrentUser):
    return current_user

@router.patch("/me", response_model=UserRead)
async def update_current_user(
    session: SessionDep,
    current_user: CurrentUser,
    user_in: UserUpdate
):
    return await update_user(session, current_user, user_in)
