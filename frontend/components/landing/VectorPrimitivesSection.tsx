"use client";

import { motion } from "framer-motion";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { colors } from "@/lib/colors";

const PILLARS = [
  {
    title: "Shapes, not scribbles",
    desc: "Draw with clean geometry — rects, circles, and paths that connect at anchors. What you build actually looks like what you pictured, even under a timer.",
    accent: colors.chartreuse,
    tint: "rgba(187, 227, 49, 0.2)",
    icon: "geometry" as const,
  },
  {
    title: "Real SVG output",
    desc: "Every mark is live SVG markup. Copy the drawing, drop it in a repo, or share it in the gallery — vectors you can zoom forever.",
    accent: colors.plum,
    tint: "rgba(112, 63, 147, 0.12)",
    icon: "svg" as const,
  },
  {
    title: "Precision built in",
    desc: "Dot grid, anchor snapping, undo history, and fill/stroke controls. Figma-ish tooling without the learning curve.",
    accent: colors.pink,
    tint: colors.pinkLight,
    icon: "snap" as const,
  },
];

function GeometryVisual() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full max-w-[200px]" aria-hidden>
      {/* messy scribble — what you don't get */}
      <path
        d="M 18 62 Q 32 48, 44 58 T 68 52 T 92 60"
        fill="none"
        stroke={colors.ink}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity={0.12}
        strokeDasharray="4 4"
      />
      {/* clean primitive house */}
      <rect x="78" y="52" width="36" height="32" rx="2" fill={colors.green} />
      <circle cx="96" cy="44" r="14" fill={colors.chartreuse} />
      <rect x="88" y="64" width="16" height="20" rx="1" fill={colors.pink} />
      <path
        d="M 72 84 C 88 72, 104 72, 120 84"
        fill="none"
        stroke={colors.plum}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* anchor handles */}
      {[
        [78, 52],
        [114, 52],
        [78, 84],
        [114, 84],
        [96, 30],
        [72, 84],
        [120, 84],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={5} fill={colors.whitePure} stroke={colors.plum} strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={2} fill={colors.plum} />
        </g>
      ))}
      {/* bezier control hint on path */}
      <line x1="72" y1="84" x2="88" y2="72" stroke={colors.plum} strokeWidth="1" strokeOpacity={0.35} strokeDasharray="3 3" />
      <circle cx="88" cy="72" r="4" fill={colors.plum} fillOpacity={0.7} />
    </svg>
  );
}

function SvgOutputVisual() {
  return (
    <svg viewBox="0 0 220 100" className="h-full w-full max-w-[220px]" aria-hidden>
      {/* code panel */}
      <rect x="8" y="12" width="96" height="76" rx="6" fill="white" stroke={colors.plum} strokeOpacity={0.2} strokeWidth="1.5" />
      <text x="16" y="30" fontSize="8" fontFamily="monospace" fill={colors.plum} opacity={0.7}>
        {"<svg>"}
      </text>
      <text x="20" y="44" fontSize="7" fontFamily="monospace" fill={colors.ink} opacity={0.55}>
        {"<rect x=\"12\" … />"}
      </text>
      <text x="20" y="56" fontSize="7" fontFamily="monospace" fill={colors.ink} opacity={0.55}>
        {"<circle cx=\"48\" … />"}
      </text>
      <text x="20" y="68" fontSize="7" fontFamily="monospace" fill={colors.ink} opacity={0.55}>
        {"<path d=\"M…\" />"}
      </text>
      <text x="16" y="80" fontSize="8" fontFamily="monospace" fill={colors.plum} opacity={0.7}>
        {"</svg>"}
      </text>

      {/* arrow */}
      <path d="M 112 50 L 132 50 M 126 46 L 132 50 L 126 54" stroke={colors.plum} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* rendered output */}
      <rect x="144" y="18" width="68" height="64" rx="6" fill="white" stroke={colors.plum} strokeOpacity={0.15} strokeWidth="1.5" />
      <rect x="158" y="52" width="22" height="22" rx="2" fill={colors.green} />
      <circle cx="178" cy="42" r="10" fill={colors.chartreuse} />
      <path d="M 154 74 C 164 66, 174 66, 184 74" fill="none" stroke={colors.pink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SnapVisual() {
  return (
    <svg viewBox="0 0 200 100" className="h-full w-full max-w-[200px]" aria-hidden>
      {/* alignment guides */}
      <line x1="100" y1="16" x2="100" y2="88" stroke={colors.pink} strokeWidth="1.5" strokeOpacity={0.45} strokeDasharray="4 4" />
      <line x1="40" y1="58" x2="168" y2="58" stroke={colors.pink} strokeWidth="1.5" strokeOpacity={0.45} strokeDasharray="4 4" />

      {/* static shape */}
      <rect x="52" y="38" width="28" height="28" rx="3" fill={colors.green} fillOpacity={0.85} />

      {/* snapping shape */}
      <motion.g
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="108" y="38" width="28" height="28" rx="3" fill={colors.plum} fillOpacity={0.9} stroke={colors.pink} strokeWidth="2" />
        {/* snap pulse */}
        <circle cx="122" cy="52" r="6" fill="none" stroke={colors.pink} strokeWidth="1.5" opacity={0.6} />
      </motion.g>

      {/* grid anchor points */}
      {[40, 70, 100, 130, 160].flatMap((x) =>
        [28, 58, 78].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill={colors.plum} opacity={0.2} />
        )),
      )}

      {/* cursor */}
      <path d="M 148 68 L 148 82 L 152 78 L 155 84 L 158 82 L 154 74 L 160 74 Z" fill={colors.pink} />
    </svg>
  );
}

function PillarVisual({ type }: { type: (typeof PILLARS)[number]["icon"] }) {
  if (type === "geometry") return <GeometryVisual />;
  if (type === "svg") return <SvgOutputVisual />;
  return <SnapVisual />;
}

export function VectorPrimitivesSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
      <FadeIn>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-plum">Under the hood</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink lg:text-5xl">
            Why vector primitives?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            Brush-based drawing tools leave blurry strokes and jagged tablet lines. Svigl is
            structural sketching —{" "}
            <span className="script-accent text-xl text-plum">CAD vibes, gallery-ready output.</span>
          </p>
        </div>
      </FadeIn>

      <FadeInStagger className="mt-12 grid gap-5 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <FadeInItem key={pillar.title}>
            <motion.article
              whileHover={{ y: -5, boxShadow: `0 20px 40px -12px ${pillar.accent}28` }}
              className="glass-panel flex h-full flex-col rounded-2xl p-6 lg:p-7"
            >
              <h3 className="text-lg font-bold text-ink">{pillar.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{pillar.desc}</p>

              <div
                className="dot-grid mt-6 flex h-36 w-full items-center justify-center rounded-xl border border-white/60 px-4 py-3"
                style={{ borderTop: `2px solid ${pillar.accent}` }}
              >
                <PillarVisual type={pillar.icon} />
              </div>
            </motion.article>
          </FadeInItem>
        ))}
      </FadeInStagger>
    </section>
  );
}
