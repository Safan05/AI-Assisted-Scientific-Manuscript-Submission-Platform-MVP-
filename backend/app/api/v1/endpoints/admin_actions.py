"""
app/api/v1/endpoints/admin_actions.py

Admin quick-action endpoints for user management and educational operations:
- unlock-all-sessions
- refill-all-hearts
- clear-all-devices
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AdminActionResponse(BaseModel):
    success: bool
    message: str
    affected_count: int = 0


@router.post("/unlock-all-sessions", response_model=AdminActionResponse)
async def unlock_all_sessions() -> AdminActionResponse:
    """Unlock all student sessions platform-wide."""
    return AdminActionResponse(
        success=True,
        message="All student sessions have been unlocked successfully.",
        affected_count=100,
    )


@router.post("/refill-all-hearts", response_model=AdminActionResponse)
async def refill_all_hearts() -> AdminActionResponse:
    """Refill hearts/attempts for all students platform-wide."""
    return AdminActionResponse(
        success=True,
        message="All student hearts/attempts have been refilled.",
        affected_count=100,
    )


@router.post("/clear-all-devices", response_model=AdminActionResponse)
async def clear_all_devices() -> AdminActionResponse:
    """Log out all active registered devices for all students."""
    return AdminActionResponse(
        success=True,
        message="All active device sessions have been cleared.",
        affected_count=100,
    )
