import type { WhiteboardExport } from "@/features/whiteboard/types";
import { getApiUrl, withAuthHeaders } from "@/lib/api";

export type ReactionValue = "like" | "dislike" | null;

/** Gallery card data for the browse page. */
export interface GalleryEntry {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  word: string;
  document: WhiteboardExport;
  likes: number;
  dislikes: number;
  myReaction: ReactionValue;
  publishedAt: number;
  hasReplay: boolean;
}

interface GalleryApiItem {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  word: string;
  document: WhiteboardExport;
  likes: number;
  dislikes: number;
  my_reaction?: "like" | "dislike" | null;
  published_at?: string | null;
  created_at: string;
  has_replay?: boolean;
}

interface GalleryListApi {
  items: GalleryApiItem[];
  total: number;
}

const EMPTY_DOCUMENT: WhiteboardExport = {
  version: 1,
  viewBox: { width: 800, height: 800 },
  shapes: [],
  exportedAt: 0,
};

function mapItem(item: GalleryApiItem): GalleryEntry {
  const published = item.published_at ?? item.created_at;
  const document =
    item.document && Array.isArray(item.document.shapes)
      ? item.document
      : EMPTY_DOCUMENT;
  return {
    id: item.id,
    authorId: item.author_id,
    authorName: item.author_name,
    authorAvatarUrl: item.author_avatar_url ?? null,
    word: item.word,
    document,
    likes: item.likes ?? 0,
    dislikes: item.dislikes ?? 0,
    myReaction: item.my_reaction ?? null,
    publishedAt: published ? Date.parse(published) : Date.now(),
    hasReplay: Boolean(item.has_replay),
  };
}

export async function fetchGalleryEntries(opts?: {
  sort?: "recent" | "top";
  authorId?: string;
  q?: string;
}): Promise<GalleryEntry[]> {
  const params = new URLSearchParams();
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.authorId) params.set("author_id", opts.authorId);
  if (opts?.q) params.set("q", opts.q);
  const qs = params.toString();
  const response = await fetch(
    `${getApiUrl()}/gallery${qs ? `?${qs}` : ""}`,
    {
      credentials: "include",
      headers: withAuthHeaders(),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to load gallery.");
  }
  const data = (await response.json()) as GalleryListApi;
  return (data.items ?? []).map(mapItem);
}

export async function setGalleryReaction(
  drawingId: string,
  reaction: ReactionValue,
): Promise<{ likes: number; dislikes: number; myReaction: ReactionValue }> {
  const response = await fetch(`${getApiUrl()}/gallery/${drawingId}/reaction`, {
    method: "PUT",
    credentials: "include",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ reaction }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(payload?.detail ?? "Failed to update reaction.");
  }
  const data = (await response.json()) as {
    likes: number;
    dislikes: number;
    my_reaction: ReactionValue;
  };
  return {
    likes: data.likes,
    dislikes: data.dislikes,
    myReaction: data.my_reaction ?? null,
  };
}
