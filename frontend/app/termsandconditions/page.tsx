import type { Metadata } from "next";
import { TermsContent } from "@/features/legal/TermsContent";

export const metadata: Metadata = {
  title: "Terms & Conditions — Svigl",
  description:
    "Terms and conditions for using Svigl, the browser-based multiplayer drawing game.",
};

export default function TermsAndConditionsPage() {
  return <TermsContent />;
}
