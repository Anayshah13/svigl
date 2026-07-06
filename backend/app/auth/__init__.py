"""Authentication helpers for Google OAuth and JWT sessions."""

from app.auth.cookies import clear_auth_cookie, get_token_from_request, set_auth_cookie
from app.auth.dependencies import get_current_user
from app.auth.exceptions import AuthError, UserPersistenceError
from app.auth.jwt import JWTVerificationError, create_access_token, verify_access_token
from app.auth.oauth_flow import complete_google_login, redirect_to_google_consent
from app.auth.repository import authenticate_guest, find_user_by_provider, upsert_user_from_google
from app.auth.schemas import GoogleProfile

__all__ = [
    "AuthError",
    "GoogleProfile",
    "JWTVerificationError",
    "UserPersistenceError",
    "authenticate_guest",
    "clear_auth_cookie",
    "complete_google_login",
    "create_access_token",
    "find_user_by_provider",
    "get_current_user",
    "get_token_from_request",
    "redirect_to_google_consent",
    "set_auth_cookie",
    "upsert_user_from_google",
    "verify_access_token",
]
