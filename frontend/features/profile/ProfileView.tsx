"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Card } from "@/components/ui/Card";
import { SvgRenderer } from "@/features/drawing/SvgRenderer";
import { fetchProfile } from "@/services/profile";
import { palette } from "@/lib/colors";
import { useSessionStore } from "@/stores/session";
import type { GalleryEntry } from "@/types/domain";
import type { ProfileStats } from "@/services/profile";

const AVATAR_COLORS = [...palette];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
        className="flex flex-col gap-2 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-(--shadow-soft)"
      >
        <span className="text-lg">{icon}</span>
        <p className="text-3xl font-bold text-ink">{value}</p>
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

export function ProfileView() {
  const authUser = useSessionStore((s) => s.authUser);
  const displayName = useSessionStore((s) => s.displayName);
  const authReady = useSessionStore((s) => s.authReady);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [drawings, setDrawings] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const username = authUser?.username ?? (displayName || "Guest");

  useEffect(() => {
    let cancelled = false;
    void fetchProfile(username)
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
  }, [username]);

  if (!authReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-gray-400">Loading profile…</p>
      </div>
    );
  }

  if (!authUser && !displayName.trim()) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <FadeIn>
          <h1 className="text-2xl font-bold text-ink">Your profile</h1>
          <p className="mt-2 text-ink-muted">
            Set a display name on the home page or in settings to preview your profile.
          </p>
          <Link href="/settings" className="mt-4 inline-block text-sm text-plum hover:underline">
            Open settings
          </Link>
          <Link href="/" className="mt-2 inline-block text-sm text-plum hover:underline">
            Back to home
          </Link>
        </FadeIn>
      </div>
    );
  }

  const avatarBg = avatarColor(username);
  const initial = username.charAt(0).toUpperCase();
  const xp = stats?.xp ?? 0;
  const xpNext = stats?.xpNext ?? 500;
  const level = stats?.level ?? 1;
  const xpProgress = Math.min((xp / xpNext) * 100, 100);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10">
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-(--shadow-card)"
          >
            <div className="flex items-start gap-6">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-gray-800 shadow-md"
                style={{ backgroundColor: avatarBg }}
              >
                {initial}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {stats?.handle ?? `@${username.slice(0, 4).toUpperCase()}`}
                </p>
                <h1 className="text-3xl font-bold text-ink">{username.toLowerCase()}</h1>
                <p className="mt-1 text-ink-muted">Sketching things since round 1.</p>
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-plum">{xp.toLocaleString()} XP</span>
                    <span className="text-gray-400">{xpNext.toLocaleString()} for next</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className="h-full rounded-full bg-plum"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>
              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-plum-light"
              >
                <span className="text-2xl">🏆</span>
                <span className="text-xs font-bold text-plum">Level {level}</span>
              </motion.div>
            </div>
          </motion.div>

          <FadeInStagger className="grid grid-cols-2 gap-4">
            <StatCard icon="✏️" value={stats?.drawingsPublished ?? 0} label="Drawings" />
            <StatCard icon="♥" value={stats?.totalUpvotes ?? 0} label="Upvotes" />
          </FadeInStagger>
        </div>
      </FadeIn>

      <section>
        <FadeIn>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Published</p>
              <h2 className="text-2xl font-bold text-ink">
                Drawings by {username.toLowerCase()}
              </h2>
            </div>
            <span className="text-sm text-gray-400">{drawings.length} total</span>
          </div>
        </FadeIn>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="aspect-4/3 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        )}

        {!loading && drawings.length === 0 && (
          <Card className="border-dashed text-center">
            <p className="font-medium text-gray-700">No published drawings yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Publish drawings to see them listed here.
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
