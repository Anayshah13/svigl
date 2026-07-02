import type { GalleryEntry } from "@/types/domain";
import { MOCK_GALLERY_ENTRIES } from "@/services/data/galleryEntries";

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

function emptyProfile(name: string): ProfileData {
  return {
    stats: {
      username: name,
      handle: `@${name.toUpperCase().slice(0, 4) || "PLAY"}`,
      level: 1,
      xp: 0,
      xpNext: 500,
      gamesPlayed: 0,
      drawingsPublished: 0,
      totalUpvotes: 0,
      correctGuesses: 0,
    },
    drawings: [],
  };
}

export async function fetchProfile(username?: string): Promise<ProfileData> {
  const name = username?.trim() || "Player";
  const drawings = MOCK_GALLERY_ENTRIES.filter(
    (entry) => entry.authorName.toLowerCase() === name.toLowerCase(),
  );

  if (drawings.length === 0) {
    return emptyProfile(name);
  }

  const totalUpvotes = drawings.reduce((sum, entry) => sum + entry.upvotes, 0);

  return {
    stats: {
      username: name,
      handle: `@${name.toUpperCase().slice(0, 4)}`,
      level: 2,
      xp: 320,
      xpNext: 500,
      gamesPlayed: 12,
      drawingsPublished: drawings.length,
      totalUpvotes,
      correctGuesses: 34,
    },
    drawings,
  };
}
