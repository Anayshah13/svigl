"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { colors } from "@/lib/colors";

const FEATURES: Array<{
  title: string;
  desc: string;
  accent: string;
  accentGradient?: string;
  visual: "vectors" | "multiplayer" | "toolbar" | "gallery" | "keyboard";
}> = [
  {
    title: "Vectors, not pixels",
    desc: "Every game ends with a crisp SVG you can zoom into forever.",
    accent: colors.plum,
    accentGradient: `linear-gradient(90deg, ${colors.plum}, ${colors.pink})`,
    visual: "vectors" as const,
  },
  {
    title: "Cozy multiplayer",
    desc: "Up to 12 friends. Share a link, pick words, start when ready.",
    accent: colors.green,
    visual: "multiplayer" as const,
  },
  {
    title: "Familiar toolbar",
    desc: "Select, Path, Rectangle, Circle — Figma vibes.",
    accent: colors.pink,
    visual: "toolbar" as const,
  },
  {
    title: "Publish to the gallery",
    desc: "Earn upvotes and climb the weekly board.",
    accent: colors.chartreuse,
    visual: "gallery" as const,
  },
  {
    title: "Keyboard everything",
    desc: "P · R · O · V · ⌘Z",
    accent: colors.plum,
    visual: "keyboard" as const,
  },
];

const AVATAR_R = 22;
const AVATAR_STEP = 30;
const AVATAR_START = 12;

/** Overlapping player avatars — reads as "your crew in one room" */
function MultiplayerVisual() {
  const avatars = [
    { letter: "M", fill: colors.pink },
    { letter: "A", fill: colors.green },
    { letter: "K", fill: colors.plum },
    { letter: "L", fill: colors.chartreuse },
    { letter: "R", fill: colors.ink },
  ];

  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-[240px]" aria-hidden>
      {avatars.map((a, i) => {
        const cx = AVATAR_START + AVATAR_R + i * AVATAR_STEP;
        return (
          <g key={a.letter} className="fv-avatar">
            <circle cx={cx} cy="44" r={AVATAR_R} fill={a.fill} stroke={colors.whitePure} strokeWidth="3.5" />
            <text
              x={cx}
              y="50"
              textAnchor="middle"
              fontSize="17"
              fontWeight="800"
              fill={colors.whitePure}
              fontFamily="var(--font-dm-sans), system-ui, sans-serif"
            >
              {a.letter}
            </text>
          </g>
        );
      })}
      <text
        className="fv-avatar-extra"
        x={AVATAR_START + AVATAR_R + avatars.length * AVATAR_STEP + 10}
        y="50"
        fontSize="15"
        fontWeight="700"
        fill={colors.ink}
        fillOpacity={0.45}
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
      >
        +4
      </text>
    </svg>
  );
}

/** Nested circles + loupe hint = infinite zoom without blur */
function VectorsVisual() {
  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-[240px]" aria-hidden>
      <g className="fv-vector-circle" style={{ transformOrigin: "72px 44px" }}>
        <circle cx="72" cy="44" r="28" fill={colors.pink} fillOpacity={0.85} />
        <circle cx="72" cy="44" r="18" fill={colors.plum} fillOpacity={0.9} />
        <circle cx="72" cy="44" r="8" fill={colors.chartreuse} />
      </g>
      <circle className="fv-vector-circle" cx="128" cy="38" r="16" fill={colors.green} style={{ transformOrigin: "128px 38px" }} />
      <circle className="fv-vector-circle" cx="158" cy="52" r="22" fill={colors.plum} style={{ transformOrigin: "158px 52px" }} />
      <circle className="fv-vector-circle" cx="196" cy="40" r="14" fill={colors.chartreuse} style={{ transformOrigin: "196px 40px" }} />
      {/* magnifier = zoom forever */}
      <g className="fv-vector-loupe" style={{ transformOrigin: "196px 40px" }}>
        <circle cx="196" cy="40" r="10" fill="none" stroke={colors.ink} strokeWidth="2" strokeOpacity={0.35} />
        <line x1="203" y1="47" x2="212" y2="56" stroke={colors.ink} strokeWidth="2.5" strokeLinecap="round" strokeOpacity={0.35} />
      </g>
    </svg>
  );
}

function ToolbarVisual() {
  const tools = [
    { label: "V", active: false },
    { label: "P", active: true },
    { label: "R", active: false },
    { label: "O", active: false },
  ];

  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-[240px]" aria-hidden>
      {tools.map((tool, i) => {
        const x = 48 + i * 44;
        return (
          <g
            key={tool.label}
            className={tool.active ? "fv-tool fv-tool-active" : "fv-tool"}
            style={{ transformOrigin: `${x + 18}px 44px` }}
          >
            <rect
              x={x}
              y="26"
              width="36"
              height="36"
              rx="10"
              fill={tool.active ? colors.plum : colors.whitePure}
              stroke={tool.active ? colors.plum : colors.ink}
              strokeOpacity={tool.active ? 1 : 0.12}
              strokeWidth="2"
            />
            <text
              x={x + 18}
              y="49"
              textAnchor="middle"
              fontSize="15"
              fontWeight="800"
              fill={tool.active ? colors.whitePure : colors.ink}
              fontFamily="var(--font-dm-sans), system-ui, sans-serif"
            >
              {tool.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GalleryVisual() {
  const bars = [
    { x: 52, h: 32, fill: colors.chartreuse },
    { x: 84, h: 48, fill: colors.green },
    { x: 116, h: 38, fill: colors.plum },
    { x: 148, h: 56, fill: colors.pink },
  ];

  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-[240px]" aria-hidden>
      <line x1="44" y1="72" x2="168" y2="72" stroke={colors.ink} strokeOpacity={0.1} strokeWidth="2" />
      {bars.map((bar) => (
        <rect
          key={bar.x}
          className="fv-bar"
          x={bar.x}
          y={72 - bar.h}
          width="20"
          height={bar.h}
          rx="4"
          fill={bar.fill}
          style={{ transformOrigin: `${bar.x + 10}px 72px` }}
        />
      ))}
      <path
        className="fv-trophy"
        d="M 196 28 L 200 36 L 208 36 L 202 42 L 204 50 L 196 46 L 188 50 L 190 42 L 184 36 L 192 36 Z"
        fill={colors.chartreuse}
        fillOpacity={0.9}
        style={{ transformOrigin: "196px 39px" }}
      />
    </svg>
  );
}

function KeyboardVisual() {
  const keys = [
    { label: "P", x: 28 },
    { label: "R", x: 62 },
    { label: "O", x: 96 },
    { label: "V", x: 130 },
    { label: "⌘Z", x: 164, wide: true },
  ];

  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-[240px]" aria-hidden>
      {keys.map((key) => {
        const w = key.wide ? 44 : 28;
        return (
          <g key={key.label} className="fv-key">
            <rect
              x={key.x}
              y="28"
              width={w}
              height="32"
              rx="8"
              fill={colors.whitePure}
              stroke={colors.ink}
              strokeOpacity={0.15}
              strokeWidth="2"
            />
            <text
              x={key.x + w / 2}
              y="49"
              textAnchor="middle"
              fontSize={key.wide ? "11" : "14"}
              fontWeight="700"
              fill={colors.ink}
              fontFamily="var(--font-dm-sans), system-ui, sans-serif"
            >
              {key.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FeatureVisual({ type }: { type: (typeof FEATURES)[number]["visual"] }) {
  if (type === "vectors") return <VectorsVisual />;
  if (type === "multiplayer") return <MultiplayerVisual />;
  if (type === "toolbar") return <ToolbarVisual />;
  if (type === "gallery") return <GalleryVisual />;
  return <KeyboardVisual />;
}

export function GameFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const cleanups: Array<() => void> = [];

      gsap.utils.toArray<HTMLElement>(".feature-visual").forEach((visual) => {
        const trigger = { trigger: visual, start: "top 82%", once: true };

        const circles = visual.querySelectorAll(".fv-vector-circle");
        if (circles.length) {
          gsap.from(circles, {
            scale: 0,
            duration: reduced ? 0 : 0.85,
            ease: "back.out(2.8)",
            stagger: 0.11,
            scrollTrigger: trigger,
          });
          const loupe = visual.querySelector(".fv-vector-loupe");
          if (loupe && !reduced) {
            gsap.from(loupe, {
              scale: 0,
              rotation: -30,
              duration: 0.6,
              ease: "back.out(2)",
              scrollTrigger: trigger,
              delay: 0.45,
            });
          }
        }

        const avatars = visual.querySelectorAll(".fv-avatar");
        if (avatars.length) {
          gsap.from(avatars, {
            x: -36,
            scale: 0.6,
            opacity: 0,
            duration: reduced ? 0 : 0.65,
            ease: "back.out(2.4)",
            stagger: 0.12,
            scrollTrigger: trigger,
          });
          const extra = visual.querySelector(".fv-avatar-extra");
          if (extra) {
            gsap.from(extra, {
              opacity: 0,
              x: -8,
              duration: reduced ? 0 : 0.4,
              ease: "power2.out",
              scrollTrigger: trigger,
              delay: 0.55,
            });
          }
        }

        const tools = visual.querySelectorAll(".fv-tool");
        if (tools.length) {
          gsap.from(tools, {
            y: 22,
            opacity: 0,
            scale: 0.85,
            duration: reduced ? 0 : 0.55,
            ease: "back.out(2)",
            stagger: 0.1,
            scrollTrigger: trigger,
          });
        }

        const bars = visual.querySelectorAll(".fv-bar");
        if (bars.length) {
          gsap.from(bars, {
            scaleY: 0,
            duration: reduced ? 0 : 0.85,
            ease: "expo.out",
            stagger: 0.12,
            scrollTrigger: trigger,
          });
          const trophy = visual.querySelector(".fv-trophy");
          if (trophy) {
            gsap.from(trophy, {
              scale: 0,
              rotation: -20,
              duration: reduced ? 0 : 0.6,
              ease: "back.out(2.5)",
              scrollTrigger: trigger,
              delay: 0.4,
            });
          }
        }

        const keyCaps = visual.querySelectorAll(".fv-key");
        if (keyCaps.length) {
          gsap.from(keyCaps, {
            y: -18,
            opacity: 0,
            duration: reduced ? 0 : 0.5,
            ease: "back.out(1.8)",
            stagger: 0.08,
            scrollTrigger: trigger,
          });
        }
      });

      if (reduced) return;

      gsap.to(".fv-tool-active", {
        scale: 1.14,
        duration: 1.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: 1.5,
      });

      // Hover: vector circles pulse outward
      const vectorCard = sectionRef.current?.querySelector("[data-visual='vectors']");
      if (vectorCard) {
        const onEnter = () => {
          gsap.to(vectorCard.querySelectorAll(".fv-vector-circle"), {
            scale: 1.12,
            duration: 0.35,
            ease: "power2.out",
            stagger: 0.06,
            yoyo: true,
            repeat: 1,
          });
        };
        vectorCard.addEventListener("mouseenter", onEnter);
        cleanups.push(() => vectorCard.removeEventListener("mouseenter", onEnter));
      }

      // Hover: avatars bounce in sequence
      const mpCard = sectionRef.current?.querySelector("[data-visual='multiplayer']");
      if (mpCard) {
        const onEnter = () => {
          gsap.to(mpCard.querySelectorAll(".fv-avatar"), {
            y: -6,
            duration: 0.28,
            ease: "power2.out",
            stagger: 0.07,
            yoyo: true,
            repeat: 1,
          });
        };
        mpCard.addEventListener("mouseenter", onEnter);
        cleanups.push(() => mpCard.removeEventListener("mouseenter", onEnter));
      }

      // Hover: gallery bars re-grow taller
      const galleryCard = sectionRef.current?.querySelector("[data-visual='gallery']");
      if (galleryCard) {
        const onEnter = () => {
          gsap.to(galleryCard.querySelectorAll(".fv-bar"), {
            scaleY: 1.25,
            duration: 0.4,
            ease: "power2.out",
            stagger: 0.08,
            transformOrigin: "bottom center",
            yoyo: true,
            repeat: 1,
          });
          gsap.to(galleryCard.querySelector(".fv-trophy"), {
            y: -4,
            rotation: 8,
            duration: 0.35,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
          });
        };
        galleryCard.addEventListener("mouseenter", onEnter);
        cleanups.push(() => galleryCard.removeEventListener("mouseenter", onEnter));
      }

      const keyboardCard = sectionRef.current?.querySelector("[data-visual='keyboard']");
      if (keyboardCard) {
        const keyCaps = keyboardCard.querySelectorAll(".fv-key");
        const press = () =>
          gsap.to(keyCaps, {
            y: 5,
            duration: 0.14,
            ease: "power2.in",
            stagger: 0.04,
            yoyo: true,
            repeat: 1,
            overwrite: "auto",
          });
        keyboardCard.addEventListener("mouseenter", press);
        cleanups.push(() => keyboardCard.removeEventListener("mouseenter", press));
      }

      return () => cleanups.forEach((fn) => fn());
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <FadeIn>
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-plum">The Game</p>
            <h2 className="mt-2 text-[clamp(1.75rem,5.5vw,2.5rem)] font-bold tracking-tight text-ink sm:mt-3 lg:text-5xl">
              Made for thinkers who can&apos;t draw.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted sm:text-base lg:text-right">
            Precise vector tools instead of messy brushes. Gorgeous output, zero talent required.
          </p>
        </div>
      </FadeIn>

      <FadeInStagger className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 lg:grid-cols-6">
        {FEATURES.map((feature, index) => (
          <FadeInItem
            key={feature.title}
            className={index < 3 ? "lg:col-span-2" : "lg:col-span-3"}
          >
            <motion.article
              whileHover={{ y: -6, boxShadow: `0 24px 48px -14px ${feature.accent}35` }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass-panel flex h-full flex-col overflow-hidden rounded-2xl"
              data-visual={feature.visual}
            >
              <div
                className="h-[3px] w-full shrink-0"
                style={{ background: feature.accentGradient ?? feature.accent }}
              />
              <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-7">
                <h3 className="text-base font-bold text-ink sm:text-lg">{feature.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{feature.desc}</p>
              </div>

              <div className="feature-visual dot-grid flex h-36 w-full items-center justify-center px-4 py-3 sm:h-44 sm:py-4">
                <FeatureVisual type={feature.visual} />
              </div>
            </motion.article>
          </FadeInItem>
        ))}
      </FadeInStagger>
    </section>
  );
}
