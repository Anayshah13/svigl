"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { SvgRenderer } from "@/features/drawing/SvgRenderer";
import { ProfileEditor } from "@/features/profile/ProfileEditor";
import { formatDisplayName, profileHandle } from "@/lib/names";
import { fetchProfile } from "@/services/profile";
import { useSessionStore } from "@/stores/session";
import type { GalleryEntry } from "@/types/domain";
import type { ProfileStats } from "@/services/profile";

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number | string;
  label: string;
}) {
  return (
    <FadeInItem>
      <motion.div
        whileHover={{ y: -4 }}
        className="flex flex-col gap-2 rounded-2xl border border-gray-200/80 bg-white/90 p-4 shadow-(--shadow-soft) backdrop-blur-sm sm:gap-2 sm:p-5"
      >
        <span className="text-lg">{icon}</span>
        <p className="text-2xl font-bold text-ink sm:text-3xl">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </motion.div>
    </FadeInItem>
  );
}

function DrawingCard({ entry }: { entry: GalleryEntry }) {
  return (
    <FadeInItem>
      <motion.article
        whileHover={{ y: -4 }}
        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft)"
      >
        <div className="dot-grid aspect-4/3 bg-white">
          <SvgRenderer document={entry.replay} className="h-full w-full" />
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold text-ink">{entry.word}</p>
            <p className="text-xs text-gray-400">{entry.upvotes} upvotes</p>
          </div>
          <span className="flex items-center gap-1 text-sm text-gray-400">♥ {entry.upvotes}</span>
        </div>
      </motion.article>
    </FadeInItem>
  );
}

function providerLabel(provider: string | undefined): string {
  if (provider === "google") return "Google account";
  if (provider === "guest") return "Guest account";
  return "Preview profile";
}

export function ProfileView() {
  const authUser = useSessionStore((s) => s.authUser);
  const displayName = useSessionStore((s) => s.displayName);
  const authReady = useSessionStore((s) => s.authReady);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [drawings, setDrawings] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);

  const rawName = authUser?.username ?? (displayName || "Guest");
  const displayUsername = formatDisplayName(rawName);
  const avatarUrl = authUser?.avatarUrl ?? null;

  useEffect(() => {
    let cancelled = false;
    void fetchProfile(displayUsername)
      .then((profile) => {
        if (cancelled) return;
        setStats(profile.stats);
        setDrawings(profile.drawings);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayUsername, profileVersion]);

  if (!authReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-gray-400">Loading profile…</p>
      </div>
    );
  }

  if (!authUser && !displayName.trim()) {
    return (
      <div className="page-shell page-shell-narrow flex flex-col items-center justify-center gap-5 text-center sm:gap-6">
        <FadeIn>
          <h1 className="text-2xl font-bold text-ink">Your profile</h1>
          <p className="mt-2 text-ink-muted">
            Sign in or set a display name on the home page to preview your profile.
          </p>
          <Link href="/sign-in" className="mt-4 inline-block text-sm text-plum hover:underline">
            Sign in
          </Link>
          <Link href="/" className="mt-2 inline-block text-sm text-plum hover:underline">
            Back to home
          </Link>
        </FadeIn>
      </div>
    );
  }

  const xp = stats?.xp ?? 0;
  const xpNext = stats?.xpNext ?? 500;
  const level = stats?.level ?? 1;
  const xpProgress = Math.min((xp / xpNext) * 100, 100);
  const handle = stats?.handle ?? profileHandle(displayUsername);

  return (
    <div className="page-shell max-w-6xl gap-8 sm:gap-10">
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-5 shadow-(--shadow-card) sm:p-8"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-plum-light/70 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 left-12 h-32 w-32 rounded-full bg-pink-light/80 blur-2xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              <div className="relative shrink-0 self-start">
                <UserAvatar
                  name={displayUsername}
                  avatarUrl={avatarUrl}
                  className="h-20 w-20 text-2xl shadow-md ring-4 ring-white sm:h-24 sm:w-24 sm:text-3xl"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-plum-light px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-plum sm:text-[11px]">
                    {providerLabel(authUser?.provider)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">{handle}</span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:mt-3 sm:text-3xl md:text-4xl">
                  {displayUsername}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
                  Sketching things since round 1. Your gallery, stats, and identity live here.
                </p>

                {authUser ? (
                  <div className="mt-5">
                    <ProfileEditor
                      name={displayUsername}
                      avatarUrl={avatarUrl}
                      onSaved={() => setProfileVersion((value) => value + 1)}
                    />
                  </div>
                ) : null}

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-plum">{xp.toLocaleString()} XP</span>
                    <span className="text-gray-400">{xpNext.toLocaleString()} for next level</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className="h-full rounded-full bg-linear-to-r from-plum to-pink"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>

              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                className="flex h-20 w-full shrink-0 flex-row items-center justify-center gap-3 rounded-2xl bg-plum-light shadow-(--shadow-soft) sm:h-24 sm:w-24 sm:flex-col sm:gap-0"
              >
                <span className="text-2xl">🏆</span>
                <span className="text-xs font-bold text-plum">Level {level}</span>
              </motion.div>
            </div>
          </motion.div>

          <FadeInStagger className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard icon="✏️" value={stats?.drawingsPublished ?? 0} label="Drawings" />
            <StatCard icon="♥" value={stats?.totalUpvotes ?? 0} label="Upvotes" />
            <StatCard icon="⚡" value={level} label="Level" />
            <StatCard icon="🎯" value={`${Math.round(xpProgress)}%`} label="Next level" />
          </FadeInStagger>
        </div>
      </FadeIn>

      <section>
        <FadeIn>
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Published</p>
              <h2 className="text-xl font-bold text-ink sm:text-2xl">Drawings by {displayUsername}</h2>
            </div>
            <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500 sm:self-auto">
              {drawings.length} total
            </span>
          </div>
        </FadeIn>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="aspect-4/3 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        )}

        {!loading && drawings.length === 0 && (
          <Card className="border-dashed bg-white/80 py-12 text-center">
            <p className="text-3xl">🎨</p>
            <p className="mt-3 font-medium text-gray-700">No published drawings yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Publish drawings from a game round to fill this gallery.
            </p>
          </Card>
        )}

        {!loading && drawings.length > 0 && (
          <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drawings.map((entry) => (
              <DrawingCard key={entry.id} entry={entry} />
            ))}
          </FadeInStagger>
        )}
      </section>
    </div>
  );
}
