import type { Metadata } from "next";
import { LabsView } from "@/features/labs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Labs",
  description:
    "Svigl Labs by Anay Shah — train drawing precision with skill challenges like Perfect Circle, Square, Triangle, and Infinity Loop.",
  path: "/labs",
});

export default function LabsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Labs", path: "/labs" },
        ])}
      />
      <LabsView />
    </>
  );
}
