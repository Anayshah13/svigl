import { getApiUrl, withAuthHeaders } from "@/lib/api";
import { formatDisplayName, profileHandle, profileSlug } from "@/lib/names";

export interface PublicProfile {
  id: string;
  provider: "google" | "guest";
  username: string;
  handle: string;
  avatarUrl: string | null;
  drawingsDone: number;
  likesReceived: number;
  dislikesReceived: number;
}

interface PublicUserApi {
  id: string;
  provider: "google" | "guest";
  name: string;
  avatar_url: string | null;
  drawings_done?: number;
  likes_received?: number;
  dislikes_received?: number;
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile> {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("Username is required.");
  }

  const slug = profileSlug(trimmed);
  const response = await fetch(
    `${getApiUrl()}/users/${encodeURIComponent(slug)}`,
    {
      credentials: "include",
      headers: withAuthHeaders(),
    },
  );

  if (response.status === 404) {
    throw new Error("Profile not found.");
  }

  if (!response.ok) {
    throw new Error("Failed to load profile.");
  }

  const data = (await response.json()) as PublicUserApi;
  const displayName = formatDisplayName(data.name);
  return {
    id: data.id,
    provider: data.provider,
    username: displayName,
    handle: profileHandle(displayName),
    avatarUrl: data.avatar_url ?? null,
    drawingsDone: data.drawings_done ?? 0,
    likesReceived: data.likes_received ?? 0,
    dislikesReceived: data.dislikes_received ?? 0,
  };
}
