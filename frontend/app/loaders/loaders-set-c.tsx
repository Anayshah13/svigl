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

/** Cube Flip — isometric cube with cycling face accents */
function CubeFlip() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="cube-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="loader-anim anim-cube" style={{ transformOrigin: "60px 62px" }} filter="url(#cube-glow)">
        <polygon points="60,28 92,46 60,64 28,46" fill={colors.chartreuse} fillOpacity="0.85" />
        <polygon points="28,46 60,64 60,96 28,78" fill={colors.green} fillOpacity="0.75" />
        <polygon points="60,64 92,46 92,78 60,96" fill={colors.plum} fillOpacity="0.8" />
      </g>
      <ellipse cx="60" cy="104" rx="22" ry="4" fill={colors.plum} fillOpacity="0.2" />
    </svg>
  );
}

/** Timer Tick — game-style countdown ring */
function TimerTick() {
  const ticks = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="timer-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="60" cy="60" r="40" fill="none" stroke={colors.plum} strokeWidth="5" strokeOpacity="0.3" />
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="251"
        className="loader-anim anim-timer-ring"
        filter="url(#timer-glow)"
        transform="rotate(-90 60 60)"
      />
      {ticks.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={60 + Math.cos(rad) * 30}
            y1={60 + Math.sin(rad) * 30}
            x2={60 + Math.cos(rad) * 34}
            y2={60 + Math.sin(rad) * 34}
            stroke={colors.white}
            strokeWidth="1.5"
            strokeOpacity="0.35"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="60" cy="60" r="18" fill={colors.ink} fillOpacity="0.35" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.4" />
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill={colors.white}
        fontFamily="ui-monospace, monospace"
        className="loader-anim anim-timer-pulse"
      >
        0:42
      </text>
    </svg>
  );
}

/** Letter Bounce — SVIGL wordmark bounce */
function LetterBounce() {
  const letters = [
    { ch: "S", color: colors.pink },
    { ch: "V", color: colors.chartreuse },
    { ch: "I", color: colors.plum },
    { ch: "G", color: colors.green },
    { ch: "L", color: colors.pink },
  ];

  return (
    <div className="flex h-28 items-center justify-center gap-1.5" aria-hidden>
      {letters.map((l, i) => (
        <span
          key={l.ch}
          className={`loader-anim anim-letter anim-letter-d${i} text-2xl font-black tracking-tight`}
          style={{ color: l.color }}
        >
          {l.ch}
        </span>
      ))}
    </div>
  );
}

/** Concentric Spin — nested dashed rings, opposite directions */
function ConcentricSpin() {
  const rings = [
    { r: 46, color: colors.plum, dash: "10 6", cls: "anim-conc-cw", w: 2 },
    { r: 36, color: colors.pink, dash: "8 5", cls: "anim-conc-ccw", w: 2 },
    { r: 26, color: colors.green, dash: "7 5", cls: "anim-conc-cw-fast", w: 2 },
    { r: 16, color: colors.chartreuse, dash: "5 4", cls: "anim-conc-ccw-fast", w: 2.5 },
  ];

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      {rings.map((ring) => (
        <circle
          key={ring.r}
          cx="60"
          cy="60"
          r={ring.r}
          fill="none"
          stroke={ring.color}
          strokeWidth={ring.w}
          strokeDasharray={ring.dash}
          strokeOpacity="0.85"
          className={`loader-anim ${ring.cls}`}
          style={{ transformOrigin: "60px 60px" }}
        />
      ))}
      <circle cx="60" cy="60" r="5" fill={colors.chartreuse} />
    </svg>
  );
}

/** Pulse Core — soft core with expanding rings for overlays */
function PulseCore() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <radialGradient id="pulse-core-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.chartreuse} stopOpacity="1" />
          <stop offset="70%" stopColor={colors.chartreuse} stopOpacity="0.55" />
          <stop offset="100%" stopColor={colors.chartreuse} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="28"
        fill="none"
        stroke={colors.plum}
        strokeWidth="2"
        className="loader-anim anim-pulse-ring anim-pulse-d0"
      />
      <circle
        cx="60"
        cy="60"
        r="28"
        fill="none"
        stroke={colors.pink}
        strokeWidth="1.5"
        className="loader-anim anim-pulse-ring anim-pulse-d1"
      />
      <circle
        cx="60"
        cy="60"
        r="28"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="1.5"
        strokeOpacity="0.7"
        className="loader-anim anim-pulse-ring anim-pulse-d2"
      />
      <circle
        cx="60"
        cy="60"
        r="14"
        fill="url(#pulse-core-grad)"
        className="loader-anim anim-pulse-core"
      />
      <circle cx="60" cy="60" r="5" fill={colors.white} fillOpacity="0.9" />
    </svg>
  );
}

export const LOADER_SET_C: LoaderItem[] = [
  {
    title: "Cube Flip",
    description: "Isometric cube with soft rotation",
    component: CubeFlip,
  },
  {
    title: "Timer Tick",
    description: "Game countdown ring filling",
    component: TimerTick,
  },
  {
    title: "Letter Bounce",
    description: "SVIGL wordmark bounce stagger",
    component: LetterBounce,
  },
  {
    title: "Concentric Spin",
    description: "Nested dashes spinning opposite ways",
    component: ConcentricSpin,
  },
  {
    title: "Pulse Core",
    description: "Radar pulse for full-page overlays",
    component: PulseCore,
  },
];
