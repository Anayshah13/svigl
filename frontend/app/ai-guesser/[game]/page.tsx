import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiGuesserFreePlay } from "@/features/ai-guesser/AiGuesserFreePlay";
import { AiGuesserView } from "@/features/ai-guesser/AiGuesserView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";
import {
  FREE_PLAY_SLUG,
  WEEKLY_GAME_SLUGS,
  isWeeklyGameSlug,
} from "@/features/ai-guesser/week";

interface GamePageProps {
  params: Promise<{ game: string }>;
}

export function generateStaticParams() {
  return [...WEEKLY_GAME_SLUGS, FREE_PLAY_SLUG].map((game) => ({ game }));
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { game } = await params;
  if (game === FREE_PLAY_SLUG) {
    return createPageMetadata({
      title: "Free Play",
      description: "Endless AI Guesser drawings, unlocked after this week’s five games.",
      path: "/ai-guesser/free-play",
    });
  }
  if (!isWeeklyGameSlug(game)) {
    return createPageMetadata({
      title: "Game not found",
      description: "That weekly AI Guesser set does not exist.",
      path: `/ai-guesser/${game}`,
      index: false,
    });
  }
  return createPageMetadata({
    title: `AI Guesser · ${game}`,
    description: "Draw five secrets before the clock runs out. Faster guesses rank higher.",
    path: `/ai-guesser/${game}`,
  });
}

export default async function AiGuesserGamePage({ params }: GamePageProps) {
  const { game } = await params;
  if (game === FREE_PLAY_SLUG) {
    return (
      <>
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Svigl", path: "/" },
            { name: "AI Guesser", path: "/ai-guesser" },
            { name: "Free Play", path: "/ai-guesser/free-play" },
          ])}
        />
        <AiGuesserFreePlay />
      </>
    );
  }
  if (!isWeeklyGameSlug(game)) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "AI Guesser", path: "/ai-guesser" },
          { name: game, path: `/ai-guesser/${game}` },
        ])}
      />
      <AiGuesserView gameSlug={game} />
    </>
  );
}
