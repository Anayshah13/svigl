"""Fire the existing EmailJS feedback template for AI-guesser limit events.

Uses the same template_params as `frontend/services/feedback.ts` so the
dashboard email looks identical to a /feedback submission.
"""

from __future__ import annotations

import logging
import threading

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send"
LIMIT_ALERT_MESSAGE = "LIMIT REACHED / POTENTIAL LIMIT BREAKER SPOTTED"


def is_configured() -> bool:
    return bool(
        settings.emailjs_service_id
        and settings.emailjs_template_id
        and settings.emailjs_public_key
    )


def send_limit_alert(reason: str = "") -> None:
    """Queue a mail without blocking the 429 response."""
    if not is_configured():
        return
    thread = threading.Thread(
        target=_deliver,
        args=(reason,),
        daemon=True,
        name="emailjs-limit-alert",
    )
    thread.start()


def _deliver(reason: str) -> None:
    to_addr = (settings.emailjs_alert_to or "").strip() or "anayshah10@gmail.com"
    if reason:
        logger.info("ai-guesser limit alert reason=%s", reason)

    payload = {
        "service_id": settings.emailjs_service_id,
        "template_id": settings.emailjs_template_id,
        "user_id": settings.emailjs_public_key,
        "template_params": {
            "feedback_type": "Bug report",
            "from_name": "Svigl AI Guesser",
            "from_email": to_addr,
            "reply_to": to_addr,
            "message": LIMIT_ALERT_MESSAGE,
        },
    }

    try:
        response = httpx.post(EMAILJS_SEND_URL, json=payload, timeout=8.0)
        if response.status_code >= 400:
            logger.warning(
                "emailjs limit alert failed status=%s — enable "
                "'Allow API requests from non-browser origins' in "
                "the EmailJS account security settings if this is 403",
                response.status_code,
            )
    except httpx.HTTPError as exc:
        logger.warning("emailjs limit alert transport error: %s", type(exc).__name__)
