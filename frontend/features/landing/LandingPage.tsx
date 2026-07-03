"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { HeroCanvasPreview } from "@/components/landing/HeroCanvasPreview";
import { LandingBackgroundDoodles } from "@/components/landing/LandingBackgroundDoodles";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { colors } from "@/lib/colors";
import { useSessionStore } from "@/stores/session";

const ROOM_CODE_PLACEHOLDER = "ABCD";

export function LandingPage() {
  const router = useRouter();
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const [code, setCode] = useState("");

  const normalizedCode = code.trim().toUpperCase();
  const canJoin = normalizedCode.length >= 4;

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleCreateRoom = () => {};

  return (
    <div className="relative h-[calc(100dvh-4rem)] overflow-hidden">
      <LandingBackgroundDoodles />
      <section className="relative mx-auto grid h-full max-w-7xl grid-cols-1 content-center gap-6 px-6 py-5 sm:py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.68fr)] lg:items-center lg:gap-10 lg:py-8">
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
                <Button size="md" onClick={handleCreateRoom}>
                  Create room
                </Button>
                <Button variant="outline" size="md" onClick={() => router.push("/gallery")}>
                  View gallery
                </Button>
              </div>

              <p className="script-accent text-lg leading-snug sm:text-xl">
                your friends roast your art in real time.
              </p>
            </Card>
          </FadeIn>
        </div>

        <div className="mx-auto min-w-0 w-full max-w-68 sm:max-w-xs lg:max-h-[calc(100dvh-5.5rem)] lg:max-w-76 lg:justify-self-center xl:max-w-84">
          <HeroCanvasPreview className="lg:max-h-[calc(100dvh-5.5rem)]" />
        </div>
      </section>
    </div>
  );
}
