def format_person_name(name: str) -> str:
    """Capitalize the first letter of each name part."""
    parts = name.strip().split()
    if not parts:
        return name.strip()
    return " ".join(part[:1].upper() + part[1:] if part else part for part in parts)
