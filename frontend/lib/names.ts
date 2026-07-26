export function formatDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function profileHandle(name: string): string {
  const compact = name.replace(/\s+/g, "").slice(0, 4).toUpperCase();
  return `@${compact || "USER"}`;
}

/** URL segment for a profile — spaces become hyphens (e.g. "Anay Shah" → "Anay-Shah"). */
export function profileSlug(username: string): string {
  return username
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Canonical profile URL for a display name / username. */
export function profilePath(username: string): string {
  const slug = profileSlug(username);
  if (!slug) return "/profile";
  return `/profile/${encodeURIComponent(slug)}`;
}
