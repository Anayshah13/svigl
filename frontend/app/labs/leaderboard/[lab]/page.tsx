import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  LabLeaderboardView,
  getAllLabs,
  getLabBySlug,
  isLabSlug,
} from "@/features/labs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

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
    return createPageMetadata({
      title: "Leaderboard not found",
      description: "That Svigl Labs leaderboard does not exist.",
      path: `/labs/leaderboard/${slug}`,
      index: false,
    });
  }
  return createPageMetadata({
    title: `${lab.name} leaderboard`,
    description: `Top Svigl Labs scores for ${lab.name}.`,
    path: `/labs/leaderboard/${lab.slug}`,
  });
}

export default async function LabLeaderboardPage({ params }: LabLeaderboardPageProps) {
  const { lab: slug } = await params;
  if (!isLabSlug(slug)) notFound();
  const lab = getLabBySlug(slug);
  if (!lab) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Labs", path: "/labs" },
          { name: "Leaderboard", path: "/labs/leaderboard" },
          { name: lab.name, path: `/labs/leaderboard/${lab.slug}` },
        ])}
      />
      <LabLeaderboardView lab={lab} />
    </>
  );
}
