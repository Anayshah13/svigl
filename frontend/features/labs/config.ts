import type { LabConfig } from "./types";

/**
 * Central registry for Svigl Labs.
 *
 * Adding a lab:
 * 1. Append a config object here (slug becomes the route segment).
 * 2. Add an icon in `components/LabIcon.tsx` if you introduce a new `icon` key.
 * 3. Valid scores automatically update the local leaderboard store.
 *
 * Routes (`/labs/[lab]`, `/labs/leaderboard/[lab]`) resolve from this list —
 * no new page files required.
 */
export const LABS = [
  {
    id: "perfect-circle",
    slug: "perfect-circle",
    name: "Perfect Circle",
    description: "Draw the most perfect freehand circle possible.",
    difficulty: "easy",
    status: "available",
    accent: "plum",
    icon: "circle",
  },
  {
    id: "perfect-square",
    slug: "perfect-square",
    name: "Perfect Square",
    description: "Draw a perfect square completely freehand.",
    difficulty: "medium",
    status: "available",
    accent: "green",
    icon: "square",
  },
  {
    id: "perfect-triangle",
    slug: "perfect-triangle",
    name: "Perfect Triangle",
    description: "Draw an accurate equilateral triangle.",
    difficulty: "medium",
    status: "available",
    accent: "pink",
    icon: "triangle",
  },
  {
    id: "infinity-loop",
    slug: "infinity-loop",
    name: "Infinity Loop",
    description: "Draw the smoothest infinity loop in one stroke.",
    difficulty: "hard",
    status: "available",
    accent: "chartreuse",
    icon: "infinity",
  },
] as const satisfies readonly LabConfig[];

export type LabSlug = (typeof LABS)[number]["slug"];

export const LAB_SLUGS: readonly LabSlug[] = LABS.map((lab) => lab.slug);

const LAB_BY_SLUG = new Map<string, LabConfig>(
  LABS.map((lab) => [lab.slug, lab as LabConfig]),
);

export function isLabSlug(value: string): value is LabSlug {
  return LAB_BY_SLUG.has(value);
}

export function getLabBySlug(slug: string): LabConfig | undefined {
  return LAB_BY_SLUG.get(slug);
}

export function getAllLabs(): readonly LabConfig[] {
  return LABS;
}

export function labPath(slug: string): string {
  return `/labs/${slug}`;
}

export function labsPath(): string {
  return "/labs";
}

export function labsLeaderboardPath(): string {
  return "/labs/leaderboard";
}

export function labLeaderboardPath(slug: string): string {
  return `/labs/leaderboard/${slug}`;
}
