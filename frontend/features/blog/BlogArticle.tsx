"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import type { BlogTocItem } from "@/features/blog/markdown";
import { AUTHOR_NAME, AUTHOR_PORTFOLIO_URL } from "@/lib/seo";

type BlogArticleProps = {
  title: string;
  description: string;
  toc: BlogTocItem[];
  children: ReactNode;
};

export function BlogArticle({ title, description, toc, children }: BlogArticleProps) {
  return (
    <div className="page-shell page-shell-narrow gap-8 pb-16 sm:gap-10 sm:pb-20">
      <article>
        <FadeIn y={16}>
          <header className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-plum">Blog</p>
            <div className="space-y-3">
              <h1 className="font-display text-[clamp(2rem,6vw,2.75rem)] leading-[1.1] tracking-tight text-ink">
                {title}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {description}
              </p>
            </div>
            <p className="text-sm text-ink-muted">
              By{" "}
              <a
                href={AUTHOR_PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-plum transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 focus-visible:ring-offset-2"
              >
                {AUTHOR_NAME}
              </a>
            </p>
          </header>
        </FadeIn>

        <FadeIn delay={0.04} y={12} className="mt-8 sm:mt-10">
          <nav
            aria-label="Table of contents"
            className="rounded-2xl border border-plum/10 bg-white/70 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">On this page</p>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {toc.map((item, index) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group flex min-h-11 items-start gap-2 rounded-lg px-1 py-2 text-sm text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 sm:min-h-0 sm:py-1"
                  >
                    <span className="mt-0.5 font-mono text-[11px] text-plum/50 group-hover:text-plum">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug">{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </FadeIn>

        <FadeIn delay={0.08} y={12} className="mt-8 sm:mt-10">
          <div className="legal-prose blog-prose rounded-3xl border border-white/80 bg-white/85 px-5 py-8 shadow-[var(--shadow-card)] backdrop-blur-md sm:px-8 sm:py-10">
            {children}
          </div>
        </FadeIn>
      </article>

      <FadeIn delay={0.1} y={10}>
        <div className="flex flex-col gap-3 border-t border-plum/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-plum transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 focus-visible:ring-offset-2"
          >
            ← Back to Svigl
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link
              href="/gallery"
              className="font-medium text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Gallery
            </Link>
            <Link
              href="/labs"
              className="font-medium text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Labs
            </Link>
            <a
              href={AUTHOR_PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Portfolio
            </a>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
