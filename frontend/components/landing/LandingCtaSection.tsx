"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useRef } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useRoomActions } from "@/hooks/useRoom";
import { colors } from "@/lib/colors";

function DoodleCharacterVisual() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="absolute right-0 top-1/2 hidden h-full w-auto -translate-y-1/2 sm:block"
      aria-hidden
    >
      <defs>
        <filter id="cta-soft-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Character body */}
      <g className="cta-character" style={{ transformOrigin: "190px 110px" }}>
        {/* Body */}
        <rect x="168" y="100" width="44" height="55" rx="10" fill={colors.green} filter="url(#cta-soft-shadow)" />
        {/* Head */}
        <circle cx="190" cy="78" r="20" fill={colors.chartreuse} filter="url(#cta-soft-shadow)" />
        {/* Eyes */}
        <circle cx="183" cy="76" r="4.5" fill={colors.ink} fillOpacity="0.75" />
        <circle cx="197" cy="76" r="4.5" fill={colors.ink} fillOpacity="0.75" />
        <circle cx="184" cy="74.5" r="1.8" fill={colors.whitePure} fillOpacity="0.85" />
        <circle cx="198" cy="74.5" r="1.8" fill={colors.whitePure} fillOpacity="0.85" />
        {/* Arms */}
        <rect x="152" y="108" width="18" height="7" rx="3.5" fill={colors.green} fillOpacity="0.75" />
        <rect x="210" y="108" width="18" height="7" rx="3.5" fill={colors.green} fillOpacity="0.75" />
        {/* Legs */}
        <rect x="174" y="153" width="11" height="18" rx="5" fill={colors.green} fillOpacity="0.7" />
        <rect x="195" y="153" width="11" height="18" rx="5" fill={colors.green} fillOpacity="0.7" />
        {/* Ground ring */}
        <ellipse cx="190" cy="178" rx="35" ry="8" fill="none" stroke={colors.chartreuse} strokeWidth="2" strokeOpacity="0.5" strokeDasharray="5 3" />
      </g>

      {/* Floating shapes */}
      <circle className="cta-float-1" cx="85" cy="55" r="14" fill={colors.pink} fillOpacity="0.7" filter="url(#cta-soft-shadow)" />
      <rect className="cta-float-2" x="255" y="45" width="22" height="22" rx="5" fill={colors.plum} fillOpacity="0.6" transform="rotate(15, 266, 56)" filter="url(#cta-soft-shadow)" />
      <polygon className="cta-float-3" points="70,165 82,145 94,165" fill={colors.chartreuse} fillOpacity="0.6" filter="url(#cta-soft-shadow)" />

      {/* Spray dots */}
      {[
        { cx: 110, cy: 90, r: 3 }, { cx: 250, cy: 140, r: 3.5 }, { cx: 130, cy: 180, r: 2.5 },
        { cx: 275, cy: 85, r: 2.5 }, { cx: 95, cy: 130, r: 2 }, { cx: 295, cy: 110, r: 2.5 },
        { cx: 60, cy: 100, r: 2 }, { cx: 240, cy: 190, r: 2 },
      ].map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={[colors.pink, colors.chartreuse, colors.plum, colors.green][i % 4]}
          fillOpacity="0.35"
        />
      ))}
    </svg>
  );
}

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

      gsap.to(card.querySelector(".cta-character"), {
        y: -5,
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(card.querySelector(".cta-float-1"), {
        y: -7,
        x: 4,
        scale: 1.08,
        duration: 3.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(card.querySelector(".cta-float-2"), {
        y: 5,
        rotation: "+=25",
        duration: 4.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 0.6,
      });

      gsap.to(card.querySelector(".cta-float-3"), {
        y: -4,
        x: -3,
        duration: 3.2,
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
          className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/92 px-5 py-10 shadow-[0_32px_64px_-20px_rgba(112,63,147,0.18)] backdrop-blur-md sm:rounded-4xl sm:px-12 sm:py-14 lg:px-16 lg:py-16"
        >
          <div
            className="cta-glow-plum pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${colors.plum}55 0%, transparent 70%)` }}
          />
          <div
            className="cta-glow-green pointer-events-none absolute -bottom-12 left-1/4 h-48 w-48 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${colors.green}40 0%, transparent 70%)` }}
          />

          <DoodleCharacterVisual />

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
