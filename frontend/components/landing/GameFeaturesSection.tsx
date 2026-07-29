"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { colors } from "@/lib/colors";

const FEATURES: Array<{
  title: string;
  desc: string;
  accent: string;
  accentGradient?: string;
  visual: "hybrid" | "multiplayer" | "toolbar" | "gallery" | "noads";
}> = [
  {
    title: "Sketch it or snap it",
    desc: "Scribble a freehand pencil stroke, then drop an exact rectangle right next to it. Both live on the same canvas and export as one crisp SVG.",
    accent: colors.plum,
    accentGradient: `linear-gradient(90deg, ${colors.plum}, ${colors.pink})`,
    visual: "hybrid" as const,
  },
  {
    title: "Cozy multiplayer",
    desc: "Rooms hold up to 12 players. Share the link, pick your words, start when everyone's in.",
    accent: colors.green,
    visual: "multiplayer" as const,
  },
  {
    title: "Seven tools, no menus",
    desc: "Pencil, Select, Line, Rect, Ellipse, Fill, Eraser — tap 1–7 to switch, Ctrl+Z to undo. Click a tool below.",
    accent: colors.pink,
    visual: "toolbar" as const,
  },
  {
    title: "Every round lands in the gallery",
    desc: "Finished drawings are saved automatically, and anyone browsing can like or pass on them.",
    accent: colors.chartreuse,
    visual: "gallery" as const,
  },
  {
    title: "No ads, no friction",
    desc: "No pop-ups mid-round, no paywall to guess. Just a link, a canvas, and your friends.",
    accent: colors.plum,
    visual: "noads" as const,
  },
];

const AVATAR_R = 20;
const AVATAR_STEP = 28;
const AVATAR_START = 12;

const TOOLS = [
  {
    id: "pencil",
    label: "Pencil",
    key: "1",
    path: "M -5 5 L -5 1 L 3 -7 L 7 -3 L -1 5 Z",
    stroke: false,
  },
  {
    id: "select",
    label: "Select",
    key: "2",
    path: "M -4 -7 L 5 1 L 0 2 L 3 7 L 0 8 L -2 3 L -5 6 Z",
    stroke: false,
  },
  {
    id: "line",
    label: "Line",
    key: "3",
    path: "M -7 5 C -3 -7, 3 -7, 7 5",
    stroke: true,
  },
  {
    id: "rect",
    label: "Rectangle",
    key: "4",
    path: "M -6 -4 L 6 -4 L 6 4 L -6 4 Z",
    stroke: false,
  },
  {
    id: "ellipse",
    label: "Ellipse",
    key: "5",
    path: "M 6 0 A 6 6 0 1 1 -6 0 A 6 6 0 1 1 6 0",
    stroke: false,
  },
  {
    id: "fill",
    label: "Fill",
    key: "6",
    path: "M 0 -7 C 5 -1, 7 2, 7 4 A 7 7 0 0 1 -7 4 C -7 2, -5 -1, 0 -7 Z",
    stroke: false,
  },
  {
    id: "eraser",
    label: "Eraser",
    key: "7",
    path: "M -7 4 L 0 -4 L 6 2 L 0 8 L -4 8 Z",
    stroke: false,
  },
] as const;

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
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-56" aria-hidden>
      {avatars.map((a, i) => {
        const cx = AVATAR_START + AVATAR_R + i * AVATAR_STEP;
        return (
          <g key={a.letter} className="fv-avatar">
            <circle cx={cx} cy="44" r={AVATAR_R} fill={a.fill} stroke={colors.whitePure} strokeWidth="3.5" />
            <text
              x={cx}
              y="50"
              textAnchor="middle"
              fontSize="16"
              fontWeight="800"
              fill={colors.whitePure}
              fontFamily="var(--font-dm-sans), system-ui, sans-serif"
            >
              {a.letter}
            </text>
          </g>
        );
      })}
      <g className="fv-avatar-extra">
        <circle
          cx={AVATAR_START + AVATAR_R + avatars.length * AVATAR_STEP}
          cy="44"
          r={AVATAR_R}
          fill={colors.whitePure}
          stroke={colors.ink}
          strokeOpacity={0.15}
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x={AVATAR_START + AVATAR_R + avatars.length * AVATAR_STEP}
          y="50"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill={colors.ink}
          fillOpacity={0.45}
          fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        >
          +11
        </text>
      </g>
    </svg>
  );
}

/**
 * Left half: a loose freehand pencil stroke. Right half: geometric shapes with
 * anchor handles. Together they say "messy and precise on one canvas".
 */
function HybridVisual() {
  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-56" aria-hidden>
      <path
        className="fv-stroke"
        d="M 18 62 C 30 26, 44 22, 52 44 C 60 66, 72 68, 82 48 C 90 32, 100 30, 106 46"
        fill="none"
        stroke={colors.pink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="fv-stroke"
        d="M 24 74 C 46 68, 78 70, 102 66"
        fill="none"
        stroke={colors.plum}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity={0.55}
      />

      <line
        x1="120"
        y1="16"
        x2="120"
        y2="72"
        stroke={colors.ink}
        strokeOpacity={0.12}
        strokeWidth="2"
        strokeDasharray="5 6"
      />

      <g className="fv-shape" style={{ transformOrigin: "162px 48px" }}>
        <rect x="138" y="30" width="48" height="36" rx="6" fill={colors.green} fillOpacity={0.9} />
      </g>
      <g className="fv-shape" style={{ transformOrigin: "204px 40px" }}>
        <circle cx="204" cy="40" r="18" fill={colors.chartreuse} />
      </g>

      {[
        [138, 30],
        [186, 30],
        [138, 66],
        [186, 66],
      ].map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          className="fv-node"
          x={x - 3.5}
          y={y - 3.5}
          width="7"
          height="7"
          rx="1.5"
          fill={colors.whitePure}
          stroke={colors.plum}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

/** Clickable seven-tool dock with shortcut numbers under each glyph */
function ToolbarVisual() {
  const [active, setActive] = useState(0);

  return (
    <div className="fv-toolbar flex w-full max-w-xs flex-col items-center gap-1.5 px-1">
      <div
        className="flex w-full items-center justify-between gap-0.5 rounded-xl border border-ink/10 bg-white p-0.5 shadow-sm sm:gap-0.5 sm:p-1"
        role="toolbar"
        aria-label="Drawing tools"
      >
        {TOOLS.map((tool, i) => {
          const isActive = active === i;
          return (
            <button
              key={tool.id}
              type="button"
              className="fv-tool group relative flex min-h-8 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
              style={{
                background: isActive ? colors.plum : "transparent",
                color: isActive ? colors.whitePure : colors.ink,
              }}
              aria-pressed={isActive}
              aria-label={`${tool.label}, shortcut ${tool.key}`}
              onClick={(e) => {
                e.stopPropagation();
                setActive(i);
              }}
            >
              <svg viewBox="-10 -10 20 20" className="h-4 w-4" aria-hidden>
                <path
                  d={tool.path}
                  fill={tool.stroke ? "none" : "currentColor"}
                  fillOpacity={isActive ? 1 : 0.55}
                  stroke={tool.stroke ? "currentColor" : "none"}
                  strokeOpacity={isActive ? 1 : 0.55}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="font-mono text-[8px] font-bold leading-none"
                style={{ opacity: isActive ? 0.9 : 0.4 }}
              >
                {tool.key}
              </span>
            </button>
          );
        })}
      </div>
      <p className="fv-tool-label text-center text-xs font-semibold text-ink-muted">
        {TOOLS[active].label}{" "}
        <span className="font-mono font-bold text-plum">[{TOOLS[active].key}]</span>
      </p>
    </div>
  );
}

/** A finished drawing framed as a gallery card, with like / pass reactions */
function GalleryVisual() {
  return (
    <svg viewBox="0 0 240 88" className="h-full w-full max-w-56" aria-hidden>
      <g className="fv-frame" style={{ transformOrigin: "78px 44px" }}>
        <rect
          x="26"
          y="14"
          width="104"
          height="60"
          rx="10"
          fill={colors.whitePure}
          stroke={colors.ink}
          strokeOpacity={0.1}
          strokeWidth="2"
        />
        <path
          d="M 40 58 C 50 30, 60 30, 68 48 C 74 60, 82 58, 88 42"
          fill="none"
          stroke={colors.pink}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="106" cy="36" r="11" fill={colors.chartreuse} />
        <rect x="94" y="52" width="24" height="12" rx="3" fill={colors.green} fillOpacity={0.85} />
      </g>

      <g className="fv-heart" style={{ transformOrigin: "160px 34px" }}>
        <path
          d="M 0 8 C -13 -3, -7 -15, 0 -7 C 7 -15, 13 -3, 0 8 Z"
          transform="translate(160 34)"
          fill={colors.pink}
        />
        <text
          x="180"
          y="40"
          fontSize="15"
          fontWeight="800"
          fill={colors.ink}
          fillOpacity={0.6}
          fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        >
          128
        </text>
      </g>

      <g className="fv-heart" style={{ transformOrigin: "160px 66px" }}>
        <path
          d="M 0 -8 C 13 3, 7 15, 0 7 C -7 15, -13 3, 0 -8 Z"
          transform="translate(160 66)"
          fill={colors.ink}
          fillOpacity={0.18}
        />
        <text
          x="180"
          y="72"
          fontSize="15"
          fontWeight="800"
          fill={colors.ink}
          fillOpacity={0.35}
          fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        >
          4
        </text>
      </g>
    </svg>
  );
}

/** Crossed-out ad banner + clean play chip — "no ads, no friction" */
function NoAdsVisual() {
  const [banned, setBanned] = useState(true);

  return (
    <div className="fv-noads flex w-full max-w-[14rem] flex-col items-center gap-1.5 px-1">
      <button
        type="button"
        className="group relative w-full overflow-visible rounded-xl border-2 border-dashed border-ink/15 bg-white p-2.5 text-left transition-colors hover:border-plum/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
        aria-pressed={banned}
        aria-label={banned ? "Ads blocked — click to preview" : "Ads visible — click to block"}
        onClick={(e) => {
          e.stopPropagation();
          setBanned((v) => !v);
        }}
      >
        <div className="fv-ad-banner flex items-center gap-2 rounded-lg bg-ink/4 px-2 py-1.5">
          <div
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-md text-xs font-extrabold tracking-wide text-white"
            style={{ background: colors.pink }}
          >
            AD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-ink">Buy more guesses!</p>
            <p className="truncate text-xs text-ink-muted">Watch a 30s video →</p>
          </div>
        </div>

        {banned && (
          <>
            <span
              className="fv-slash pointer-events-none absolute top-1/2 left-[-18%] right-[-18%] h-0.5 -translate-y-1/2 -rotate-12 rounded-full"
              style={{ background: colors.plum }}
              aria-hidden
            />
            <span
              className="fv-ban-badge absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md"
              style={{ background: colors.chartreuse }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M7 7l10 10" />
              </svg>
            </span>
          </>
        )}
      </button>
      <p className="text-center text-xs font-semibold text-ink-muted">
        {banned ? "Blocked. Game stays clean." : "Tap again to block."}
      </p>
    </div>
  );
}

function FeatureVisual({ type }: { type: (typeof FEATURES)[number]["visual"] }) {
  if (type === "hybrid") return <HybridVisual />;
  if (type === "multiplayer") return <MultiplayerVisual />;
  if (type === "toolbar") return <ToolbarVisual />;
  if (type === "gallery") return <GalleryVisual />;
  return <NoAdsVisual />;
}

/** Dash-offset draw-on for a freehand path, restored to solid when finished. */
function drawStroke(path: SVGPathElement, duration: number, delay: number, trigger?: object) {
  const len = path.getTotalLength();
  return gsap.fromTo(
    path,
    { strokeDasharray: len, strokeDashoffset: len },
    {
      strokeDashoffset: 0,
      duration,
      delay,
      ease: "power2.out",
      ...(trigger ? { scrollTrigger: trigger } : {}),
      onComplete: () => {
        path.style.strokeDasharray = "";
        path.style.strokeDashoffset = "";
      },
    },
  );
}

export function GameFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const cleanups: Array<() => void> = [];

      gsap.utils.toArray<HTMLElement>(".feature-visual").forEach((visual) => {
        const trigger = { trigger: visual, start: "top 82%", once: true };

        const strokes = visual.querySelectorAll<SVGPathElement>(".fv-stroke");
        strokes.forEach((path, i) => {
          if (reduced) return;
          drawStroke(path, 0.9, i * 0.25, trigger);
        });

        const shapes = visual.querySelectorAll(".fv-shape");
        if (shapes.length) {
          gsap.from(shapes, {
            scale: 0,
            duration: reduced ? 0 : 0.7,
            ease: "back.out(2.6)",
            stagger: 0.12,
            scrollTrigger: trigger,
            delay: 0.35,
          });
        }

        const nodes = visual.querySelectorAll(".fv-node");
        if (nodes.length) {
          gsap.from(nodes, {
            scale: 0,
            opacity: 0,
            transformOrigin: "center center",
            duration: reduced ? 0 : 0.35,
            ease: "back.out(3)",
            stagger: 0.05,
            scrollTrigger: trigger,
            delay: 0.75,
          });
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
            y: 18,
            opacity: 0,
            scale: 0.85,
            duration: reduced ? 0 : 0.45,
            ease: "back.out(2)",
            stagger: 0.07,
            scrollTrigger: trigger,
          });
          const label = visual.querySelector(".fv-tool-label");
          if (label) {
            gsap.from(label, {
              opacity: 0,
              y: 6,
              duration: reduced ? 0 : 0.4,
              ease: "power2.out",
              scrollTrigger: trigger,
              delay: 0.45,
            });
          }
        }

        const frame = visual.querySelector(".fv-frame");
        if (frame) {
          gsap.from(frame, {
            scale: 0.82,
            opacity: 0,
            duration: reduced ? 0 : 0.65,
            ease: "back.out(1.8)",
            scrollTrigger: trigger,
          });
          gsap.from(visual.querySelectorAll(".fv-heart"), {
            scale: 0,
            opacity: 0,
            duration: reduced ? 0 : 0.5,
            ease: "back.out(2.6)",
            stagger: 0.14,
            scrollTrigger: trigger,
            delay: 0.4,
          });
        }

        const noads = visual.querySelector(".fv-noads");
        if (noads) {
          gsap.from(noads.querySelector(".fv-ad-banner"), {
            scale: 0.9,
            opacity: 0,
            duration: reduced ? 0 : 0.55,
            ease: "back.out(1.6)",
            scrollTrigger: trigger,
          });
          gsap.from(noads.querySelectorAll(".fv-slash, .fv-ban-badge"), {
            scale: 0,
            opacity: 0,
            duration: reduced ? 0 : 0.5,
            ease: "back.out(2.8)",
            stagger: 0.12,
            scrollTrigger: trigger,
            delay: 0.35,
          });
        }
      });

      if (reduced) return;

      // Hover: redraw the freehand stroke, pop the geometry
      const hybridCard = sectionRef.current?.querySelector("[data-visual='hybrid']");
      if (hybridCard) {
        const onEnter = () => {
          hybridCard
            .querySelectorAll<SVGPathElement>(".fv-stroke")
            .forEach((path, i) => drawStroke(path, 0.7, i * 0.15));
          gsap.to(hybridCard.querySelectorAll(".fv-shape"), {
            scale: 1.08,
            duration: 0.3,
            ease: "power2.out",
            stagger: 0.07,
            yoyo: true,
            repeat: 1,
          });
        };
        hybridCard.addEventListener("mouseenter", onEnter);
        cleanups.push(() => hybridCard.removeEventListener("mouseenter", onEnter));
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

      // Hover: the like reaction pops
      const galleryCard = sectionRef.current?.querySelector("[data-visual='gallery']");
      if (galleryCard) {
        const onEnter = () => {
          gsap.to(galleryCard.querySelectorAll(".fv-heart"), {
            scale: 1.22,
            duration: 0.3,
            ease: "back.out(3)",
            stagger: 0.1,
            yoyo: true,
            repeat: 1,
          });
          gsap.to(galleryCard.querySelector(".fv-frame"), {
            rotate: -2,
            duration: 0.32,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
          });
        };
        galleryCard.addEventListener("mouseenter", onEnter);
        cleanups.push(() => galleryCard.removeEventListener("mouseenter", onEnter));
      }

      // Hover: ban badge / slash pulse on the ad card
      const noAdsCard = sectionRef.current?.querySelector("[data-visual='noads']");
      if (noAdsCard) {
        const onEnter = () => {
          gsap.to(noAdsCard.querySelector(".fv-ban-badge"), {
            scale: 1.15,
            rotation: 12,
            duration: 0.3,
            ease: "back.out(3)",
            yoyo: true,
            repeat: 1,
          });
          gsap.to(noAdsCard.querySelector(".fv-slash"), {
            scaleX: 1.08,
            duration: 0.25,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
          });
        };
        noAdsCard.addEventListener("mouseenter", onEnter);
        cleanups.push(() => noAdsCard.removeEventListener("mouseenter", onEnter));
      }

      return () => cleanups.forEach((fn) => fn());
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-lg">
            <p className="text-xs font-bold uppercase tracking-widest text-plum">The Game</p>
            <h2 className="mt-1.5 font-display text-[clamp(1.4rem,4.4vw,2rem)] font-bold tracking-tight text-ink sm:mt-2 lg:text-4xl">
              About Svigl.
            </h2>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-ink-muted sm:text-sm lg:text-right">
            Sketch freehand when you&apos;re in a hurry, snap perfect shapes when you&apos;re not. Either
            way the canvas stays sharp at any zoom.
          </p>
        </div>
      </FadeIn>

      <FadeInStagger className="mt-6 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2 lg:grid-cols-6">
        {FEATURES.map((feature, index) => (
          <FadeInItem
            key={feature.title}
            className={index < 3 ? "lg:col-span-2" : "lg:col-span-3"}
          >
            <motion.article
              whileHover={{ y: -5, boxShadow: `0 20px 40px -12px ${feature.accent}35` }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`glass-panel flex h-full flex-col rounded-xl ${
                feature.visual === "noads" ? "overflow-visible" : "overflow-hidden"
              }`}
              data-visual={feature.visual}
            >
              <div
                className="h-0.5 w-full shrink-0 rounded-t-xl"
                style={{ background: feature.accentGradient ?? feature.accent }}
              />
              <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-5">
                <h3 className="font-display text-sm font-bold text-ink sm:text-base">{feature.title}</h3>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-ink-muted sm:text-[13px]">
                  {feature.desc}
                </p>
              </div>

              <div
                className={`feature-visual dot-grid flex h-28 w-full items-center justify-center px-3 py-2 sm:h-36 sm:py-3 ${
                  feature.visual === "noads" ? "overflow-visible" : ""
                }`}
              >
                <FeatureVisual type={feature.visual} />
              </div>
            </motion.article>
          </FadeInItem>
        ))}
      </FadeInStagger>
    </section>
  );
}
