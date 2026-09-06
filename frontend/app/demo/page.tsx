import type { Metadata } from "next";
import { DemoGameView } from "@/features/demo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Demo",
  description:
    "Try an offline demo of Svigl, Anay Shah’s multiplayer SVG drawing and guessing game.",
  path: "/demo",
});

export default function DemoPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Demo", path: "/demo" },
        ])}
      />
      <DemoGameView />
    </>
  );
}
