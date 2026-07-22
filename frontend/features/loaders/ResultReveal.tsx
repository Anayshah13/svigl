"use client";

import { useEffect, useState } from "react";
import { LetterBounce } from "./loaders";

const DEFAULT_MS = 1100;

/**
 * Brief Letter Bounce beat before mounting result content.
 * Resets when `revealKey` changes (new round / new game).
 */
export function ResultReveal({
  revealKey,
  children,
  label = "Getting results…",
  durationMs = DEFAULT_MS,
}: {
  revealKey: string | number;
  children: React.ReactNode;
  label?: string;
  durationMs?: number;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const id = window.setTimeout(() => setReady(true), durationMs);
    return () => window.clearTimeout(id);
  }, [revealKey, durationMs]);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-10">
        <LetterBounce size="lg" />
        <p className="text-sm font-medium text-ink-muted">{label}</p>
      </div>
    );
  }

  return <>{children}</>;
}
