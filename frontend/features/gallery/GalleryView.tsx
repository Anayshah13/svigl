"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { WhiteboardPreview } from "@/components/reactions/WhiteboardPreview";
import { Input } from "@/components/ui/Input";
import { DotPulseGrid } from "@/features/loaders";
import {
  fetchGalleryEntries,
  setGalleryReaction,
  type GalleryEntry,
  type ReactionValue,
} from "@/services/gallery";
import { colors } from "@/lib/colors";
import { useSessionStore } from "@/stores/session";

type Filter = "recent" | "top" | "mine";

const AVATAR_COLORS = [colors.chartreuse, colors.pink, colors.green, colors.plum, colors.ink];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function GalleryCard({
  entry,
  canReact,
  onReact,
}: {
  entry: GalleryEntry;
  canReact: boolean;
  onReact: (id: string, reaction: ReactionValue) => void;
}) {
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
          <WhiteboardPreview document={entry.document} className="h-full w-full" />
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
          <ReactionBar
            likes={entry.likes}
            dislikes={entry.dislikes}
            myReaction={entry.myReaction}
            disabled={!canReact}
            onReact={canReact ? (next) => onReact(entry.id, next) : undefined}
            size="sm"
          />
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
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("recent");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGalleryEntries({
        sort: filter === "top" ? "top" : "recent",
        authorId: filter === "mine" ? authUser?.id : undefined,
        q: search.trim() || undefined,
      });
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, filter, search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, search ? 200 : 0);
    return () => window.clearTimeout(handle);
  }, [load, search]);

  const onReact = useCallback(
    async (id: string, reaction: ReactionValue) => {
      if (!authUser) return;
      const previous = entries.find((e) => e.id === id);
      if (!previous) return;
      // Optimistic
      setEntries((list) =>
        list.map((entry) => {
          if (entry.id !== id) return entry;
          let likes = entry.likes;
          let dislikes = entry.dislikes;
          if (entry.myReaction === "like") likes = Math.max(0, likes - 1);
          if (entry.myReaction === "dislike") dislikes = Math.max(0, dislikes - 1);
          if (reaction === "like") likes += 1;
          if (reaction === "dislike") dislikes += 1;
          return { ...entry, likes, dislikes, myReaction: reaction };
        }),
      );
      try {
        const result = await setGalleryReaction(id, reaction);
        setEntries((list) =>
          list.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  likes: result.likes,
                  dislikes: result.dislikes,
                  myReaction: result.myReaction,
                }
              : entry,
          ),
        );
      } catch {
        setEntries((list) =>
          list.map((entry) => (entry.id === id ? previous : entry)),
        );
      }
    },
    [authUser, entries],
  );

  const filtered = useMemo(() => {
    // Server already filters mine/top/search; keep client sort stable for "recent".
    if (filter === "top") {
      return [...entries].sort((a, b) => b.likes - a.likes);
    }
    return entries;
  }, [entries, filter]);

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
              Vector sketches from live games — reactions carry over from the round.
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

      {!loading && error ? (
        <p className="rounded-2xl border border-dashed border-pink/30 bg-pink/5 px-4 py-8 text-center text-sm text-ink-muted">
          {error}
        </p>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-plum/20 bg-white/80 px-4 py-12 text-center text-sm text-ink-muted">
          {filter === "mine"
            ? "You haven’t published any drawings yet. Finish a drawing round to appear here."
            : "No drawings yet — play a round and the gallery will fill up."}
        </p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <FadeInStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((entry) => (
            <GalleryCard
              key={entry.id}
              entry={entry}
              canReact={Boolean(authUser) && authUser?.id !== entry.authorId}
              onReact={onReact}
            />
          ))}
        </FadeInStagger>
      ) : null}
    </div>
  );
}
