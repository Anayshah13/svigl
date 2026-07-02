"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { HeroCanvasPreview } from "@/components/landing/HeroCanvasPreview";
import { LandingBackgroundDoodles } from "@/components/landing/LandingBackgroundDoodles";
import { VectorPrimitivesSection } from "@/components/landing/VectorPrimitivesSection";
import { FriendsPlayBadge } from "@/components/landing/FriendsPlayBadge";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createRoom, ROOM_CODE_PLACEHOLDER } from "@/services/room";
import { colors, palette } from "@/lib/colors";
import { useSessionStore } from "@/stores/session";

const FEATURES = [
  {
    title: "Vectors, not pixels",
    desc: "Every game ends with a crisp SVG you can zoom into forever.",
    visual: "shapes",
    accent: colors.plum,
  },
  {
    title: "Cozy multiplayer",
    desc: "Up to 12 friends. Share a link, pick words, start when ready.",
    visual: "avatars",
    accent: colors.green,
  },
  {
    title: "Familiar toolbar",
    desc: "Select, Path, Rectangle, Circle — Figma vibes.",
    visual: "tools",
    accent: colors.pink,
  },
  {
    title: "Publish to the gallery",
    desc: "Earn upvotes and climb the weekly board.",
    visual: "gallery",
    accent: colors.chartreuse,
  },
  {
    title: "Keyboard everything",
    desc: "P · R · O · V · ⌘Z",
    visual: "keys",
    accent: colors.plum,
  },
];

function FeatureVisual({ type }: { type: string }) {
  if (type === "shapes") {
    return (
      <div className="dot-grid flex h-32 items-center justify-center gap-3 rounded-xl">
        {palette.slice(0, 5).map((c, i) => (
          <motion.div
            key={c}
            className="h-10 w-10 rounded-full shadow-sm"
            style={{ backgroundColor: c }}
            animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 2.2, delay: i * 0.12, repeat: Infinity }}
          />
        ))}
      </div>
    );
  }
  if (type === "avatars") {
    const initials = ["M", "A", "K", "L", "R", "N"];
    return (
      <div className="flex items-center pl-2">
        {palette.map((c, i) => (
          <motion.div
            key={i}
            whileInView={{ x: -12 * i, opacity: 1 }}
            initial={{ x: -20 * i, opacity: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md"
            style={{ backgroundColor: c, zIndex: palette.length - i }}
          >
            {initials[i]}
          </motion.div>
        ))}
        <span className="ml-2 text-sm font-semibold text-ink-muted">+4</span>
      </div>
    );
  }
  if (type === "tools") {
    return (
      <div className="flex gap-2">
        {["V", "P", "R", "O"].map((k, i) => (
          <motion.div
            key={k}
            whileHover={{ scale: 1.1, rotate: -4 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-sm"
            style={{
              background: i === 1 ? colors.plum : "white",
              color: i === 1 ? "white" : colors.ink,
            }}
          >
            {k}
          </motion.div>
        ))}
      </div>
    );
  }
  if (type === "gallery") {
    return (
      <div className="flex h-24 items-end gap-2">
        {[colors.chartreuse, colors.green, colors.plum, colors.pink].map((c, i) => (
          <motion.div
            key={c}
            className="w-7 rounded-lg"
            style={{ backgroundColor: c }}
            initial={{ height: 0 }}
            whileInView={{ height: [48, 72, 56, 90][i] }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, type: "spring" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {["P", "R", "O", "V", "⌘Z"].map((k) => (
        <kbd
          key={k}
          className="rounded-lg border border-plum/20 bg-white/80 px-2 py-1 font-mono text-xs font-semibold text-ink"
        >
          {k}
        </kbd>
      ))}
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const [code, setCode] = useState("");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const normalizedCode = code.trim().toUpperCase();
  const canJoin = normalizedCode.length >= 4;

  const join = (roomCode: string) => {
    setRoomError(null);
    router.push(`/room/${roomCode}`);
  };

  const handleCreateRoom = async () => {
    setRoomError(null);
    setCreating(true);
    try {
      const newCode = await createRoom(displayName);
      router.push(`/room/${newCode}`);
    } catch {
      setRoomError("Could not create a room. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canJoin) join(normalizedCode);
  };

  return (
    <div className="relative overflow-x-hidden">
      <LandingBackgroundDoodles />
      <section className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl grid-cols-1 content-center gap-6 px-6 py-5 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.68fr)] lg:items-center lg:gap-10 lg:py-8">
        <div className="flex min-w-0 flex-col">
          <FadeIn>
            <motion.span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:px-3 sm:py-1 sm:text-xs"
              style={{ background: colors.pinkLight, color: colors.plum }}
              whileHover={{ scale: 1.04 }}
            >
              ✨ Open beta · v1.0
            </motion.span>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className="mt-3 text-[2rem] font-bold leading-[1.05] tracking-tight text-ink sm:mt-4 sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem]">
              <span className="whitespace-nowrap">Drawing, made of</span>{" "}
              <span className="script-accent relative inline-block text-[2.35rem] sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]">
                vectors
                <motion.span
                  className="absolute -bottom-0.5 left-0 h-1 w-full rounded-full sm:h-1.5"
                  style={{ background: `linear-gradient(90deg, ${colors.plum}, ${colors.chartreuse})` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.7, duration: 0.7 }}
                />
              </span>
              .
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <Card
              id="join"
              className="mt-3 flex flex-col gap-3 rounded-3xl p-4 sm:mt-4 sm:p-5"
              style={{
                boxShadow: `0 24px 48px -16px ${colors.plum}18, 0 0 0 1px rgba(255,255,255,0.85)`,
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="display-name" className="text-xs font-semibold text-ink sm:text-sm">
                    Display name
                  </label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Anonymous artist"
                    maxLength={24}
                    className="h-10"
                  />
                </div>

                <form className="flex flex-col gap-1.5" onSubmit={handleJoinSubmit}>
                  <label htmlFor="room-code" className="text-xs font-semibold text-ink sm:text-sm">
                    Room code
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="room-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder={ROOM_CODE_PLACEHOLDER}
                      maxLength={6}
                      className="h-10 font-mono tracking-widest uppercase"
                    />
                    <Button type="submit" disabled={!canJoin} size="sm" className="shrink-0 px-4">
                      Join
                    </Button>
                  </div>
                </form>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="md" onClick={() => void handleCreateRoom()} disabled={creating}>
                  {creating ? "Creating…" : "Create room"}
                </Button>
                <Button variant="outline" size="md" onClick={() => router.push("/gallery")}>
                  View gallery
                </Button>
              </div>

              {roomError && (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {roomError}
                </p>
              )}

              <p className="script-accent text-lg leading-snug sm:text-xl">
                your friends roast your art in real time.
              </p>

              <div className="border-t border-plum/10 pt-1">
                <FriendsPlayBadge embedded />
              </div>
            </Card>
          </FadeIn>
        </div>

        <div className="mx-auto min-w-0 w-full max-w-68 sm:max-w-xs lg:max-h-[calc(100dvh-5.5rem)] lg:max-w-76 lg:justify-self-center xl:max-w-84">
          <HeroCanvasPreview className="lg:max-h-[calc(100dvh-5.5rem)]" />
        </div>
      </section>

      <VectorPrimitivesSection />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <FadeIn>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-plum">The game</p>
              <h2 className="mt-2 text-4xl font-bold tracking-tight text-ink lg:text-5xl">
                Made for thinkers who can&apos;t draw.
              </h2>
            </div>
            <p className="text-base text-ink-muted">
              Precise vector tools instead of messy brushes. Gorgeous output, zero talent required.
            </p>
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <FadeInStagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FadeInItem key={f.title}>
              <motion.div
                whileHover={{ y: -6, boxShadow: `0 24px 48px -12px ${f.accent}30` }}
                className="glass-panel flex h-full min-h-[180px] flex-col justify-between rounded-2xl p-6 lg:min-h-[200px]"
                style={{ borderTop: `3px solid ${f.accent}` }}
              >
                <div>
                  <h3 className="text-lg font-bold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted">{f.desc}</p>
                </div>
                <div className="mt-5">
                  <FeatureVisual type={f.visual} />
                </div>
              </motion.div>
            </FadeInItem>
          ))}
        </FadeInStagger>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <FadeIn>
          <div className="glass-panel relative overflow-hidden rounded-3xl p-10 lg:p-14">
            <div
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
              style={{ background: `${colors.plum}25` }}
            />
            <div
              className="absolute -bottom-12 left-1/3 h-48 w-48 rounded-full blur-3xl"
              style={{ background: `${colors.green}20` }}
            />
            <div className="relative z-10 max-w-xl">
              <h2 className="text-4xl font-bold tracking-tight text-ink lg:text-5xl">
                Round up your friends.
              </h2>
              <p className="script-accent mt-1 text-4xl lg:text-5xl">Draw something strange.</p>
              <p className="mt-3 text-sm text-ink-muted">
                No signup. Just a room code and five minutes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" variant="green" onClick={() => void handleCreateRoom()} disabled={creating}>
                  {creating ? "Creating…" : "Start a room"}
                </Button>
                <Button variant="outline" size="lg" onClick={() => router.push("/gallery")}>
                  See what people made
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      <footer className="border-t border-white/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="font-bold text-ink">Svigl.</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-ink-muted">
            {["Twitter", "GitHub", "Changelog", "Privacy"].map((l) => (
              <Link key={l} href="#" className="font-medium hover:text-plum">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
