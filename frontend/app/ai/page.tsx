import type { Metadata } from "next";
import { AnaiGallery } from "@/features/anai";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AnAI mascots",
  description:
    "Internal doodle mascot gallery for Svigl AI Guesser — not a public product page.",
  path: "/ai",
  index: false,
});

export default function AiMascotPage() {
  return <AnaiGallery />;
}
