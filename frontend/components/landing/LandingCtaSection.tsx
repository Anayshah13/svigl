"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useRef } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useRoomActions } from "@/hooks/useRoom";
import { colors } from "@/lib/colors";

export function LandingCtaSection() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { createRoom, creating, busy } = useRoomActions();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const card = cardRef.current;
      if (!card) return;

      gsap.to(card.querySelector(".cta-glow-plum"), {
        scale: 1.12,
        opacity: 0.55,
        duration: 4.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
      gsap.to(card.querySelector(".cta-glow-green"), {
        scale: 1.08,
        opacity: 0.45,
        duration: 5.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 1.2,
      });
    },
    { scope: cardRef },
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
      <FadeIn>
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/92 px-5 py-10 shadow-[0_32px_64px_-20px_rgba(112,63,147,0.18)] backdrop-blur-md sm:rounded-[2rem] sm:px-12 sm:py-14 lg:px-16 lg:py-16"
        >
          <div
            className="cta-glow-plum pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${colors.plum}55 0%, transparent 70%)` }}
          />
          <div
            className="cta-glow-green pointer-events-none absolute -bottom-12 left-1/4 h-48 w-48 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${colors.green}40 0%, transparent 70%)` }}
          />

          <div className="relative max-w-lg">
            <h2 className="text-[clamp(1.65rem,5vw,2.25rem)] font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              Round up your friends.
            </h2>
            <motion.p
              className="script-accent mt-1 text-[clamp(2rem,7vw,2.75rem)] font-semibold sm:text-5xl lg:text-[3.25rem]"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              Draw something strange.
            </motion.p>
            <p className="mt-4 text-sm text-ink-muted sm:text-base">
              No signup. Just a room code and five minutes.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button
                variant="green"
                size="lg"
                disabled={busy}
                onClick={() => void createRoom()}
                className="w-full sm:w-auto"
              >
                {creating ? "Creating…" : "Start a room"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => router.push("/gallery")}
                className="w-full sm:w-auto"
              >
                See what people made
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
