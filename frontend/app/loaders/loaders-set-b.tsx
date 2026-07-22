"use client";

import type { LoaderItem } from "./loaders-set-a";

const colors = {
  pink: "#ED7FB8",
  green: "#10865C",
  plum: "#703F93",
  ink: "#2C2C2C",
  chartreuse: "#BBE331",
  white: "#FAFAF8",
};

/** Arc Sweep — chartreuse progress arc over plum track */
function ArcSweep() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="arc-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke={colors.plum}
        strokeWidth="6"
        strokeOpacity="0.35"
      />
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="80 170"
        className="loader-anim anim-arc-sweep"
        filter="url(#arc-glow)"
        transform="rotate(-90 60 60)"
      />
      <circle cx="60" cy="60" r="8" fill={colors.plum} fillOpacity="0.5" />
      <circle cx="60" cy="60" r="4" fill={colors.chartreuse} />
    </svg>
  );
}

/** Morph Square — soft square ↔ diamond with multi-color edges */
function MorphSquare() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center" aria-hidden>
      <div
        className="loader-anim anim-morph-orbit absolute h-20 w-20 rounded-2xl border-2"
        style={{ borderColor: `${colors.pink}66` }}
      />
      <div
        className="loader-anim anim-morph-square h-14 w-14 border-[3px]"
        style={{
          borderColor: `${colors.chartreuse} ${colors.pink} ${colors.plum} ${colors.green}`,
          background: `linear-gradient(135deg, ${colors.plum}33, ${colors.green}22)`,
        }}
      />
    </div>
  );
}

/** Orbit Dots — three brand dots circling a core */
function OrbitDots() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <circle cx="60" cy="60" r="6" fill={colors.white} fillOpacity="0.9" />
      <circle cx="60" cy="60" r="22" fill="none" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.25" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="60" cy="60" r="46" fill="none" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.15" />

      <g className="loader-anim anim-orbit-a" style={{ transformOrigin: "60px 60px" }}>
        <circle cx="60" cy="16" r="5" fill={colors.pink} />
      </g>
      <g className="loader-anim anim-orbit-b" style={{ transformOrigin: "60px 60px" }}>
        <circle cx="60" cy="26" r="4.5" fill={colors.green} />
      </g>
      <g className="loader-anim anim-orbit-c" style={{ transformOrigin: "60px 60px" }}>
        <circle cx="60" cy="38" r="4" fill={colors.chartreuse} />
      </g>
    </svg>
  );
}

/** Segment Ring — dashed segments chasing around a ring */
function SegmentRing() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="seg-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke={colors.plum}
        strokeWidth="5"
        strokeDasharray="12 10"
        strokeOpacity="0.35"
      />
      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke={colors.pink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="28 210"
        className="loader-anim anim-segment-pink"
        filter="url(#seg-glow)"
      />
      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="18 220"
        className="loader-anim anim-segment-lime"
        filter="url(#seg-glow)"
      />
      <circle cx="60" cy="60" r="10" fill={colors.plum} fillOpacity="0.45" />
    </svg>
  );
}

/** Bar Cascade — equalizer bars with staggered scale */
function BarCascade() {
  const bars = [
    { h: 28, color: colors.plum, delay: 0 },
    { h: 44, color: colors.pink, delay: 1 },
    { h: 56, color: colors.chartreuse, delay: 2 },
    { h: 40, color: colors.green, delay: 3 },
    { h: 32, color: colors.plum, delay: 4 },
  ];

  return (
    <div className="flex h-28 items-end justify-center gap-2 pb-2" aria-hidden>
      {bars.map((b) => (
        <div
          key={b.delay}
          className={`loader-anim anim-bar anim-bar-d${b.delay} w-3 rounded-full`}
          style={{
            height: b.h,
            background: b.color,
            transformOrigin: "center bottom",
          }}
        />
      ))}
    </div>
  );
}

export const LOADER_SET_B: LoaderItem[] = [
  {
    title: "Arc Sweep",
    description: "Chartreuse arc sweeping a plum track",
    component: ArcSweep,
  },
  {
    title: "Morph Square",
    description: "Square softens into a diamond",
    component: MorphSquare,
  },
  {
    title: "Orbit Dots",
    description: "Three brand dots orbit a bright core",
    component: OrbitDots,
  },
  {
    title: "Segment Ring",
    description: "Dashed pink & lime segments chase",
    component: SegmentRing,
  },
  {
    title: "Bar Cascade",
    description: "Equalizer bars in brand colors",
    component: BarCascade,
  },
];
