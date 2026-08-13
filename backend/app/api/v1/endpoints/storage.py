from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.services.storage.factory import get_storage_service
from app.services.storage.local_storage import LocalStorage

router = APIRouter()

@router.get("/files/{file_path:path}")
async def get_stored_file(file_path: str):
    """
    Endpoint to retrieve/stream files when using LOCAL storage mode.
    """
    storage = get_storage_service()
    if not isinstance(storage, LocalStorage):
        raise HTTPException(status_code=400, detail="Local storage router is only active when STORAGE_PROVIDER=local")

    try:
        data = await storage.download(file_path)
        return Response(content=data)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
