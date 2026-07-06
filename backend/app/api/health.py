from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
def health_check() -> dict[str, str, str]:
    return {"status": "ok", "message": "Service is healthy"}
