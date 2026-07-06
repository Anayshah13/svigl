class AuthError(Exception):
    """Raised when Google OAuth or profile validation fails."""


class UserPersistenceError(Exception):
    """Raised when persisting an authenticated user to the database fails."""
