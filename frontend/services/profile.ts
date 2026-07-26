import { profileHandle } from "@/lib/names";

export interface ProfileStats {
  username: string;
  handle: string;
  drawingsDone: number;
  likesReceived: number;
  dislikesReceived: number;
}

export interface ProfileData {
  stats: ProfileStats;
  drawings: [];
}

export async function fetchProfile(
  username?: string,
  opts?: {
    drawingsDone?: number;
    likesReceived?: number;
    dislikesReceived?: number;
  },
): Promise<ProfileData> {
  const name = username?.trim() || "Player";
  return {
    stats: {
      username: name,
      handle: profileHandle(name),
      drawingsDone: opts?.drawingsDone ?? 0,
      likesReceived: opts?.likesReceived ?? 0,
      dislikesReceived: opts?.dislikesReceived ?? 0,
    },
    drawings: [],
  };
}
