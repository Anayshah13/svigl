import type { GalleryEntry } from "@/types/domain";
import { GALLERY_ENTRIES } from "@/services/data/galleryEntries";

export function fetchGalleryEntries(): Promise<GalleryEntry[]> {
  return Promise.resolve(GALLERY_ENTRIES);
}
