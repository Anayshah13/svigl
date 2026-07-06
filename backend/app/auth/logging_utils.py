import logging
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger("app.auth.events")


def log_auth_event(
    event: str,
    *,
    path: str,
    authenticated: bool | None = None,
    **details: Any,
) -> None:
    payload = {
        "event": event,
        "path": path,
        "timestamp": datetime.now(UTC).isoformat(),
        "authenticated": authenticated,
        **details,
    }
    logger.info("auth_event %s", payload)
