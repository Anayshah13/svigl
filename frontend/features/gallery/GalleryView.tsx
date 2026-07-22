"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SvgRenderer } from "@/features/drawing/SvgRenderer";
import { DotPulseGrid } from "@/features/loaders";
import { fetchGalleryEntries } from "@/services/gallery";
import { colors } from "@/lib/colors";
import { useSessionStore } from "@/stores/session";
import type { GalleryEntry } from "@/types/domain";

type Filter = "recent" | "top" | "mine";

const AVATAR_COLORS = [colors.chartreuse, colors.pink, colors.green, colors.plum, colors.ink];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function GalleryCard({ entry }: { entry: GalleryEntry }) {
  const initial = entry.authorName.charAt(0).toUpperCase();
  const color = avatarColor(entry.authorName);

  return (
    <FadeInItem>
      <motion.article
        whileHover={{ y: -6, boxShadow: "0 20px 40px -12px rgb(79 70 229 / 0.12)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft)"
      >
        <div className="dot-grid aspect-square overflow-hidden bg-white">
          <SvgRenderer document={entry.replay} className="h-full w-full" />
        </div>
        <div className="flex items-center gap-3 p-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-gray-800"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{entry.word}</p>
            <p className="truncate text-sm text-gray-400">by {entry.authorName}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label={`${entry.upvotes} upvotes`}
          >
            <span>♥</span>
            <span className="font-medium">{entry.upvotes}</span>
          </motion.button>
        </div>
      </motion.article>
    </FadeInItem>
  );
}

function GallerySkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white" aria-hidden="true">
      <div className="aspect-square animate-pulse bg-gray-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "top", label: "Top voted" },
  { id: "mine", label: "My drawings" },
];

export function GalleryView() {
  const authUser = useSessionStore((s) => s.authUser);
  const displayName = useSessionStore((s) => s.displayName);
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("recent");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchGalleryEntries()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (filter === "top") {
      list.sort((a, b) => b.upvotes - a.upvotes);
    } else {
      list.sort((a, b) => b.publishedAt - a.publishedAt);
    }
    if (filter === "mine") {
      const me = authUser?.username ?? displayName;
      list = list.filter(
        (e) =>
          e.authorId === authUser?.id ||
          e.authorName.toLowerCase() === me.toLowerCase(),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.word.toLowerCase().includes(q) ||
          e.authorName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, filter, search, authUser, displayName]);

  return (
    <div className="page-shell gap-6 sm:gap-8">
      <FadeIn>
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-plum">Community</p>
            <h1 className="mt-1 text-[clamp(1.75rem,6vw,2.5rem)] font-bold tracking-tight text-ink sm:mt-2">
              Gallery
            </h1>
            <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
              Vector sketches from artists around the community.
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <svg
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search drawings…"
              className="pl-10"
            />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="-mx-1 flex gap-2 overflow-x-auto scroll-fade-x px-1 pb-1">
          {FILTERS.map(({ id, label }) => (
            <motion.button
              key={id}
              onClick={() => setFilter(id)}
              whileTap={{ scale: 0.97 }}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === id ? "text-plum" : "text-ink-muted hover:text-ink"
              }`}
            >
              {filter === id && (
                <motion.span
                  layoutId="gallery-filter"
                  className="absolute inset-0 rounded-full bg-plum-light"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          ))}
        </div>
      </FadeIn>

      {loading && (
        <div className="flex flex-col items-center gap-6">
          <DotPulseGrid size="sm" />
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <GallerySkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="border-dashed px-4 py-8 text-center sm:px-6 sm:py-10">
          <p className="font-medium text-gray-700">
            {filter === "mine" ? "No published drawings yet" : "No drawings found"}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {filter === "mine"
              ? "Publish drawings to see them here."
              : "Try a different search, or check back once players start publishing."}
          </p>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <FadeInStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((entry) => (
            <GalleryCard key={entry.id} entry={entry} />
          ))}
        </FadeInStagger>
      )}
    </div>
  );
}
