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
