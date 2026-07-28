import type { Metadata } from "next";
import { LabsLeaderboardView } from "@/features/labs";

export const metadata: Metadata = {
  title: "Labs Leaderboard — Svigl",
  description: "Browse top scores across every Svigl Labs challenge.",
};

export default function LabsLeaderboardPage() {
  return <LabsLeaderboardView />;
}
