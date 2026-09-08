import type { Metadata } from "next";
import { AiGuesserHub } from "@/features/ai-guesser/AiGuesserHub";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI Guesser",
  description:
    "Weekly time trial: five games, five drawings each. Make AnAI guess before the clock runs out.",
  path: "/ai-guesser",
});

export default function AiGuesserPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "AI Guesser", path: "/ai-guesser" },
        ])}
      />
      <AiGuesserHub />
    </>
  );
}
