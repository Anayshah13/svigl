import type { Metadata } from "next";
import { GalleryView } from "@/features/gallery/GalleryView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Gallery",
  description:
    "Browse saved Svigl drawings and replays. Finished rounds land here automatically — like or pass on vector doodles from Anay Shah’s multiplayer game.",
  path: "/gallery",
});

export default function GalleryPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ])}
      />
      <GalleryView />
    </>
  );
}
