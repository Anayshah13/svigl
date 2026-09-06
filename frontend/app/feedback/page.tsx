import type { Metadata } from "next";
import { FeedbackPage } from "@/features/feedback/FeedbackPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Feedback",
  description:
    "Report a bug or send feedback about Svigl, the multiplayer SVG drawing game by Anay Shah.",
  path: "/feedback",
});

export default function FeedbackRoute() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Feedback", path: "/feedback" },
        ])}
      />
      <FeedbackPage />
    </>
  );
}
