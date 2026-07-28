import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  LabLeaderboardView,
  getAllLabs,
  getLabBySlug,
  isLabSlug,
} from "@/features/labs";

interface LabLeaderboardPageProps {
  params: Promise<{ lab: string }>;
}

export function generateStaticParams() {
  return getAllLabs().map((lab) => ({ lab: lab.slug }));
}

export async function generateMetadata({
  params,
}: LabLeaderboardPageProps): Promise<Metadata> {
  const { lab: slug } = await params;
  const lab = getLabBySlug(slug);
  if (!lab) {
    return { title: "Leaderboard not found — Svigl Labs" };
  }
  return {
    title: `${lab.name} Leaderboard — Svigl Labs`,
    description: `Top players for ${lab.name}.`,
  };
}

export default async function LabLeaderboardPage({ params }: LabLeaderboardPageProps) {
  const { lab: slug } = await params;
  if (!isLabSlug(slug)) notFound();
  const lab = getLabBySlug(slug);
  if (!lab) notFound();
  return <LabLeaderboardView lab={lab} />;
}
