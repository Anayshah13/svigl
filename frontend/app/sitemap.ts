import type { MetadataRoute } from "next";
import { getAllLabs } from "@/features/labs";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/gallery", changeFrequency: "daily", priority: 0.8 },
      { path: "/labs", changeFrequency: "weekly", priority: 0.8 },
      { path: "/labs/leaderboard", changeFrequency: "daily", priority: 0.6 },
      { path: "/ai-guesser", changeFrequency: "weekly", priority: 0.7 },
      { path: "/demo", changeFrequency: "monthly", priority: 0.4 },
      { path: "/feedback", changeFrequency: "yearly", priority: 0.4 },
      { path: "/sign-in", changeFrequency: "yearly", priority: 0.5 },
      { path: "/policies", changeFrequency: "yearly", priority: 0.3 },
      { path: "/termsandconditions", changeFrequency: "yearly", priority: 0.3 },
      // Included even if the blog page is owned by another change — crawlers should find it.
      { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
    ] as const
  ).map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));

  const labRoutes: MetadataRoute.Sitemap = getAllLabs().flatMap((lab) => [
    {
      url: absoluteUrl(`/labs/${lab.slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: absoluteUrl(`/labs/leaderboard/${lab.slug}`),
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.5,
    },
  ]);

  const aiGuesserRoutes: MetadataRoute.Sitemap = [
    "sports",
    "places",
    "motion",
    "pop-culture",
    "wild-card",
  ].flatMap((game) => [
    {
      url: absoluteUrl(`/ai-guesser/${game}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: absoluteUrl(`/ai-guesser/${game}/leaderboard`),
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.5,
    },
  ]);

  return [...staticRoutes, ...labRoutes, ...aiGuesserRoutes];
}
