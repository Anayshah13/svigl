import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/features/legal/PrivacyPolicyContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "How Svigl, the multiplayer SVG drawing game by Anay Shah, collects, uses, stores, and handles information.",
  path: "/policies",
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Privacy Policy", path: "/policies" },
        ])}
      />
      <PrivacyPolicyContent />
    </>
  );
}
