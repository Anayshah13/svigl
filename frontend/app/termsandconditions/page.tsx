import type { Metadata } from "next";
import { TermsContent } from "@/features/legal/TermsContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using Svigl, Anay Shah’s browser-based multiplayer SVG drawing and guessing game.",
  path: "/termsandconditions",
});

export default function TermsAndConditionsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Terms & Conditions", path: "/termsandconditions" },
        ])}
      />
      <TermsContent />
    </>
  );
}
