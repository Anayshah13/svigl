import type { WhiteboardExport } from "@/features/whiteboard/types";
import type { ReactionValue } from "@/services/gallery";

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
}
