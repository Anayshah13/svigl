"use client";

import { motion } from "framer-motion";

const colors = {
  pink: "#ED7FB8",
  green: "#10865C",
  plum: "#703F93",
  ink: "#2C2C2C",
  chartreuse: "#BBE331",
  white: "#FAFAF8",
};

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

function LogoMark() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
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
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
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
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Body */}
      <rect x="75" y="80" width="50" height="60" rx="12" fill={colors.green} filter="url(#char-glow)" />
      {/* Head */}
      <rect x="80" y="45" width="40" height="38" rx="8" fill={colors.chartreuse} filter="url(#char-glow)" />
      {/* Eyes */}
      <rect x="88" y="58" width="8" height="10" rx="2" fill={colors.ink} />
      <rect x="104" y="58" width="8" height="10" rx="2" fill={colors.ink} />
      <rect x="89" y="59" width="3" height="4" rx="1" fill={colors.white} fillOpacity="0.7" />
      <rect x="105" y="59" width="3" height="4" rx="1" fill={colors.white} fillOpacity="0.7" />
      {/* Limbs */}
      <rect x="58" y="90" width="18" height="8" rx="4" fill={colors.green} fillOpacity="0.7" />
      <rect x="124" y="90" width="18" height="8" rx="4" fill={colors.green} fillOpacity="0.7" />
      <rect x="82" y="138" width="12" height="20" rx="5" fill={colors.green} fillOpacity="0.7" />
      <rect x="106" y="138" width="12" height="20" rx="5" fill={colors.green} fillOpacity="0.7" />
      {/* Ground glow */}
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
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
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

function SprayBlob() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <radialGradient id="spray-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.pink} stopOpacity="0.8" />
          <stop offset="60%" stopColor={colors.plum} stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="50" fill="url(#spray-grad)" />
      {Array.from({ length: 30 }).map((_, i) => {
        const angle = (i / 30) * Math.PI * 2;
        const dist = 45 + Math.random() * 35;
        const cx = 100 + Math.cos(angle) * dist;
        const cy = 100 + Math.sin(angle) * dist;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={1 + Math.random() * 2.5}
            fill={i % 3 === 0 ? colors.pink : i % 3 === 1 ? colors.plum : colors.chartreuse}
            opacity={0.3 + Math.random() * 0.5}
          />
        );
      })}
    </svg>
  );
}

function VectorPen() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="pen-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Pen body */}
      <path d="M 80 160 L 100 40 L 120 160 Z" fill={colors.plum} fillOpacity="0.8" />
      <path d="M 92 160 L 100 120 L 108 160 Z" fill={colors.pink} fillOpacity="0.6" />
      {/* Pen tip */}
      <circle cx="100" cy="35" r="5" fill={colors.chartreuse} filter="url(#pen-glow)" />
      {/* Trail */}
      <path d="M 100 35 C 130 50, 140 80, 120 100 S 80 120, 70 150" fill="none" stroke={colors.chartreuse} strokeWidth="2" strokeLinecap="round" strokeDasharray="5 3" filter="url(#pen-glow)" />
      {/* Anchor points */}
      <circle cx="120" cy="100" r="3" fill={colors.white} stroke={colors.chartreuse} strokeWidth="1.5" />
      <circle cx="70" cy="150" r="3" fill={colors.white} stroke={colors.chartreuse} strokeWidth="1.5" />
    </svg>
  );
}

function GeometricFlower() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 100 + Math.cos(rad) * 40;
        const cy = 100 + Math.sin(rad) * 40;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="22"
            fill="none"
            stroke={[colors.pink, colors.green, colors.plum, colors.chartreuse, colors.pink, colors.green][i]}
            strokeWidth="2"
            strokeOpacity="0.6"
          />
        );
      })}
      <circle cx="100" cy="100" r="15" fill={colors.chartreuse} fillOpacity="0.7" />
      <circle cx="100" cy="100" r="6" fill={colors.white} fillOpacity="0.8" />
    </svg>
  );
}

function CubeIsometric() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="cube-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Top face */}
      <polygon points="100,50 150,75 100,100 50,75" fill={colors.chartreuse} fillOpacity="0.7" stroke={colors.chartreuse} strokeWidth="1.5" filter="url(#cube-glow)" />
      {/* Left face */}
      <polygon points="50,75 100,100 100,150 50,125" fill={colors.green} fillOpacity="0.6" stroke={colors.green} strokeWidth="1" />
      {/* Right face */}
      <polygon points="100,100 150,75 150,125 100,150" fill={colors.plum} fillOpacity="0.6" stroke={colors.plum} strokeWidth="1" />
      {/* Shadow */}
      <ellipse cx="100" cy="165" rx="35" ry="8" fill={colors.plum} fillOpacity="0.15" />
    </svg>
  );
}

function WavePattern() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M 10 ${60 + i * 25} Q 55 ${45 + i * 25}, 100 ${60 + i * 25} T 190 ${60 + i * 25}`}
          fill="none"
          stroke={[colors.plum, colors.pink, colors.green, colors.chartreuse, colors.plum][i]}
          strokeWidth={2.5 - i * 0.3}
          strokeOpacity={0.7 - i * 0.1}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function StarburstBadge() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="star-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const outerR = 70;
        const innerR = 45;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = 100 + Math.cos(angle) * r;
        const y = 100 + Math.sin(angle) * r;
        const nextAngle = ((i + 1) / 12) * Math.PI * 2;
        const nextR = (i + 1) % 2 === 0 ? outerR : innerR;
        const nx = 100 + Math.cos(nextAngle) * nextR;
        const ny = 100 + Math.sin(nextAngle) * nextR;
        return (
          <line key={i} x1={x} y1={y} x2={nx} y2={ny} stroke={colors.chartreuse} strokeWidth="2" strokeOpacity="0.6" filter="url(#star-glow)" />
        );
      })}
      <circle cx="100" cy="100" r="30" fill={colors.plum} fillOpacity="0.7" />
      <text x="100" y="108" textAnchor="middle" fontSize="20" fontWeight="900" fill={colors.white} fontFamily="system-ui">S</text>
    </svg>
  );
}

function AnchorPointsPath() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <path d="M 30 150 C 30 80, 80 40, 100 70 S 170 50, 170 120" fill="none" stroke={colors.green} strokeWidth="2.5" strokeLinecap="round" />
      {/* Handles */}
      <line x1="30" y1="150" x2="30" y2="80" stroke={colors.green} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="100" y1="70" x2="80" y2="40" stroke={colors.green} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="100" y1="70" x2="170" y2="50" stroke={colors.green} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="3 3" />
      {/* Anchor points */}
      <circle cx="30" cy="150" r="5" fill={colors.white} stroke={colors.green} strokeWidth="2" />
      <circle cx="100" cy="70" r="5" fill={colors.white} stroke={colors.green} strokeWidth="2" />
      <circle cx="170" cy="120" r="5" fill={colors.white} stroke={colors.green} strokeWidth="2" />
      {/* Control handles */}
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
      {/* Hexagon */}
      <polygon
        points="100,30 145,55 145,105 100,130 55,105 55,55"
        fill="none"
        stroke={colors.plum}
        strokeWidth="2"
        strokeOpacity="0.6"
      />
      {/* Pentagon */}
      <polygon
        points="100,50 135,72 125,112 75,112 65,72"
        fill={colors.plum}
        fillOpacity="0.15"
        stroke={colors.pink}
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      {/* Triangle */}
      <polygon
        points="100,65 125,105 75,105"
        fill={colors.chartreuse}
        fillOpacity="0.3"
        stroke={colors.chartreuse}
        strokeWidth="2"
      />
      {/* Center dot */}
      <circle cx="100" cy="90" r="4" fill={colors.chartreuse} />
      {/* Decorative outer dots */}
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
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Controller body */}
      <rect x="50" y="65" width="100" height="70" rx="20" fill={colors.ink} stroke={colors.plum} strokeWidth="2" strokeOpacity="0.5" />
      {/* Screen */}
      <rect x="70" y="78" width="35" height="28" rx="4" fill={colors.chartreuse} fillOpacity="0.3" stroke={colors.chartreuse} strokeWidth="1.5" filter="url(#ctrl-glow)" />
      <circle cx="78" cy="88" r="3" fill={colors.chartreuse} fillOpacity="0.7" />
      <rect x="84" y="92" width="12" height="8" rx="2" fill={colors.green} fillOpacity="0.6" />
      {/* D-pad */}
      <rect x="62" y="110" width="6" height="16" rx="2" fill={colors.plum} fillOpacity="0.7" />
      <rect x="57" y="115" width="16" height="6" rx="2" fill={colors.plum} fillOpacity="0.7" />
      {/* Buttons */}
      <circle cx="120" cy="90" r="6" fill={colors.pink} fillOpacity="0.7" />
      <circle cx="135" cy="100" r="6" fill={colors.green} fillOpacity="0.7" />
      <circle cx="120" cy="110" r="6" fill={colors.chartreuse} fillOpacity="0.7" />
      {/* Glow underneath */}
      <ellipse cx="100" cy="145" rx="40" ry="6" fill={colors.pink} fillOpacity="0.15" />
      {/* Sparkle */}
      <path d="M 140 70 L 142 65 L 144 70 L 149 72 L 144 74 L 142 79 L 140 74 L 135 72 Z" fill={colors.chartreuse} fillOpacity="0.6" />
    </svg>
  );
}

function DripTag() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="drip-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Tag background */}
      <rect x="35" y="50" width="130" height="60" rx="12" fill={colors.plum} fillOpacity="0.8" filter="url(#drip-glow)" />
      {/* Text */}
      <text x="100" y="88" textAnchor="middle" fontSize="28" fontWeight="900" fill={colors.white} fontFamily="system-ui" letterSpacing="2">
        SVIGL
      </text>
      {/* Drips */}
      {[55, 75, 100, 125, 145].map((x, i) => (
        <path
          key={i}
          d={`M ${x} 110 Q ${x} ${120 + i * 5}, ${x + (i % 2 === 0 ? 2 : -1)} ${125 + i * 8} Q ${x + 1} ${132 + i * 6}, ${x} ${128 + i * 7}`}
          fill={colors.plum}
          fillOpacity={0.6 - i * 0.08}
        />
      ))}
      {/* Underline accent */}
      <line x1="50" y1="95" x2="150" y2="95" stroke={colors.chartreuse} strokeWidth="2" strokeOpacity="0.6" />
    </svg>
  );
}

function CircuitBoard() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {/* Traces */}
      <path d="M 30 100 H 70 V 60 H 130 V 100 H 170" fill="none" stroke={colors.green} strokeWidth="2" strokeOpacity="0.6" />
      <path d="M 30 140 H 60 V 160 H 100 V 130 H 140 V 160 H 170" fill="none" stroke={colors.plum} strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M 100 30 V 60" fill="none" stroke={colors.chartreuse} strokeWidth="2" strokeOpacity="0.7" />
      <path d="M 100 100 V 130" fill="none" stroke={colors.pink} strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Nodes */}
      {[
        { x: 70, y: 60 }, { x: 130, y: 60 }, { x: 70, y: 100 }, { x: 130, y: 100 },
        { x: 60, y: 140 }, { x: 100, y: 130 }, { x: 140, y: 130 }, { x: 100, y: 60 },
      ].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={i % 2 === 0 ? colors.chartreuse : colors.green} fillOpacity="0.8" />
      ))}
      {/* Central chip */}
      <rect x="85" y="85" width="30" height="30" rx="4" fill="none" stroke={colors.chartreuse} strokeWidth="2" />
      <circle cx="100" cy="100" r="6" fill={colors.chartreuse} fillOpacity="0.5" />
    </svg>
  );
}

function EyeMotif() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="eye-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Eye outline */}
      <path d="M 30 100 Q 100 40, 170 100 Q 100 160, 30 100 Z" fill="none" stroke={colors.plum} strokeWidth="2.5" />
      {/* Iris */}
      <circle cx="100" cy="100" r="28" fill={colors.green} fillOpacity="0.6" stroke={colors.green} strokeWidth="1.5" filter="url(#eye-glow)" />
      {/* Pupil */}
      <circle cx="100" cy="100" r="12" fill={colors.ink} />
      {/* Highlight */}
      <circle cx="93" cy="92" r="5" fill={colors.white} fillOpacity="0.7" />
      <circle cx="108" cy="105" r="2.5" fill={colors.white} fillOpacity="0.4" />
      {/* Lashes */}
      {[-30, -15, 0, 15, 30].map((angle, i) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const startR = 42;
        const endR = 52;
        return (
          <line
            key={i}
            x1={100 + Math.cos(rad) * startR}
            y1={100 + Math.sin(rad) * startR}
            x2={100 + Math.cos(rad) * endR}
            y2={100 + Math.sin(rad) * endR}
            stroke={colors.plum}
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
        );
      })}
    </svg>
  );
}

function DiamondPattern() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {[
        { cx: 100, cy: 100, size: 70, color: colors.plum, opacity: 0.3 },
        { cx: 100, cy: 100, size: 50, color: colors.pink, opacity: 0.4 },
        { cx: 100, cy: 100, size: 30, color: colors.chartreuse, opacity: 0.6 },
      ].map((d, i) => (
        <rect
          key={i}
          x={d.cx - d.size / 2}
          y={d.cy - d.size / 2}
          width={d.size}
          height={d.size}
          rx={4}
          fill="none"
          stroke={d.color}
          strokeWidth={2}
          strokeOpacity={d.opacity}
          transform={`rotate(45, ${d.cx}, ${d.cy})`}
        />
      ))}
      <circle cx="100" cy="100" r="8" fill={colors.chartreuse} fillOpacity="0.8" />
      {/* Corner accents */}
      {[
        { x: 100, y: 30 }, { x: 170, y: 100 }, { x: 100, y: 170 }, { x: 30, y: 100 },
      ].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors.pink} fillOpacity="0.5" />
      ))}
    </svg>
  );
}

function SpiralDNA() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {Array.from({ length: 12 }).map((_, i) => {
        const y = 20 + i * 14;
        const offset = Math.sin((i / 12) * Math.PI * 2) * 30;
        return (
          <g key={i}>
            <circle cx={100 + offset} cy={y} r="5" fill={colors.pink} fillOpacity={0.5 + (i % 3) * 0.15} />
            <circle cx={100 - offset} cy={y} r="5" fill={colors.green} fillOpacity={0.5 + (i % 3) * 0.15} />
            <line x1={100 + offset} y1={y} x2={100 - offset} y2={y} stroke={colors.plum} strokeWidth="1" strokeOpacity="0.3" />
          </g>
        );
      })}
    </svg>
  );
}

function TimerBadge() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      <defs>
        <filter id="timer-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Outer ring */}
      <circle cx="100" cy="100" r="70" fill="none" stroke={colors.plum} strokeWidth="3" strokeOpacity="0.3" />
      {/* Progress arc */}
      <circle
        cx="100"
        cy="100"
        r="70"
        fill="none"
        stroke={colors.chartreuse}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="330 440"
        transform="rotate(-90, 100, 100)"
        filter="url(#timer-glow)"
      />
      {/* Inner ring */}
      <circle cx="100" cy="100" r="55" fill="none" stroke={colors.plum} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 3" />
      {/* Time display */}
      <text x="100" y="108" textAnchor="middle" fontSize="28" fontWeight="900" fill={colors.white} fontFamily="monospace">0:42</text>
      {/* Top notch */}
      <rect x="97" y="22" width="6" height="12" rx="3" fill={colors.chartreuse} />
      {/* Tick marks */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={100 + Math.cos(rad) * 62}
            y1={100 + Math.sin(rad) * 62}
            x2={100 + Math.cos(rad) * 67}
            y2={100 + Math.sin(rad) * 67}
            stroke={colors.white}
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.4"
          />
        );
      })}
    </svg>
  );
}

function AbstractComposition() {
  return (
    <svg viewBox="0 0 200 200" className="h-40 w-40">
      {/* Large circle */}
      <circle cx="70" cy="80" r="35" fill={colors.pink} fillOpacity="0.25" stroke={colors.pink} strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Overlapping rect */}
      <rect x="90" y="60" width="60" height="80" rx="8" fill={colors.plum} fillOpacity="0.2" stroke={colors.plum} strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Triangle overlay */}
      <polygon points="60,150 100,90 140,150" fill={colors.chartreuse} fillOpacity="0.2" stroke={colors.chartreuse} strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Connecting bezier */}
      <path d="M 50 60 C 80 30, 150 40, 160 80" fill="none" stroke={colors.green} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      {/* Accent dots */}
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
  { title: "Spray Blob", component: SprayBlob },
  { title: "Vector Pen", component: VectorPen },
  { title: "Geometric Flower", component: GeometricFlower },
  { title: "Isometric Cube", component: CubeIsometric },
  { title: "Wave Pattern", component: WavePattern },
  { title: "Starburst Badge", component: StarburstBadge },
  { title: "Anchor Points", component: AnchorPointsPath },
  { title: "Polygon Stack", component: PolygonStack },
  { title: "Game Controller", component: GameController },
  { title: "Drip Tag", component: DripTag },
  { title: "Circuit Board", component: CircuitBoard },
  { title: "Eye Motif", component: EyeMotif },
  { title: "Diamond Pattern", component: DiamondPattern },
  { title: "Spiral DNA", component: SpiralDNA },
  { title: "Timer Badge", component: TimerBadge },
  { title: "Abstract Composition", component: AbstractComposition },
];

export default function SvgShowcasePage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-white/90 sm:text-5xl lg:text-6xl">
            Svigl <span style={{ color: colors.chartreuse }}>Brand</span> SVGs
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/40 sm:text-lg">
            A collection of vector primitives, geometric motifs, and graffiti-inspired brand assets —
            all built with curves, circles, squares, and polygons.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {SVG_ITEMS.map((item) => (
            <SvgCard key={item.title} title={item.title}>
              <item.component />
            </SvgCard>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center text-sm text-white/25"
        >
          All assets are pure SVG — scalable, editable, and infinite.
        </motion.p>
      </div>
    </div>
  );
}
