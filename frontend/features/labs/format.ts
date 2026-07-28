/**
 * Labs leaderboard formatting helpers (no seed/mock scores).
 */

export function formatLabScore(score: number): string {
  return score.toFixed(1);
}

export function formatLabDate(isoDate: string): string {
  // Accept YYYY-MM-DD or full ISO timestamps.
  const date = isoDate.includes("T")
    ? new Date(isoDate)
    : new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
