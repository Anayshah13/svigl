import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiGuesserLeaderboard } from "@/features/ai-guesser/AiGuesserLeaderboard";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";
import { WEEKLY_GAME_SLUGS, isWeeklyGameSlug } from "@/features/ai-guesser/week";

interface BoardPageProps {
  params: Promise<{ game: string }>;
}

export function generateStaticParams() {
  return WEEKLY_GAME_SLUGS.map((game) => ({ game }));
}

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const { game } = await params;
  return createPageMetadata({
    title: `AI Guesser leaderboard`,
    description: "This week’s fastest total times, with a split for each drawing.",
    path: `/ai-guesser/${game}/leaderboard`,
    index: isWeeklyGameSlug(game),
  });
}

export default async function AiGuesserLeaderboardPage({
  params,
}: BoardPageProps) {
  const { game } = await params;
  if (!isWeeklyGameSlug(game)) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "AI Guesser", path: "/ai-guesser" },
          { name: "Leaderboard", path: `/ai-guesser/${game}/leaderboard` },
        ])}
      />
      <AiGuesserLeaderboard gameSlug={game} />
    </>
  );
}
