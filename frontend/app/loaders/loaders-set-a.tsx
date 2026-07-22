"use client";

import type { FC } from "react";

const colors = {
  pink: "#ED7FB8",
  green: "#10865C",
  plum: "#703F93",
  ink: "#2C2C2C",
  chartreuse: "#BBE331",
  white: "#FAFAF8",
};

/** Ink Orbit — dual stroke-dash rings with soft glow */
function InkOrbit() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="ink-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke={colors.plum}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="70 30"
        strokeDashoffset="0"
        className="loader-anim anim-ink-outer"
        filter="url(#ink-glow)"
        opacity="0.9"
      />
      <circle
        cx="60"
        cy="60"
        r="28"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="45 35"
        strokeDashoffset="0"
        className="loader-anim anim-ink-inner"
        filter="url(#ink-glow)"
      />
      <circle
        cx="60"
        cy="60"
        r="6"
        fill={colors.chartreuse}
        className="loader-anim anim-ink-core"
        filter="url(#ink-glow)"
      />
      <circle cx="60" cy="60" r="48" fill="none" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.25" />
    </svg>
  );
}

/** Brush Stroke — calligraphy path that draws itself */
function BrushStroke() {
  return (
    <svg viewBox="0 0 160 100" className="h-24 w-40" aria-hidden>
      <defs>
        <linearGradient id="brush-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.pink} />
          <stop offset="100%" stopColor={colors.plum} />
        </linearGradient>
        <filter id="brush-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Soft understroke */}
      <path
        d="M 12 68 C 36 18, 58 88, 80 42 S 118 12, 148 55"
        fill="none"
        stroke={colors.plum}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
        className="loader-anim anim-brush-soft"
        filter="url(#brush-glow)"
      />
      {/* Main brush */}
      <path
        d="M 12 68 C 36 18, 58 88, 80 42 S 118 12, 148 55"
        fill="none"
        stroke="url(#brush-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="loader-anim anim-brush"
        filter="url(#brush-glow)"
      />
    </svg>
  );
}

/** Dot Pulse Grid — 3×3 bounce wave in brand colors */
function DotPulseGrid() {
  const dots: { cx: number; cy: number; fill: string; delay: number }[] = [
    { cx: 30, cy: 30, fill: colors.pink, delay: 0 },
    { cx: 60, cy: 30, fill: colors.chartreuse, delay: 1 },
    { cx: 90, cy: 30, fill: colors.plum, delay: 2 },
    { cx: 30, cy: 60, fill: colors.green, delay: 3 },
    { cx: 60, cy: 60, fill: colors.pink, delay: 4 },
    { cx: 90, cy: 60, fill: colors.chartreuse, delay: 5 },
    { cx: 30, cy: 90, fill: colors.plum, delay: 6 },
    { cx: 60, cy: 90, fill: colors.green, delay: 7 },
    { cx: 90, cy: 90, fill: colors.pink, delay: 8 },
  ];

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      {dots.map((d) => (
        <circle
          key={`${d.cx}-${d.cy}`}
          cx={d.cx}
          cy={d.cy}
          r="8"
          fill={d.fill}
          className={`loader-anim anim-dot anim-dot-d${d.delay}`}
        />
      ))}
    </svg>
  );
}

/** Spray Bloom — radial mist dots expand & fade */
function SprayBloom() {
  const sprays: { cx: number; cy: number; r: number; fill: string; delay: number; op: number }[] = [
    { cx: 60, cy: 60, r: 14, fill: colors.pink, delay: 0, op: 0.7 },
    { cx: 42, cy: 48, r: 7, fill: colors.plum, delay: 1, op: 0.65 },
    { cx: 78, cy: 52, r: 8, fill: colors.chartreuse, delay: 2, op: 0.7 },
    { cx: 50, cy: 78, r: 6, fill: colors.green, delay: 3, op: 0.6 },
    { cx: 74, cy: 76, r: 7, fill: colors.pink, delay: 4, op: 0.55 },
    { cx: 60, cy: 38, r: 5, fill: colors.plum, delay: 5, op: 0.5 },
    { cx: 34, cy: 66, r: 5, fill: colors.chartreuse, delay: 6, op: 0.5 },
    { cx: 88, cy: 64, r: 6, fill: colors.green, delay: 7, op: 0.55 },
  ];

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="spray-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      {/* static mist halo */}
      <circle cx="60" cy="60" r="36" fill={colors.plum} fillOpacity="0.12" />
      {sprays.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={s.fill}
          fillOpacity={s.op}
          filter="url(#spray-soft)"
          className={`loader-anim anim-spray anim-spray-d${s.delay}`}
        />
      ))}
      <circle cx="60" cy="60" r="4" fill={colors.white} fillOpacity="0.85" />
    </svg>
  );
}

/** Bezier Draw — elegant curve with traveling chartreuse pen tip */
function BezierDraw() {
  const pathD = "M 28 148 C 48 40, 92 40, 100 100 S 152 160, 172 52";

  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32 overflow-visible" aria-hidden>
      <defs>
        <filter id="pen-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bez-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.pink} />
          <stop offset="55%" stopColor={colors.plum} />
          <stop offset="100%" stopColor={colors.chartreuse} />
        </linearGradient>
      </defs>
      {/* faint guide */}
      <path
        d={pathD}
        fill="none"
        stroke={colors.white}
        strokeWidth="1.5"
        strokeOpacity="0.12"
        strokeLinecap="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke="url(#bez-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        className="loader-anim anim-bezier-path"
        filter="url(#pen-glow)"
      />
      {/* Pen tip — travels via CSS offset-path */}
      <circle
        r="5"
        cx="0"
        cy="0"
        fill={colors.chartreuse}
        className="loader-anim anim-bezier-pen"
        filter="url(#pen-glow)"
        style={{ transformBox: "fill-box" }}
      />
    </svg>
  );
}

export type LoaderItem = {
  title: string;
  description?: string;
  component: FC;
};

export const LOADER_SET_A: LoaderItem[] = [
  {
    title: "Ink Orbit",
    description: "Dual chartreuse / plum rings with soft glow",
    component: InkOrbit,
  },
  {
    title: "Brush Stroke",
    description: "Calligraphy path that draws itself",
    component: BrushStroke,
  },
  {
    title: "Dot Pulse Grid",
    description: "3×3 brand-dot bounce wave",
    component: DotPulseGrid,
  },
  {
    title: "Spray Bloom",
    description: "Spray-paint mist that expands and fades",
    component: SprayBloom,
  },
  {
    title: "Bezier Draw",
    description: "Curve with a traveling chartreuse pen tip",
    component: BezierDraw,
  },
];
