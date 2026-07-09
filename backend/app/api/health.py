from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
def root_health_check() -> dict[str, str]:
    return {"status": "ok", "message": "Service is healthy"}


@router.get("/health")
def health_check() -> dict[str, str]:
    """Railway / container health probe."""
    return {"status": "ok"}
