"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { WhiteboardPreview } from "@/components/reactions/WhiteboardPreview";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { LoaderScreen } from "@/features/loaders";
import { ProfileEditor } from "@/features/profile/ProfileEditor";
import { profilePath, profileSlug } from "@/lib/names";
import { fetchAuthSession } from "@/services/auth";
import {
  fetchGalleryEntries,
  setGalleryReaction,
  type GalleryEntry,
  type ReactionValue,
} from "@/services/gallery";
import { fetchPublicProfile, type PublicProfile } from "@/services/profile";
import { useSessionStore } from "@/stores/session";

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

function providerLabel(provider: string | undefined): string {
  if (provider === "google") return "Google account";
  if (provider === "guest") return "Guest account";
  return "Player";
}

export function ProfileView({ username }: { username: string }) {
  const router = useRouter();
  const authUser = useSessionStore((s) => s.authUser);
  const authReady = useSessionStore((s) => s.authReady);
  const setAuth = useSessionStore((s) => s.setAuth);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [drawings, setDrawings] = useState<GalleryEntry[]>([]);
  const [profileVersion, setProfileVersion] = useState(0);

  const routeSlug = profileSlug(username);
  const isOwnProfile =
    Boolean(authUser) &&
    Boolean(profile) &&
    (authUser!.id === profile!.id ||
      authUser!.username.toLowerCase() === profile!.username.toLowerCase());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    void (async () => {
      try {
        // Refresh own session in the background so editor/reactions stay current.
        const me = await fetchAuthSession().catch(() => null);
        if (!cancelled && me) setAuth(me);

        const publicProfile = await fetchPublicProfile(routeSlug);
        if (cancelled) return;

        // Canonicalize URL to hyphenated slug (e.g. Anay%20Shah / Anay Shah → Anay-Shah).
        const canonicalSlug = profileSlug(publicProfile.username);
        if (username !== canonicalSlug) {
          router.replace(profilePath(publicProfile.username));
        }

        setProfile(publicProfile);
        const published = await fetchGalleryEntries({
          sort: "recent",
          authorId: publicProfile.id,
        });
        if (!cancelled) setDrawings(published);
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setDrawings([]);
        const message = err instanceof Error ? err.message : "";
        setNotFound(message === "Profile not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileVersion, routeSlug, router, setAuth, username]);

  const onReact = useCallback(
    async (id: string, reaction: ReactionValue) => {
      if (!authUser || isOwnProfile) return;
      const previous = drawings.find((entry) => entry.id === id);
      if (!previous) return;

      setDrawings((list) =>
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
        setDrawings((list) =>
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
        setDrawings((list) =>
          list.map((entry) => (entry.id === id ? previous : entry)),
        );
      }
    },
    [authUser, drawings, isOwnProfile],
  );

  if (!authReady || loading) {
    return <LoaderScreen kind="dots" label="Loading profile…" />;
  }

  if (notFound || !profile) {
    return (
      <div className="page-shell page-shell-narrow flex flex-col items-center justify-center gap-5 text-center sm:gap-6">
        <FadeIn>
          <h1 className="text-2xl font-bold text-ink">Profile not found</h1>
          <p className="mt-2 text-ink-muted">
            No player matches <span className="font-semibold text-ink">{routeSlug}</span>.
          </p>
          <Link href="/gallery" className="mt-4 inline-block text-sm text-plum hover:underline">
            Browse gallery
          </Link>
          {authUser ? (
            <Link
              href={profilePath(authUser.username)}
              className="mt-2 inline-block text-sm text-plum hover:underline"
            >
              Go to your profile
            </Link>
          ) : (
            <Link href="/sign-in" className="mt-2 inline-block text-sm text-plum hover:underline">
              Sign in
            </Link>
          )}
        </FadeIn>
      </div>
    );
  }

  const displayUsername = profile.username;
  const handle = profile.handle;
  const avatarUrl = profile.avatarUrl;
  const drawingsDone = profile.drawingsDone;
  const likesReceived = profile.likesReceived;
  const dislikesReceived = profile.dislikesReceived;
  const canReact = Boolean(authUser) && !isOwnProfile;

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
                    {isOwnProfile ? providerLabel(profile.provider) : "Player profile"}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-xs">
                    {handle}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:mt-3 sm:text-3xl md:text-4xl">
                  {displayUsername}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
                  {isOwnProfile
                    ? "Published drawings and the likes or dislikes they earn after each round."
                    : "Browse their published drawings and leave a like or dislike."}
                </p>

                {isOwnProfile ? (
                  <div className="mt-5">
                    <ProfileEditor
                      name={displayUsername}
                      avatarUrl={avatarUrl}
                      onSaved={(nextUsername) => {
                        setProfileVersion((value) => value + 1);
                        if (
                          nextUsername &&
                          nextUsername.toLowerCase() !== displayUsername.toLowerCase()
                        ) {
                          router.replace(profilePath(nextUsername));
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>

          <FadeInStagger className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatCard icon="✏️" value={drawingsDone} label="Drawings" />
            <StatCard icon="▲" value={likesReceived} label="Likes" />
            <StatCard icon="▼" value={dislikesReceived} label="Dislikes" />
          </FadeInStagger>
        </div>
      </FadeIn>

      <section>
        <FadeIn>
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Published</p>
              <h2 className="text-xl font-bold text-ink sm:text-2xl">
                Drawings by {displayUsername}
              </h2>
            </div>
            <span className="self-start rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500 sm:self-auto">
              {drawings.length} total
            </span>
          </div>
        </FadeIn>

        {drawings.length === 0 ? (
          <Card className="border-dashed bg-white/80 py-12 text-center">
            <p className="text-3xl">🎨</p>
            <p className="mt-3 font-medium text-gray-700">No published drawings yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              {isOwnProfile
                ? "Finish a drawing round in a game and it will show up here with its reactions."
                : "This player hasn’t published any drawings yet."}
            </p>
          </Card>
        ) : (
          <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drawings.map((entry) => (
              <FadeInItem key={entry.id}>
                <article className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-soft)">
                  <div className="aspect-4/3 bg-white">
                    <WhiteboardPreview document={entry.document} />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <p className="truncate font-semibold text-ink">{entry.word}</p>
                    <ReactionBar
                      likes={entry.likes}
                      dislikes={entry.dislikes}
                      myReaction={entry.myReaction}
                      disabled={!canReact}
                      onReact={canReact ? (next) => void onReact(entry.id, next) : undefined}
                      size="sm"
                    />
                  </div>
                </article>
              </FadeInItem>
            ))}
          </FadeInStagger>
        )}
      </section>
    </div>
  );
}
