import re

ROOM_PATH_PATTERN = re.compile(r"^/room/[A-Z]{4}$")


def sanitize_post_auth_redirect(path: str | None) -> str | None:
    if not path:
        return None

    trimmed = path.strip()
    if not trimmed.startswith("/") or trimmed.startswith("//"):
        return None

    pathname = trimmed.split("?", 1)[0]

    if pathname == "/":
        return "/"

    if ROOM_PATH_PATTERN.match(pathname):
        return pathname

    return None
