import type { Metadata } from "next";
import { AiGuesserView } from "@/features/ai-guesser";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI Guesser",
  description:
    "Experimental Svigl mode by Anay Shah: draw the secret word and see if the AI can guess it.",
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
      <AiGuesserView />
    </>
  );
}
