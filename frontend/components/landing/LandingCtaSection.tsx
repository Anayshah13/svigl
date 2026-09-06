"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useRef } from "react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { useRoomActions } from "@/hooks/useRoom";
import { colors } from "@/lib/colors";
import { AnaiFigure } from "@/features/anai";
import "@/features/anai/anai.css";

function RubiksCube({ x, y }: { x: number; y: number }) {
  const s = 5;
  const front = [
    colors.pink,
    colors.chartreuse,
    colors.plum,
    colors.green,
    colors.pink,
    colors.chartreuse,
    colors.plum,
    colors.green,
    colors.pink,
  ];
  return (
    <g className="cta-cube" style={{ transformOrigin: `${x + 8}px ${y + 8}px` }} filter="url(#cta-soft-shadow)">
      <polygon
        points={`${x},${y} ${x + 5},${y - 4} ${x + 20},${y - 4} ${x + 15},${y}`}
        fill={colors.chartreuse}
      />
      <polygon
        points={`${x + 15},${y} ${x + 20},${y - 4} ${x + 20},${y + 11} ${x + 15},${y + 15}`}
        fill={colors.plum}
      />
      {front.map((fill, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <rect
            key={i}
            x={x + col * s}
            y={y + row * s}
            width={s - 0.8}
            height={s - 0.8}
            rx={0.6}
            fill={fill}
          />
        );
      })}
    </g>
  );
}

function DoodleCharacterVisual() {
  return (
    <svg
      viewBox="0 0 360 240"
      className="pointer-events-none absolute right-0 top-1/2 hidden h-full w-auto max-w-[46%] -translate-y-1/2 md:block lg:max-w-none"
      aria-hidden
    >
      <defs>
        <filter id="cta-soft-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Shared ground under both mascots */}
      <ellipse
        cx="248"
        cy="180"
        rx="78"
        ry="10"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="2"
        strokeOpacity="0.5"
        strokeDasharray="5 3"
      />

      {/* Official AnAI — left, shorter, same figure as hero / /ai */}
      <g className="cta-anai" style={{ transformOrigin: "218px 140px" }}>
        <g transform="translate(138 83) scale(0.5)">
          <AnaiFigure
            leftHand={
              <g transform="translate(94 82) scale(1.5)">
                <RubiksCube x={0} y={0} />
              </g>
            }
          />
        </g>
      </g>

      {/* Human mascot — right */}
      <g className="cta-character" style={{ transformOrigin: "278px 110px" }}>
        <rect x="256" y="100" width="44" height="55" rx="10" fill={colors.green} filter="url(#cta-soft-shadow)" />
        <circle cx="278" cy="78" r="20" fill={colors.chartreuse} filter="url(#cta-soft-shadow)" />
        <circle cx="271" cy="76" r="4.5" fill={colors.ink} fillOpacity="0.75" />
        <circle cx="285" cy="76" r="4.5" fill={colors.ink} fillOpacity="0.75" />
        <circle cx="272" cy="74.5" r="1.8" fill={colors.whitePure} fillOpacity="0.85" />
        <circle cx="286" cy="74.5" r="1.8" fill={colors.whitePure} fillOpacity="0.85" />
        <rect x="240" y="108" width="18" height="7" rx="3.5" fill={colors.green} fillOpacity="0.75" />
        <rect x="298" y="108" width="18" height="7" rx="3.5" fill={colors.green} fillOpacity="0.75" />
        <rect x="262" y="153" width="11" height="18" rx="5" fill={colors.green} fillOpacity="0.7" />
        <rect x="283" y="153" width="11" height="18" rx="5" fill={colors.green} fillOpacity="0.7" />
      </g>

      {/* Question mark — right of the human, no motion */}
      <g>
        <path
          d="M 312 54 c 0 -6 5.5 -9.5 11 -9.5 s 11 3.5 11 9.5 c 0 4.5 -3 7 -6.5 10 l -3 4.5"
          fill="none"
          stroke={colors.plum}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.9}
        />
        <circle cx="320.5" cy="76" r="2.1" fill={colors.plum} fillOpacity={0.9} />
      </g>

      {/* Floating shapes */}
      <circle className="cta-float-1" cx="85" cy="55" r="14" fill={colors.pink} fillOpacity="0.7" filter="url(#cta-soft-shadow)" />
      <rect className="cta-float-2" x="148" y="32" width="20" height="20" rx="5" fill={colors.plum} fillOpacity="0.6" transform="rotate(15, 158, 42)" filter="url(#cta-soft-shadow)" />
      <polygon className="cta-float-3" points="70,165 82,145 94,165" fill={colors.chartreuse} fillOpacity="0.6" filter="url(#cta-soft-shadow)" />
      <polygon
        points="336,170 346,158 356,170 346,182"
        fill={colors.plum}
        fillOpacity="0.35"
      />

      {/* Spray dots */}
      {[
        { cx: 110, cy: 90, r: 3 }, { cx: 338, cy: 132, r: 3.5 }, { cx: 130, cy: 180, r: 2.5 },
        { cx: 348, cy: 80, r: 2.5 }, { cx: 95, cy: 130, r: 2 }, { cx: 246, cy: 48, r: 2.5 },
        { cx: 60, cy: 100, r: 2 }, { cx: 312, cy: 190, r: 2 },
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

      gsap.to(card.querySelector(".cta-anai"), {
        y: -4,
        duration: 3.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 0.35,
      });

      gsap.to(card.querySelector(".cta-cube"), {
        rotation: 8,
        duration: 2.4,
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
            <h2 className="font-display text-[clamp(1.65rem,5vw,2.25rem)] font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
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
                onClick={() => {
                  trackEvent(AnalyticsEvents.CREATE_ROOM_CLICKED, {
                    source: "landing_cta",
                  });
                  void createRoom();
                }}
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
