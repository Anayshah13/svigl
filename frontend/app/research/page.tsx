import type { Metadata } from "next";
import { ResearchView } from "@/features/research";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Research",
  description:
    "Comparative study of sketch recognition methods — live Gemini vs stroke RNNs, CNNs, Sketch-RNN, and Jev.",
  path: "/research",
  index: false,
});

export default function ResearchPage() {
  return <ResearchView />;
}
