export const WEEKLY_GAME_SLUGS = [
  "sports",
  "places",
  "motion",
  "pop-culture",
  "wild-card",
] as const;

export type WeeklyGameSlug = (typeof WEEKLY_GAME_SLUGS)[number];

export const FREE_PLAY_SLUG = "free-play";

export function isWeeklyGameSlug(value: string): value is WeeklyGameSlug {
  return (WEEKLY_GAME_SLUGS as readonly string[]).includes(value);
}

export function aiGuesserPath(): string {
  return "/ai-guesser";
}

export function aiGuesserGamePath(slug: string): string {
  return `/ai-guesser/${slug}`;
}

export function aiGuesserLeaderboardPath(slug: string): string {
  return `/ai-guesser/${slug}/leaderboard`;
}

export function aiGuesserFreePlayPath(): string {
  return "/ai-guesser/free-play";
}
