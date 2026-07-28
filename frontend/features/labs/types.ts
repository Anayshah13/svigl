export type LabDifficulty = "easy" | "medium" | "hard";

export type LabStatus = "available" | "coming_soon" | "beta";

/** Brand-aligned accent keys used for lab chrome / icons. */
export type LabAccent = "plum" | "pink" | "green" | "chartreuse" | "blue";

/**
 * Icon keys map to SVG components in `LabIcon`.
 * Add a new key + component when introducing a lab that needs a new glyph.
 */
export type LabIconId =
  | "circle"
  | "square"
  | "triangle"
  | "infinity"
  | "heart"
  | "star"
  | "hexagon"
  | "stroke"
  | "memory"
  | "match"
  | "bezier";

export type LabConfig = {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: LabDifficulty;
  status: LabStatus;
  accent: LabAccent;
  icon: LabIconId;
};

export type LeaderboardEntry = {
  rank: number;
  player: string;
  score: number;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Present when loaded from the global API. */
  userId?: string;
};

export type LabLeaderboardSummary = {
  slug: string;
  topScore: number | null;
  entryCount: number;
  topPlayer?: string | null;
};
