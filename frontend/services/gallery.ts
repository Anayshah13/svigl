import type { GalleryEntry } from "@/types/domain";
import { MOCK_GALLERY_ENTRIES } from "@/services/data/galleryEntries";

export async function fetchGalleryEntries(): Promise<GalleryEntry[]> {
  return MOCK_GALLERY_ENTRIES;
}
