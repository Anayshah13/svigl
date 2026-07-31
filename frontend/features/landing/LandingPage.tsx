"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { GameFeaturesSection } from "@/components/landing/GameFeaturesSection";
import { LandingBackgroundDoodles } from "@/components/landing/LandingBackgroundDoodles";
import { LandingCtaSection } from "@/components/landing/LandingCtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LabsCtaOverlapShapes } from "@/components/layout/LabsCtaMarks";
import { SviglLogo } from "@/components/layout/SviglLogo";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRoomActions } from "@/hooks/useRoom";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { colors } from "@/lib/colors";
import { formatRoomCodeInput } from "@/lib/room-code";
import { useSessionStore } from "@/stores/session";

const ROOM_CODE_PLACEHOLDER = "ABCD";

const HEADLINES = [
  { words: ["Draw", "fast,", "get", "roasted"], accent: "faster." },
  { words: ["Everyone's", "an", "artist", "until", "the", "timer"], accent: "starts." },
  { words: ["Terrible\u00A0drawings,", "excellent"], accent: "excuses." },
  { words: ["Where", "friendships", "go", "to"], accent: "die." },
  { words: ["Draw", "with", "confidence,", "guess", "with"], accent: "agony." },
] as const;

function HeadlineWords({ words }: { words: readonly string[] }) {
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={`${i}-${word}`}
          className="inline-block"
          initial={{ opacity: 0, y: 18, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.15 + i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </>
  );
}

// Server always renders HEADLINES[0]; client picks a stable random index after
// hydration via useSyncExternalStore (avoids setState-in-effect). The hero
// fades in from opacity 0, so the swap happens before anything is visible.
let clientHeadlineIndex: number | undefined;

function getClientHeadlineIndex() {
  if (clientHeadlineIndex === undefined) {
    clientHeadlineIndex = Math.floor(Math.random() * HEADLINES.length);
  }
  return clientHeadlineIndex;
}

function useRandomHeadline() {
  const index = useSyncExternalStore(
    () => () => {},
    getClientHeadlineIndex,
    () => 0,
  );
  return HEADLINES[index]!;
}

export function LandingPage() {
  const router = useRouter();
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const [code, setCode] = useState("");
  const headline = useRandomHeadline();

  const { createRoom, joinRoom, creating, joining, busy, error, clearError } = useRoomActions();

  const normalizedCode = code.trim().toUpperCase();
  const canJoin = normalizedCode.length === 4;

  // Custom engagement event (not page_view — GA already records the route).
  useEffect(() => {
    trackEvent(AnalyticsEvents.LANDING_VIEW);
  }, []);

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canJoin || busy) return;
    // Closest product CTA to "Play" on the landing hero (Join room).
    trackEvent(AnalyticsEvents.PLAY_CLICKED, { method: "join" });
    void joinRoom(code);
  };

  const handleCreateRoom = () => {
    if (busy) return;
    trackEvent(AnalyticsEvents.CREATE_ROOM_CLICKED, { source: "landing_hero" });
    void createRoom();
  };

  return (
    <div className="relative min-h-0">
      <LandingBackgroundDoodles />
      <div className="relative z-10">
        <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-5 py-16 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:py-20 lg:py-24">
          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center sm:max-w-3xl lg:-translate-y-3vh lg:max-w-4xl">
            <FadeIn className="mb-8 flex w-full justify-center md:hidden">
              <SviglLogo size="hero" className="justify-center text-center" />
            </FadeIn>

            <FadeIn delay={0.08} className="w-full">
              <h1 className="text-fluid-display font-display font-normal leading-[1.08] tracking-tight text-ink lg:leading-[1.04]">
                <HeadlineWords words={headline.words} />{" "}
                <br className="sm:hidden" />
                <motion.span
                  key={headline.accent}
                  className="script-accent text-fluid-script relative inline-block"
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.15 + headline.words.length * 0.09,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {headline.accent}
                  <motion.span
                    className="absolute -bottom-1 left-0 h-1 w-full rounded-full sm:h-1.5 sm:-bottom-1.5"
                    style={{ background: `linear-gradient(90deg, ${colors.plum}, ${colors.chartreuse})` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.7, duration: 0.7 }}
                  />
                </motion.span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.16} className="mt-10 w-full max-w-xl sm:mt-12 sm:max-w-2xl">
              <motion.div
                animate={{
                  y: [0, -3, 0],
                  boxShadow: [
                    `0 24px 48px -16px ${colors.plum}18`,
                    `0 30px 56px -16px ${colors.plum}26`,
                    `0 24px 48px -16px ${colors.plum}18`,
                  ],
                }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                className="rounded-3xl"
              >
                <Card
                  id="join"
                  className="flex flex-col gap-4 rounded-3xl p-5 text-left sm:gap-5 sm:p-7"
                  style={{
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.85)`,
                  }}
                >
                  {error ? (
                    <p
                      role="alert"
                      className="rounded-2xl bg-pink-light px-4 py-3 text-sm font-medium text-plum"
                    >
                      {error.message}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
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
                        className="h-12"
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
                          onChange={(e) => {
                            clearError();
                            setCode(formatRoomCodeInput(e.target.value));
                          }}
                          placeholder={ROOM_CODE_PLACEHOLDER}
                          maxLength={4}
                          autoComplete="off"
                          spellCheck={false}
                          className="h-12 min-w-0 flex-1 font-mono tracking-widest uppercase"
                        />
                        <Button
                          type="submit"
                          disabled={!canJoin || busy}
                          size="md"
                          className="h-12 shrink-0 px-5"
                        >
                          {joining ? "Joining…" : "Join"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                    <Button
                      size="md"
                      disabled={busy}
                      onClick={handleCreateRoom}
                      className="h-12 w-full sm:w-auto"
                    >
                      {creating ? "Creating…" : "Create room"}
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      disabled={busy}
                      onClick={() => router.push("/gallery")}
                      className="h-12 w-full sm:w-auto"
                    >
                      View gallery
                    </Button>
                  </div>

                  <p className="script-accent text-center text-lg leading-snug sm:text-left sm:text-xl md:text-2xl">
                    your friends roast your art in real time.
                  </p>
                </Card>
              </motion.div>
            </FadeIn>

          </div>
        </section>

        <GameFeaturesSection />
        <LandingCtaSection />
        <LandingFooter />
      </div>

      {/* Labs CTA — fixed bottom-right; lifts above ActiveRoomBar via .labs-cta-fixed */}
      <FadeIn
        delay={0.28}
        className="labs-cta-fixed pointer-events-auto fixed z-40"
      >
        <LabsCtaOverlapShapes />
      </FadeIn>
    </div>
  );
}
