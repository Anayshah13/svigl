import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/features/legal/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Privacy Policy — Svigl",
  description:
    "How Svigl collects, uses, stores, and handles information when you use the multiplayer drawing game.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
