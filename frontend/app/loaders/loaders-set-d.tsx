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

/** Pencil Sketch — pencil tip traces a wobbly circle that erases and redraws */
function PencilSketch() {
  const sketchPath =
    "M60 18 C82 16,100 34,102 56 C104 78,88 100,64 104 C40 108,18 90,16 66 C14 42,32 20,60 18Z";

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="pencil-grain" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence baseFrequency="0.65" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
        </filter>
      </defs>
      <path
        d={sketchPath}
        fill="none"
        stroke={colors.ink}
        strokeWidth="1.5"
        strokeOpacity="0.12"
        strokeLinecap="round"
      />
      <path
        d={sketchPath}
        fill="none"
        stroke={colors.plum}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="loader-anim anim-pencil-trace"
        filter="url(#pencil-grain)"
      />
      <g className="loader-anim anim-pencil-tip">
        <polygon
          points="0,-6 3,6 -3,6"
          fill={colors.chartreuse}
          stroke={colors.ink}
          strokeWidth="0.8"
        />
        <line x1="0" y1="6" x2="0" y2="10" stroke={colors.ink} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/** Hex Grid — honeycomb cells fill in a cascading wave */
function HexGrid() {
  const hexes: { x: number; y: number; fill: string; delay: number }[] = [
    { x: 60, y: 35, fill: colors.plum, delay: 0 },
    { x: 38, y: 48, fill: colors.pink, delay: 1 },
    { x: 82, y: 48, fill: colors.chartreuse, delay: 2 },
    { x: 38, y: 72, fill: colors.green, delay: 3 },
    { x: 82, y: 72, fill: colors.pink, delay: 4 },
    { x: 60, y: 85, fill: colors.plum, delay: 5 },
    { x: 60, y: 60, fill: colors.chartreuse, delay: 6 },
  ];

  const hexPath = "M0,-11 L9.5,-5.5 L9.5,5.5 L0,11 L-9.5,5.5 L-9.5,-5.5Z";

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="hex-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {hexes.map((h) => (
        <g key={`${h.x}-${h.y}`} transform={`translate(${h.x},${h.y})`}>
          <path
            d={hexPath}
            fill="none"
            stroke={colors.plum}
            strokeWidth="1"
            strokeOpacity="0.25"
          />
          <path
            d={hexPath}
            fill={h.fill}
            fillOpacity="0.85"
            filter="url(#hex-glow)"
            className={`loader-anim anim-hex anim-hex-d${h.delay}`}
          />
        </g>
      ))}
    </svg>
  );
}

/** Flask Bubble — erlenmeyer flask with bubbles rising inside */
function FlaskBubble() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <clipPath id="flask-clip">
          <path d="M46 20 h28 v22 l18 48 a14 14 0 0 1 -13 18 H41 a14 14 0 0 1 -13 -18 L46 42Z" />
        </clipPath>
        <filter id="flask-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M46 20 h28 v22 l18 48 a14 14 0 0 1 -13 18 H41 a14 14 0 0 1 -13 -18 L46 42Z"
        fill="none"
        stroke={colors.plum}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="48" y="14" width="24" height="8" rx="3" fill={colors.plum} />
      <rect x="30" y="78" width="60" height="28" rx="2" fill={colors.chartreuse} fillOpacity="0.25" clipPath="url(#flask-clip)" />
      <g clipPath="url(#flask-clip)">
        <circle cx="50" cy="95" r="4" fill={colors.pink} fillOpacity="0.7" className="loader-anim anim-bubble anim-bubble-d0" />
        <circle cx="62" cy="92" r="3" fill={colors.chartreuse} fillOpacity="0.8" className="loader-anim anim-bubble anim-bubble-d1" />
        <circle cx="70" cy="98" r="3.5" fill={colors.green} fillOpacity="0.65" className="loader-anim anim-bubble anim-bubble-d2" />
        <circle cx="55" cy="100" r="2.5" fill={colors.plum} fillOpacity="0.6" className="loader-anim anim-bubble anim-bubble-d3" />
        <circle cx="66" cy="96" r="2" fill={colors.pink} fillOpacity="0.5" className="loader-anim anim-bubble anim-bubble-d4" />
      </g>
    </svg>
  );
}

/** Dice Tumble — die face with rotating pip patterns */
function DiceTumble() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="dice-shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={colors.plum} floodOpacity="0.3" />
        </filter>
      </defs>
      <g className="loader-anim anim-dice-rock" style={{ transformOrigin: "60px 58px" }}>
        <rect
          x="28"
          y="26"
          width="64"
          height="64"
          rx="12"
          fill={colors.white}
          stroke={colors.plum}
          strokeWidth="2.5"
          filter="url(#dice-shadow)"
        />
        <g className="loader-anim anim-dice-face-1">
          <circle cx="44" cy="42" r="5" fill={colors.pink} />
          <circle cx="60" cy="58" r="5" fill={colors.plum} />
          <circle cx="76" cy="74" r="5" fill={colors.green} />
        </g>
        <g className="loader-anim anim-dice-face-2" opacity="0">
          <circle cx="44" cy="42" r="5" fill={colors.chartreuse} />
          <circle cx="76" cy="42" r="5" fill={colors.plum} />
          <circle cx="44" cy="74" r="5" fill={colors.plum} />
          <circle cx="76" cy="74" r="5" fill={colors.chartreuse} />
        </g>
        <g className="loader-anim anim-dice-face-3" opacity="0">
          <circle cx="60" cy="58" r="6" fill={colors.pink} />
        </g>
      </g>
      <ellipse cx="60" cy="102" rx="24" ry="4" fill={colors.plum} fillOpacity="0.15" />
    </svg>
  );
}

/** Waveform Pulse — oscillating audio wave bars */
function WaveformPulse() {
  const bars = [
    { x: 20, h: 18, color: colors.plum, delay: 0 },
    { x: 30, h: 30, color: colors.pink, delay: 1 },
    { x: 40, h: 44, color: colors.chartreuse, delay: 2 },
    { x: 50, h: 52, color: colors.green, delay: 3 },
    { x: 60, h: 60, color: colors.plum, delay: 4 },
    { x: 70, h: 52, color: colors.pink, delay: 5 },
    { x: 80, h: 44, color: colors.chartreuse, delay: 6 },
    { x: 90, h: 30, color: colors.green, delay: 7 },
    { x: 100, h: 18, color: colors.plum, delay: 8 },
  ];

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="wave-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x - 3}
          y={60 - b.h / 2}
          width="6"
          height={b.h}
          rx="3"
          fill={b.color}
          fillOpacity="0.85"
          filter="url(#wave-glow)"
          className={`loader-anim anim-wave anim-wave-d${b.delay}`}
          style={{ transformOrigin: `${b.x}px 60px` }}
        />
      ))}
    </svg>
  );
}

/** Helix Spin — double helix strands rotating like DNA */
function HelixSpin() {
  const nodes = 8;
  const nodeData = Array.from({ length: nodes }, (_, i) => {
    const t = i / (nodes - 1);
    const y = 14 + t * 92;
    const xA = 60 + Math.sin(t * Math.PI * 2) * 22;
    const xB = 60 - Math.sin(t * Math.PI * 2) * 22;
    return { y, xA, xB, colorA: i % 2 === 0 ? colors.pink : colors.chartreuse, colorB: i % 2 === 0 ? colors.green : colors.plum };
  });

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="helix-glow" x="-30%" y="-20%" width="160%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="loader-anim anim-helix-rotate" style={{ transformOrigin: "60px 60px" }} filter="url(#helix-glow)">
        {nodeData.map((n, i) => (
          <g key={i}>
            <line x1={n.xA} y1={n.y} x2={n.xB} y2={n.y} stroke={colors.plum} strokeWidth="1" strokeOpacity="0.25" />
            <circle cx={n.xA} cy={n.y} r="4.5" fill={n.colorA} fillOpacity="0.85" />
            <circle cx={n.xB} cy={n.y} r="4.5" fill={n.colorB} fillOpacity="0.85" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Pixel Mosaic — 4×4 grid tiles assemble, shimmer, dissolve */
function PixelMosaic() {
  const palette = [colors.pink, colors.chartreuse, colors.plum, colors.green];
  const tiles = Array.from({ length: 16 }, (_, i) => ({
    x: 26 + (i % 4) * 17,
    y: 26 + Math.floor(i / 4) * 17,
    fill: palette[i % 4],
    delay: i,
  }));

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      {tiles.map((t) => (
        <rect
          key={t.delay}
          x={t.x}
          y={t.y}
          width="14"
          height="14"
          rx="2.5"
          fill={t.fill}
          className={`loader-anim anim-pixel anim-pixel-d${t.delay}`}
        />
      ))}
    </svg>
  );
}

/** Crosshair Lock — targeting reticle that scans and locks */
function CrosshairLock() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="xhair-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="60" cy="60" r="36" fill="none" stroke={colors.plum} strokeWidth="1.5" strokeOpacity="0.25" />
      <circle cx="60" cy="60" r="24" fill="none" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 4" />
      <g className="loader-anim anim-xhair-spin" style={{ transformOrigin: "60px 60px" }}>
        <path d="M60 18 v14" stroke={colors.chartreuse} strokeWidth="2.5" strokeLinecap="round" filter="url(#xhair-glow)" />
        <path d="M60 88 v14" stroke={colors.chartreuse} strokeWidth="2.5" strokeLinecap="round" filter="url(#xhair-glow)" />
        <path d="M18 60 h14" stroke={colors.pink} strokeWidth="2.5" strokeLinecap="round" filter="url(#xhair-glow)" />
        <path d="M88 60 h14" stroke={colors.pink} strokeWidth="2.5" strokeLinecap="round" filter="url(#xhair-glow)" />
      </g>
      <circle cx="60" cy="60" r="6" fill="none" stroke={colors.plum} strokeWidth="2" className="loader-anim anim-xhair-lock" />
      <circle cx="60" cy="60" r="2" fill={colors.chartreuse} className="loader-anim anim-xhair-dot" />
    </svg>
  );
}

/** Hourglass Flow — stylized hourglass with sand streaming between chambers */
function HourglassFlow() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="sand-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="glass-clip">
          <path d="M34 16 h52 L62 56 l-4 4 l4 4 L86 104 H34 L58 64 l4-4 l-4-4Z" />
        </clipPath>
      </defs>
      <g className="loader-anim anim-hourglass-flip" style={{ transformOrigin: "60px 60px" }}>
        <path
          d="M34 16 h52 L62 56 l-4 4 l4 4 L86 104 H34 L58 64 l4-4 l-4-4Z"
          fill="none"
          stroke={colors.plum}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="30" y="14" width="60" height="5" rx="2" fill={colors.plum} />
        <rect x="30" y="101" width="60" height="5" rx="2" fill={colors.plum} />
        <g clipPath="url(#glass-clip)">
          <rect x="34" y="16" width="52" height="22" fill={colors.chartreuse} fillOpacity="0.6" className="loader-anim anim-sand-top" />
          <rect x="34" y="82" width="52" height="22" fill={colors.chartreuse} fillOpacity="0.6" className="loader-anim anim-sand-bottom" />
          <line x1="60" y1="56" x2="60" y2="68" stroke={colors.chartreuse} strokeWidth="2" strokeLinecap="round" className="loader-anim anim-sand-stream" filter="url(#sand-glow)" />
        </g>
      </g>
    </svg>
  );
}

/** Circuit Trace — PCB-style paths that light up in sequence */
function CircuitTrace() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <filter id="circuit-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke={colors.plum} strokeWidth="1.5" strokeOpacity="0.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 60 h20 l8-8 h24 l8 8 h20" />
        <path d="M60 20 v16 l-8 8 v12 l8 8 v16 l-8 8 v12" />
        <path d="M60 20 v16 l8 8 v12 l-8 8 v16 l8 8 v12" />
        <path d="M28 36 h12 l8 8 h24 l8-8 h12" />
        <path d="M28 84 h12 l8-8 h24 l8 8 h12" />
      </g>
      <path d="M20 60 h20 l8-8 h24 l8 8 h20" fill="none" stroke={colors.chartreuse} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#circuit-glow)" className="loader-anim anim-circuit-a" />
      <path d="M60 20 v16 l8 8 v12 l-8 8 v16 l8 8 v12" fill="none" stroke={colors.pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#circuit-glow)" className="loader-anim anim-circuit-b" />
      <path d="M28 36 h12 l8 8 h24 l8-8 h12" fill="none" stroke={colors.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#circuit-glow)" className="loader-anim anim-circuit-c" />
      {/* Junction nodes */}
      <circle cx="60" cy="60" r="4" fill={colors.chartreuse} className="loader-anim anim-circuit-node-a" />
      <circle cx="40" cy="60" r="3" fill={colors.pink} className="loader-anim anim-circuit-node-b" />
      <circle cx="80" cy="60" r="3" fill={colors.green} className="loader-anim anim-circuit-node-c" />
    </svg>
  );
}

export const LOADER_SET_D: LoaderItem[] = [
  {
    title: "Pencil Sketch",
    description: "Pencil tip traces a wobbly circle",
    component: PencilSketch,
  },
  {
    title: "Hex Grid",
    description: "Honeycomb cells fill in a cascade",
    component: HexGrid,
  },
  {
    title: "Flask Bubble",
    description: "Lab flask with bubbles rising — for Svigl Labs",
    component: FlaskBubble,
  },
  {
    title: "Dice Tumble",
    description: "Die face cycles pip patterns — for minigames",
    component: DiceTumble,
  },
  {
    title: "Waveform Pulse",
    description: "Audio wave bars oscillate in brand colors",
    component: WaveformPulse,
  },
  {
    title: "Helix Spin",
    description: "DNA double helix rotation — for Labs mode",
    component: HelixSpin,
  },
  {
    title: "Pixel Mosaic",
    description: "4×4 tiles assemble and shimmer",
    component: PixelMosaic,
  },
  {
    title: "Crosshair Lock",
    description: "Targeting reticle scans and locks — for solo games",
    component: CrosshairLock,
  },
  {
    title: "Hourglass Flow",
    description: "Sand streams between chambers — for timed rounds",
    component: HourglassFlow,
  },
  {
    title: "Circuit Trace",
    description: "PCB paths light up in sequence — for Labs",
    component: CircuitTrace,
  },
];
