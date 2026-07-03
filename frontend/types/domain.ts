import type { DrawingDocument } from "./drawing";

/** Gallery card data for the browse page. */
export interface GalleryEntry {
  id: string;
  authorId: string;
  authorName: string;
  word: string;
  replay: DrawingDocument;
  upvotes: number;
  downvotes: number;
  publishedAt: number;
}
