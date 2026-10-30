import type { Metadata } from "next";
import { ResearchView } from "@/features/research";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Research · AI Lab Exp. 10",
  description:
    "Comparative sketch recognition on Quick, Draw! — measured Gemini vs published stroke, CNN, and decision-model baselines.",
  path: "/research",
  index: false,
});

export default function ResearchPage() {
  return <ResearchView />;
}
