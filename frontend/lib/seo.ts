import type { Metadata } from "next";

/** Canonical production origin — used for metadataBase, sitemap, robots, and JSON-LD. */
export const SITE_URL = "https://svigl.com";
export const SITE_NAME = "Svigl";
export const SITE_LOCALE = "en_US";

export const AUTHOR_NAME = "Anay Shah";
export const AUTHOR_JOB_TITLE = "Founder and developer";
export const AUTHOR_PORTFOLIO_URL = "https://anay13.tech";

/**
 * Public profiles confirmed in-repo (landing footer). Do not invent extra networks.
 * No Twitter/X handle exists in this codebase.
 */
export const AUTHOR_SAME_AS = [
  "https://github.com/Anayshah13/svigl",
  "https://www.linkedin.com/in/anay-shah-5880aa264/",
  AUTHOR_PORTFOLIO_URL,
] as const;

export const ORGANIZATION_SAME_AS = [
  "https://github.com/Anayshah13/svigl",
] as const;

export const DEFAULT_TITLE = "Svigl — Multiplayer SVG Drawing Game by Anay Shah";

export const DEFAULT_DESCRIPTION =
  "Svigl is a multiplayer drawing and guessing game by Anay Shah. Every stroke is a real SVG primitive — pencil, shapes, and fills — on one shared canvas with friends.";

export const SITE_KEYWORDS = [
  "Svigl",
  "Anay Shah",
  "multiplayer drawing game",
  "SVG drawing",
  "drawing and guessing",
] as const;

export const PERSON_ID = `${SITE_URL}/#person`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function absoluteUrl(path = "/"): string {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  ogTitle?: string;
  /** Skip the root `%s | Svigl` template (use for the homepage default title). */
  absoluteTitle?: boolean;
};

/** Unique title/description/canonical/OG for a public (or noindex) page. */
export function createPageMetadata({
  title,
  description,
  path,
  index = true,
  ogTitle,
  absoluteTitle = false,
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const socialTitle = ogTitle ?? `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      locale: SITE_LOCALE,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Sitewide graph: WebSite + Person (Anay Shah) + Organization (Svigl), cross-linked. */
export function siteJsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": PERSON_ID },
        author: { "@id": PERSON_ID },
        creator: { "@id": PERSON_ID },
      },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: AUTHOR_NAME,
        url: AUTHOR_PORTFOLIO_URL,
        jobTitle: AUTHOR_JOB_TITLE,
        description:
          "Founder and developer of Svigl, a multiplayer SVG drawing and guessing game.",
        sameAs: [...AUTHOR_SAME_AS],
        affiliation: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": ["Organization", "Project"],
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        foundingDate: "2026",
        founder: { "@id": PERSON_ID },
        creator: { "@id": PERSON_ID },
        author: { "@id": PERSON_ID },
        sameAs: [...ORGANIZATION_SAME_AS],
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: DEFAULT_DESCRIPTION,
        author: { "@id": PERSON_ID },
        creator: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };
}
