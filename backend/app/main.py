from collections.abc import Awaitable, Callable

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.health import router as health_router
from app.config import settings

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.include_router(health_router)


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response


if settings.debug:
    app.add_middleware(NoCacheMiddleware)
