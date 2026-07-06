"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { GameFeaturesSection } from "@/components/landing/GameFeaturesSection";
import { HeroCanvasPreview } from "@/components/landing/HeroCanvasPreview";
import { LandingBackgroundDoodles } from "@/components/landing/LandingBackgroundDoodles";
import { LandingCtaSection } from "@/components/landing/LandingCtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { VectorPrimitivesSection } from "@/components/landing/VectorPrimitivesSection";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useRoomActions } from "@/hooks/useRoom";
import { colors } from "@/lib/colors";
import { formatRoomCodeInput } from "@/lib/room-code";
import { useSessionStore } from "@/stores/session";

const ROOM_CODE_PLACEHOLDER = "ABCD";

const HEADLINE_WORDS = ["Drawing,", "made", "of"];

function HeadlineWords() {
  return (
    <>
      {HEADLINE_WORDS.map((word, i) => (
        <motion.span
          key={word}
          className="inline-block"
          initial={{ opacity: 0, y: 18, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.15 + i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {i < HEADLINE_WORDS.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </>
  );
}

export function LandingPage() {
  const router = useRouter();
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const [code, setCode] = useState("");

  const { createRoom, joinRoom, creating, joining, busy, error, clearError } = useRoomActions();

  const normalizedCode = code.trim().toUpperCase();
  const canJoin = normalizedCode.length === 4;

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canJoin || busy) return;
    void joinRoom(code);
  };

  const handleCreateRoom = () => {
    if (busy) return;
    void createRoom();
  };

  return (
    <div className="relative min-h-0">
      <LandingBackgroundDoodles />
      <div className="relative z-10">
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center sm:min-h-[88dvh]">
        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 content-center gap-8 px-4 py-6 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.68fr)] lg:items-center lg:gap-10 lg:py-8">
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
              <h1 className="mt-3 text-[clamp(1.85rem,7vw,2.5rem)] font-bold leading-[1.08] tracking-tight text-ink sm:mt-4 sm:text-5xl lg:text-[3.75rem] lg:leading-[1.05] xl:text-[4.25rem]">
                <HeadlineWords />{" "}
                <motion.span
                  className="script-accent relative inline-block text-[clamp(2.1rem,8vw,2.75rem)] sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]"
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  vectors
                  <motion.span
                    className="absolute -bottom-0.5 left-0 h-1 w-full rounded-full sm:h-1.5"
                    style={{ background: `linear-gradient(90deg, ${colors.plum}, ${colors.chartreuse})` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.7, duration: 0.7 }}
                  />
                </motion.span>
                .
              </h1>
            </FadeIn>

            <FadeIn delay={0.16}>
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
                className="mt-3 rounded-3xl sm:mt-4"
              >
              <Card
                id="join"
                className="flex flex-col gap-3 rounded-3xl p-4 sm:p-5"
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
                        onChange={(e) => {
                          clearError();
                          setCode(formatRoomCodeInput(e.target.value));
                        }}
                        placeholder={ROOM_CODE_PLACEHOLDER}
                        maxLength={4}
                        autoComplete="off"
                        spellCheck={false}
                        className="h-10 min-w-0 flex-1 font-mono tracking-widest uppercase"
                      />
                      <Button
                        type="submit"
                        disabled={!canJoin || busy}
                        size="sm"
                        className="shrink-0 px-4"
                      >
                        {joining ? "Joining…" : "Join"}
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button size="md" disabled={busy} onClick={handleCreateRoom} className="w-full sm:w-auto">
                    {creating ? "Creating…" : "Create room"}
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    disabled={busy}
                    onClick={() => router.push("/gallery")}
                    className="w-full sm:w-auto"
                  >
                    View gallery
                  </Button>
                </div>

                <p className="script-accent text-base leading-snug sm:text-lg md:text-xl">
                  your friends roast your art in real time.
                </p>
              </Card>
              </motion.div>
            </FadeIn>
          </div>

          <div className="mx-auto min-w-0 w-full max-w-[min(100%,17rem)] sm:max-w-xs lg:max-h-[calc(100dvh-5.5rem)] lg:max-w-76 lg:justify-self-center xl:max-w-84">
            <HeroCanvasPreview className="lg:max-h-[calc(100dvh-5.5rem)]" />
          </div>
        </div>
      </section>

      <GameFeaturesSection />
      <VectorPrimitivesSection />
      <LandingCtaSection />
      <LandingFooter />
      </div>
    </div>
  );
}
