import type { LabLeaderboardSummary, LeaderboardEntry } from "./types";
import { LAB_SLUGS, type LabSlug } from "./config";

/**
 * Mock leaderboard data for UI development.
 * Replace with API-backed fetches when labs scoring ships —
 * keep the same shapes so views stay unchanged.
 */
const MOCK_ENTRIES: Record<LabSlug, LeaderboardEntry[]> = {
  "perfect-circle": [
    { rank: 1, player: "mira.ink", score: 99.4, date: "2026-07-22" },
    { rank: 2, player: "vector_vibe", score: 98.9, date: "2026-07-21" },
    { rank: 3, player: "curvequeen", score: 98.1, date: "2026-07-20" },
    { rank: 4, player: "anay", score: 97.6, date: "2026-07-19" },
    { rank: 5, player: "looply", score: 96.8, date: "2026-07-18" },
    { rank: 6, player: "softstroke", score: 95.2, date: "2026-07-17" },
    { rank: 7, player: "pixelpetal", score: 94.7, date: "2026-07-16" },
    { rank: 8, player: "drawhaven", score: 93.1, date: "2026-07-15" },
  ],
  "perfect-square": [
    { rank: 1, player: "edgecraft", score: 98.7, date: "2026-07-23" },
    { rank: 2, player: "boxy", score: 97.9, date: "2026-07-22" },
    { rank: 3, player: "rightangle", score: 96.4, date: "2026-07-21" },
    { rank: 4, player: "mira.ink", score: 95.8, date: "2026-07-20" },
    { rank: 5, player: "gridlock", score: 94.2, date: "2026-07-18" },
    { rank: 6, player: "anay", score: 92.5, date: "2026-07-17" },
  ],
  "perfect-triangle": [
    { rank: 1, player: "triad", score: 97.5, date: "2026-07-24" },
    { rank: 2, player: "equi_nova", score: 96.9, date: "2026-07-23" },
    { rank: 3, player: "peakline", score: 95.3, date: "2026-07-21" },
    { rank: 4, player: "vector_vibe", score: 94.0, date: "2026-07-19" },
    { rank: 5, player: "softstroke", score: 91.8, date: "2026-07-16" },
  ],
  "infinity-loop": [
    { rank: 1, player: "looply", score: 96.2, date: "2026-07-25" },
    { rank: 2, player: "figure8", score: 94.8, date: "2026-07-24" },
    { rank: 3, player: "curvequeen", score: 93.6, date: "2026-07-22" },
    { rank: 4, player: "flowstate", score: 91.1, date: "2026-07-20" },
    { rank: 5, player: "mira.ink", score: 89.4, date: "2026-07-18" },
    { rank: 6, player: "anay", score: 87.9, date: "2026-07-17" },
    { rank: 7, player: "drawhaven", score: 85.0, date: "2026-07-14" },
  ],
};

export function getMockLeaderboard(slug: string): LeaderboardEntry[] {
  if (!(slug in MOCK_ENTRIES)) return [];
  return MOCK_ENTRIES[slug as LabSlug];
}

export function getMockLeaderboardSummaries(): LabLeaderboardSummary[] {
  return LAB_SLUGS.map((slug) => {
    const entries = MOCK_ENTRIES[slug];
    return {
      slug,
      topScore: entries[0]?.score ?? null,
      entryCount: entries.length,
    };
  });
}

export function formatLabScore(score: number): string {
  return score.toFixed(1);
}

export function formatLabDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
