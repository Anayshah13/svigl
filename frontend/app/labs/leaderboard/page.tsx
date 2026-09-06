import type { Metadata } from "next";
import { LabsLeaderboardView } from "@/features/labs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Labs Leaderboard",
  description:
    "Browse top scores across every Svigl Labs challenge — precision drawing games by Anay Shah.",
  path: "/labs/leaderboard",
});

export default function LabsLeaderboardPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Labs", path: "/labs" },
          { name: "Leaderboard", path: "/labs/leaderboard" },
        ])}
      />
      <LabsLeaderboardView />
    </>
  );
}
