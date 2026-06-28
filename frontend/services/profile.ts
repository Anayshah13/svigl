import type { GalleryEntry } from "@/types/domain";
import { fetchGalleryEntries } from "@/services/gallery";

export interface ProfileStats {
  username: string;
  handle: string;
  level: number;
  xp: number;
  xpNext: number;
  gamesPlayed: number;
  drawingsPublished: number;
  totalUpvotes: number;
  correctGuesses: number;
}

export interface ProfileData {
  stats: ProfileStats;
  drawings: GalleryEntry[];
}

export async function fetchProfile(username?: string): Promise<ProfileData> {
  const entries = await fetchGalleryEntries();
  const name = username?.trim() || "Prototype User";
  const drawings = entries.filter(
    (e) => e.authorName.toLowerCase() === name.toLowerCase() || e.authorId === "mock-user-1",
  );
  const totalUpvotes = drawings.reduce((sum, e) => sum + e.upvotes, 0);
  const xp = 680 + totalUpvotes * 10 + drawings.length * 50;

  return {
    stats: {
      username: name,
      handle: `@${name.toUpperCase().slice(0, 4)}`,
      level: Math.floor(xp / 500) + 1,
      xp,
      xpNext: 1500,
      gamesPlayed: Math.max(drawings.length * 3, 12),
      drawingsPublished: drawings.length,
      totalUpvotes,
      correctGuesses: Math.max(Math.floor(totalUpvotes / 4), 8),
    },
    drawings,
  };
}
