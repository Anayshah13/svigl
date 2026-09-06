"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/FadeIn";

export type LegalTocItem = {
  id: string;
  label: string;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  description: string;
  toc: LegalTocItem[];
  relatedHref: string;
  relatedLabel: string;
  children: ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  lastUpdated,
  description,
  toc,
  relatedHref,
  relatedLabel,
  children,
}: LegalDocumentProps) {
  return (
    <div className="page-shell page-shell-narrow gap-8 pb-16 sm:gap-10 sm:pb-20">
      <FadeIn y={16}>
        <header className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-plum">{eyebrow}</p>
          <div className="space-y-3">
            <h1 className="font-display text-[clamp(2rem,6vw,2.75rem)] leading-[1.1] tracking-tight text-ink">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
            <p>
              Last updated:{" "}
              <time dateTime="2026-08-04" className="font-medium text-ink">
                {lastUpdated}
              </time>
            </p>
            <span aria-hidden="true" className="hidden text-plum/30 sm:inline">
              ·
            </span>
            <Link
              href={relatedHref}
              className="font-medium text-plum transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 focus-visible:ring-offset-2"
            >
              {relatedLabel}
            </Link>
          </div>
        </header>
      </FadeIn>

      <FadeIn delay={0.04} y={12}>
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
                  className="group flex items-start gap-2 rounded-lg px-1 py-1 text-sm text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
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

      <FadeIn delay={0.08} y={12}>
        <article className="legal-prose rounded-3xl border border-white/80 bg-white/85 px-5 py-8 shadow-[var(--shadow-card)] backdrop-blur-md sm:px-8 sm:py-10">
          {children}
        </article>
      </FadeIn>

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
              href="/policies"
              className="font-medium text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Privacy Policy
            </Link>
            <Link
              href="/termsandconditions"
              className="font-medium text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/feedback"
              className="font-medium text-ink-muted transition-colors hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Feedback
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2
        id={`${id}-heading`}
        className="border-b border-plum/10 pb-3 font-display text-xl tracking-tight text-ink sm:text-2xl"
      >
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-[0.975rem] leading-[1.75] text-ink/90 sm:text-base">
        {children}
      </div>
    </section>
  );
}
