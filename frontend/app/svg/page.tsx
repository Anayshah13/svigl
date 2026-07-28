"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LABS_CTA_ITERATIONS } from "@/components/layout/LabsCtaMarks";
import { SviglLabsLogo } from "@/components/layout/SviglLabsLogo";

const colors = {
  pink: "#ED7FB8",
  green: "#10865C",
  plum: "#703F93",
  ink: "#2C2C2C",
  chartreuse: "#BBE331",
  white: "#FAFAF8",
};

/* ─── Shared UI ─────────────────────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  accent,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  accent?: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10 text-center"
    >
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-chartreuse">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-bold tracking-tight text-white/90 sm:text-4xl lg:text-5xl">
        {title}{" "}
        {accent ? <span style={{ color: colors.chartreuse }}>{accent}</span> : null}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-white/40 sm:text-base">{description}</p>
    </motion.div>
  );
}

function LogoCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141428]/95 shadow-xl backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-2xl"
    >
      <div className="flex min-h-[220px] items-center justify-center overflow-visible bg-[#fafaf8] px-6 py-10 sm:min-h-[240px]">
        {children}
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-sm font-semibold text-white/85">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/40">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function SvgCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 p-6 shadow-xl backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-2xl"
    >
      <div className="flex h-48 w-full items-center justify-center">{children}</div>
      <p className="text-xs font-medium uppercase tracking-wider text-white/40">{title}</p>
    </motion.div>
  );
}

function SviglWord({ className = "" }: { className?: string }) {
  return (
    <span className={`script-accent font-bold leading-none tracking-tight text-plum ${className}`}>
      Svigl
    </span>
  );
}

/* ─── Labs logo finals (03 chosen, 04 alternate) ────────────── */

function LabsFinalFlaskSlash() {
  return <SviglLabsLogo size="lg" link={false} />;
}

function LabsAltStackGalindo() {
  return (
    <div className="flex flex-col items-center gap-1">
      <SviglWord className="text-[4.5rem] sm:text-[5rem]" />
      <span className="font-display text-[1.65rem] leading-none tracking-wide text-green sm:text-[1.85rem]">
        Labs
      </span>
    </div>
  );
}

const LAB_LOGOS = [
  {
    title: "03 · Chosen — Flask Slash",
    subtitle: "Official Svigl Labs lockup: Caveat + flask + slash + Galindo Labs.",
    component: LabsFinalFlaskSlash,
  },
  {
    title: "04 · Alternate — Green Stack",
    subtitle: "Stacked Caveat / Galindo Labs in brand green.",
    component: LabsAltStackGalindo,
  },
];

/* ─── Original brand SVG primitives (restored) ──────────────── */

function LogoMark() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="80" fill="none" stroke={colors.plum} strokeWidth="3" strokeOpacity="0.4" />
      <circle cx="100" cy="100" r="60" fill="none" stroke={colors.chartreuse} strokeWidth="2" strokeDasharray="8 4" strokeOpacity="0.6" />
      <path d="M 60 120 C 60 80, 100 60, 100 80 S 140 80, 140 120" fill="none" stroke={colors.chartreuse} strokeWidth="4" strokeLinecap="round" filter="url(#logo-glow)" />
      <circle cx="100" cy="100" r="8" fill={colors.chartreuse} filter="url(#logo-glow)" />
    </svg>
  );
}

function BezierSwirl() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="swirl-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M 30 170 C 30 100, 80 30, 100 60 S 130 140, 170 60 S 190 20, 180 40" fill="none" stroke={colors.pink} strokeWidth="3" strokeLinecap="round" filter="url(#swirl-glow)" />
      <path d="M 50 180 C 50 120, 90 50, 120 80 S 150 150, 180 80" fill="none" stroke={colors.plum} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="30" cy="170" r="4" fill={colors.white} stroke={colors.pink} strokeWidth="2" />
      <circle cx="180" cy="40" r="4" fill={colors.pink} />
      <circle cx="100" cy="60" r="6" fill={colors.pink} fillOpacity="0.8" />
      <circle cx="100" cy="60" r="10" fill="none" stroke={colors.pink} strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}

function ConcentricRings() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40 animate-[spin_20s_linear_infinite]">
      {[80, 65, 50, 35, 20].map((r, i) => (
        <circle
          key={i}
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={[colors.plum, colors.pink, colors.green, colors.chartreuse, colors.plum][i]}
          strokeWidth={2 - i * 0.2}
          strokeDasharray={`${6 + i * 2} ${3 + i}`}
          strokeOpacity={0.4 + i * 0.12}
        />
      ))}
      <circle cx="100" cy="100" r="6" fill={colors.chartreuse} />
    </svg>
  );
}

function GraffitiCharacter() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="char-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="75" y="80" width="50" height="60" rx="12" fill={colors.green} filter="url(#char-glow)" />
      <rect x="80" y="45" width="40" height="38" rx="8" fill={colors.chartreuse} filter="url(#char-glow)" />
      <rect x="88" y="58" width="8" height="10" rx="2" fill={colors.ink} />
      <rect x="104" y="58" width="8" height="10" rx="2" fill={colors.ink} />
      <rect x="89" y="59" width="3" height="4" rx="1" fill={colors.white} fillOpacity="0.7" />
      <rect x="105" y="59" width="3" height="4" rx="1" fill={colors.white} fillOpacity="0.7" />
      <rect x="58" y="90" width="18" height="8" rx="4" fill={colors.green} fillOpacity="0.7" />
      <rect x="124" y="90" width="18" height="8" rx="4" fill={colors.green} fillOpacity="0.7" />
      <rect x="82" y="138" width="12" height="20" rx="5" fill={colors.green} fillOpacity="0.7" />
      <rect x="106" y="138" width="12" height="20" rx="5" fill={colors.green} fillOpacity="0.7" />
      <ellipse cx="100" cy="165" rx="30" ry="6" fill={colors.chartreuse} fillOpacity="0.2" />
    </svg>
  );
}

function NeonGrid() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="grid-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[40, 80, 120, 160].map((x) => (
        <line key={`v-${x}`} x1={x} y1="20" x2={x} y2="180" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.3" />
      ))}
      {[40, 80, 120, 160].map((y) => (
        <line key={`h-${y}`} x1="20" y1={y} x2="180" y2={y} stroke={colors.plum} strokeWidth="1" strokeOpacity="0.3" />
      ))}
      <rect x="80" y="80" width="40" height="40" rx="4" fill="none" stroke={colors.chartreuse} strokeWidth="2" filter="url(#grid-glow)" />
      <circle cx="80" cy="80" r="3" fill={colors.chartreuse} />
      <circle cx="120" cy="80" r="3" fill={colors.chartreuse} />
      <circle cx="80" cy="120" r="3" fill={colors.chartreuse} />
      <circle cx="120" cy="120" r="3" fill={colors.chartreuse} />
      <rect x="40" y="40" width="40" height="40" rx="2" fill={colors.pink} fillOpacity="0.15" stroke={colors.pink} strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  );
}

function CubeIsometric() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="cube-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon points="100,50 150,75 100,100 50,75" fill={colors.chartreuse} fillOpacity="0.7" stroke={colors.chartreuse} strokeWidth="1.5" filter="url(#cube-glow)" />
      <polygon points="50,75 100,100 100,150 50,125" fill={colors.green} fillOpacity="0.6" stroke={colors.green} strokeWidth="1" />
      <polygon points="100,100 150,75 150,125 100,150" fill={colors.plum} fillOpacity="0.6" stroke={colors.plum} strokeWidth="1" />
      <ellipse cx="100" cy="165" rx="35" ry="8" fill={colors.plum} fillOpacity="0.15" />
    </svg>
  );
}

function AnchorPointsPath() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <path d="M 30 150 C 30 80, 80 40, 100 70 S 170 50, 170 120" fill="none" stroke={colors.green} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="150" x2="30" y2="80" stroke={colors.green} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="100" y1="70" x2="80" y2="40" stroke={colors.green} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="100" y1="70" x2="170" y2="50" stroke={colors.green} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
      <circle cx="30" cy="150" r="5" fill={colors.white} stroke={colors.green} strokeWidth="2" />
      <circle cx="100" cy="70" r="5" fill={colors.white} stroke={colors.green} strokeWidth="2" />
      <circle cx="170" cy="120" r="5" fill={colors.white} stroke={colors.green} strokeWidth="2" />
      <circle cx="30" cy="80" r="4" fill={colors.green} />
      <circle cx="80" cy="40" r="3.5" fill={colors.green} fillOpacity="0.7" />
      <circle cx="170" cy="50" r="3.5" fill={colors.green} fillOpacity="0.7" />
      <rect x="167" y="47" width="7" height="7" fill={colors.white} stroke={colors.green} strokeWidth="1.5" />
    </svg>
  );
}

function PolygonStack() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <polygon points="100,30 145,55 145,105 100,130 55,105 55,55" fill="none" stroke={colors.plum} strokeWidth="2" strokeOpacity="0.6" />
      <polygon points="100,50 135,72 125,112 75,112 65,72" fill={colors.plum} fillOpacity="0.15" stroke={colors.pink} strokeWidth="1.5" strokeOpacity="0.5" />
      <polygon points="100,65 125,105 75,105" fill={colors.chartreuse} fillOpacity="0.3" stroke={colors.chartreuse} strokeWidth="2" />
      <circle cx="100" cy="90" r="4" fill={colors.chartreuse} />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <circle key={i} cx={100 + Math.cos(rad) * 75} cy={90 + Math.sin(rad) * 75} r="2.5" fill={colors.pink} fillOpacity="0.5" />
        );
      })}
    </svg>
  );
}

function GameController() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="ctrl-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="50" y="65" width="100" height="70" rx="20" fill={colors.ink} stroke={colors.plum} strokeWidth="2" strokeOpacity="0.5" />
      <rect x="70" y="78" width="35" height="28" rx="4" fill={colors.chartreuse} fillOpacity="0.3" stroke={colors.chartreuse} strokeWidth="1.5" filter="url(#ctrl-glow)" />
      <circle cx="78" cy="88" r="3" fill={colors.chartreuse} fillOpacity="0.7" />
      <rect x="84" y="92" width="12" height="8" rx="2" fill={colors.green} fillOpacity="0.6" />
      <rect x="62" y="110" width="6" height="16" rx="2" fill={colors.plum} fillOpacity="0.7" />
      <rect x="57" y="115" width="16" height="6" rx="2" fill={colors.plum} fillOpacity="0.7" />
      <circle cx="120" cy="90" r="6" fill={colors.pink} fillOpacity="0.7" />
      <circle cx="135" cy="100" r="6" fill={colors.green} fillOpacity="0.7" />
      <circle cx="120" cy="110" r="6" fill={colors.chartreuse} fillOpacity="0.7" />
      <ellipse cx="100" cy="145" rx="40" ry="6" fill={colors.pink} fillOpacity="0.15" />
      <path d="M 140 70 L 142 65 L 144 70 L 149 72 L 144 74 L 142 79 L 140 74 L 135 72 Z" fill={colors.chartreuse} fillOpacity="0.6" />
    </svg>
  );
}

function SpiralDNA() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setPhase(((now - start) / 1000) * 2.2);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {Array.from({ length: 12 }).map((_, i) => {
        const y = 20 + i * 14;
        const offset = Math.sin((i / 12) * Math.PI * 2 + phase) * 30;
        const depth = Math.cos((i / 12) * Math.PI * 2 + phase);
        const leftInFront = depth > 0;
        return (
          <g key={i}>
            <line
              x1={100 + offset}
              y1={y}
              x2={100 - offset}
              y2={y}
              stroke={colors.plum}
              strokeWidth="1.25"
              strokeOpacity={0.25 + Math.abs(depth) * 0.2}
            />
            <circle
              cx={100 + offset}
              cy={y}
              r={4.2 + (leftInFront ? 1.2 : 0)}
              fill={colors.pink}
              fillOpacity={0.45 + (leftInFront ? 0.35 : 0.1) + (i % 3) * 0.05}
            />
            <circle
              cx={100 - offset}
              cy={y}
              r={4.2 + (!leftInFront ? 1.2 : 0)}
              fill={colors.green}
              fillOpacity={0.45 + (!leftInFront ? 0.35 : 0.1) + (i % 3) * 0.05}
            />
          </g>
        );
      })}
    </svg>
  );
}

function AbstractComposition() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <circle cx="70" cy="80" r="35" fill={colors.pink} fillOpacity="0.25" stroke={colors.pink} strokeWidth="1.5" strokeOpacity="0.5" />
      <rect x="90" y="60" width="60" height="80" rx="8" fill={colors.plum} fillOpacity="0.2" stroke={colors.plum} strokeWidth="1.5" strokeOpacity="0.5" />
      <polygon points="60,150 100,90 140,150" fill={colors.chartreuse} fillOpacity="0.2" stroke={colors.chartreuse} strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M 50 60 C 80 30, 150 40, 160 80" fill="none" stroke={colors.green} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="50" cy="60" r="4" fill={colors.green} />
      <circle cx="160" cy="80" r="4" fill={colors.green} />
      <circle cx="100" cy="90" r="3" fill={colors.chartreuse} />
    </svg>
  );
}

const SVG_ITEMS = [
  { title: "Logo Mark", component: LogoMark },
  { title: "Bezier Swirl", component: BezierSwirl },
  { title: "Concentric Rings", component: ConcentricRings },
  { title: "Graffiti Character", component: GraffitiCharacter },
  { title: "Neon Grid", component: NeonGrid },
  { title: "Isometric Cube", component: CubeIsometric },
  { title: "Anchor Points", component: AnchorPointsPath },
  { title: "Polygon Stack", component: PolygonStack },
  { title: "Game Controller", component: GameController },
  { title: "Spiral DNA", component: SpiralDNA },
  { title: "Abstract Composition", component: AbstractComposition },
];

/* ─── Page ──────────────────────────────────────────────────── */

export default function SvgShowcasePage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Labs logo mocks */}
        <section className="mb-20">
          <SectionHeader
            eyebrow="Lockups"
            title={
              <>
                <span className="script-accent text-[1.15em]">Svigl</span>
              </>
            }
            accent="Labs Logos"
            description="03 is the official lockup now used across Labs. 04 kept as the stacked alternate."
          />
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2">
            {LAB_LOGOS.map((item) => (
              <LogoCard key={item.title} title={item.title} subtitle={item.subtitle}>
                <item.component />
              </LogoCard>
            ))}
          </div>
        </section>

        {/* Labs CTA marks — stacked 04 lockup inside animated shapes */}
        <section className="mb-20">
          <SectionHeader
            eyebrow="Landing CTA"
            title={
              <>
                <span className="script-accent text-[1.15em]">Svigl</span>
              </>
            }
            accent="Labs CTA Marks"
            description="Kept Overlap + Dual Orbit. Seven new directions — soft drifts, orbits, morphs — plus a clean swirling test tube."
          />
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LABS_CTA_ITERATIONS.map((item) => (
              <LogoCard key={item.id} title={item.title} subtitle={item.subtitle}>
                <div className="flex min-h-65 items-center justify-center pt-6">
                  <item.component />
                </div>
              </LogoCard>
            ))}
          </div>
        </section>

        {/* Original brand SVGs */}
        <section>
          <SectionHeader
            eyebrow="Brand primitives"
            title="Svigl"
            accent="Brand SVGs"
            description="Vector motifs, geometric marks, and graffiti-inspired brand assets — curves, circles, squares, polygons."
          />
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {SVG_ITEMS.map((item) => (
              <SvgCard key={item.title} title={item.title}>
                <item.component />
              </SvgCard>
            ))}
          </div>
        </section>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center text-sm text-white/25"
        >
          All assets are pure SVG / type — scalable, editable, and infinite.
        </motion.p>
      </div>
    </div>
  );
}
