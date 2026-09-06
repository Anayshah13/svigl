import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { BlogArticle } from "@/features/blog/BlogArticle";
import { extractBlogMeta, MarkdownContent } from "@/features/blog/markdown";
import {
  AUTHOR_NAME,
  AUTHOR_PORTFOLIO_URL,
  ORGANIZATION_ID,
  PERSON_ID,
  WEBSITE_ID,
  absoluteUrl,
  breadcrumbJsonLd,
  createPageMetadata,
} from "@/lib/seo";

async function loadBlogMarkdown() {
  return readFile(path.join(process.cwd(), "content/blog.md"), "utf8");
}

export async function generateMetadata(): Promise<Metadata> {
  const markdown = await loadBlogMarkdown();
  const { title, description } = extractBlogMeta(markdown);
  const pageMeta = createPageMetadata({
    title,
    description,
    path: "/blog",
  });

  return {
    ...pageMeta,
    authors: [{ name: AUTHOR_NAME, url: AUTHOR_PORTFOLIO_URL }],
    creator: AUTHOR_NAME,
    openGraph: {
      ...pageMeta.openGraph,
      type: "article",
    },
  };
}

export default async function BlogPage() {
  const markdown = await loadBlogMarkdown();
  const { title, description, toc } = extractBlogMeta(markdown);
  const url = absoluteUrl("/blog");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Svigl", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          name: title,
          description,
          author: { "@id": PERSON_ID },
          creator: { "@id": PERSON_ID },
          publisher: { "@id": ORGANIZATION_ID },
          isPartOf: { "@id": WEBSITE_ID },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url,
          },
          url,
        }}
      />
      <BlogArticle title={title} description={description} toc={toc}>
        <MarkdownContent markdown={markdown} skipParagraph={description} />
      </BlogArticle>
    </>
  );
}
