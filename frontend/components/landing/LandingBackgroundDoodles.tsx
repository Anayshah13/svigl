"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";
import { colors, palette } from "@/lib/colors";

const CENTER_X = 50;
const CENTER_Y = 48;

function opacityFromCenter(xPct: number, yPct: number, peak = 0.18, floor = 0.02): number {
  const dx = (xPct - CENTER_X) / 50;
  const dy = (yPct - CENTER_Y) / 50;
  const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy));
  return floor + (peak - floor) * dist ** 1.35;
}

function parsePct(value: string): number {
  return parseFloat(value);
}

type BaseDoodle = { x: string; y: string; color: string; delay: number; duration?: number };

type CircleDoodle = BaseDoodle & { kind: "circle"; size: number };
type RectDoodle = BaseDoodle & { kind: "rect"; w: number; h: number; rx: number };
type RingDoodle = BaseDoodle & { kind: "ring"; size: number; stroke: number };
type TriangleDoodle = BaseDoodle & { kind: "triangle"; size: number; rotate: number };
type DiamondDoodle = BaseDoodle & { kind: "diamond"; size: number; rotate: number };
type CrossDoodle = BaseDoodle & { kind: "cross"; size: number };

type Doodle = CircleDoodle | RectDoodle | RingDoodle | TriangleDoodle | DiamondDoodle | CrossDoodle;

/** Curated set — fewer, larger, edge-weighted */
const DOODLES: Doodle[] = [
  { kind: "circle", x: "1%", y: "4%", size: 92, color: colors.chartreuse, delay: 0 },
  { kind: "circle", x: "90%", y: "2%", size: 78, color: colors.pink, delay: 0.4 },
  { kind: "circle", x: "94%", y: "38%", size: 68, color: colors.plum, delay: 0.7 },
  { kind: "circle", x: "0%", y: "52%", size: 86, color: colors.green, delay: 0.2 },
  { kind: "circle", x: "88%", y: "62%", size: 96, color: colors.chartreuse, delay: 0.55 },
  { kind: "circle", x: "4%", y: "84%", size: 74, color: colors.pink, delay: 0.85 },

  { kind: "rect", x: "84%", y: "16%", w: 72, h: 72, rx: 16, color: colors.pink, delay: 0.15 },
  { kind: "rect", x: "0%", y: "28%", w: 48, h: 80, rx: 8, color: colors.green, delay: 0.45 },
  { kind: "rect", x: "90%", y: "78%", w: 88, h: 32, rx: 16, color: colors.plum, delay: 0.35 },
  { kind: "rect", x: "6%", y: "66%", w: 44, h: 44, rx: 10, color: colors.chartreuse, delay: 0.65 },

  { kind: "ring", x: "74%", y: "28%", size: 120, stroke: 2, color: colors.plum, delay: 0.2, duration: 24 },
  { kind: "ring", x: "4%", y: "44%", size: 104, stroke: 2, color: colors.green, delay: 0.6, duration: 28 },

  { kind: "triangle", x: "70%", y: "4%", size: 58, rotate: 15, color: colors.green, delay: 0.25, duration: 20 },
  { kind: "triangle", x: "0%", y: "74%", size: 52, rotate: -30, color: colors.plum, delay: 0.5, duration: 22 },

  { kind: "diamond", x: "86%", y: "48%", size: 52, rotate: 0, color: colors.pink, delay: 0.3, duration: 21 },

  { kind: "cross", x: "18%", y: "2%", size: 36, color: colors.plum, delay: 0.4, duration: 17 },
];

const SCATTER_DOTS = [
  { x: 3, y: 14, size: 14, color: palette[0] },
  { x: 97, y: 10, size: 12, color: palette[1] },
  { x: 96, y: 56, size: 16, color: palette[2] },
  { x: 2, y: 72, size: 13, color: palette[3] },
  { x: 94, y: 90, size: 15, color: palette[4] },
  { x: 78, y: 4, size: 12, color: palette[2] },
];

type BezierConfig = {
  id: string;
  left: string;
  top: string;
  width: number;
  viewH: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  cp1Base: { x: number; y: number };
  cp2Base: { x: number; y: number };
  cp1Motion: { ax: number; ay: number; speed: number };
  cp2Motion: { ax: number; ay: number; speed: number };
  color: string;
  phase: number;
};

const BACKGROUND_BEZIERS: BezierConfig[] = [
  {
    id: "b1",
    left: "2%",
    top: "10%",
    width: 220,
    viewH: 120,
    start: { x: 10, y: 95 },
    end: { x: 210, y: 25 },
    cp1Base: { x: 55, y: 30 },
    cp2Base: { x: 155, y: 85 },
    cp1Motion: { ax: 28, ay: 22, speed: 0.55 },
    cp2Motion: { ax: 20, ay: 18, speed: 0.42 },
    color: colors.plum,
    phase: 0,
  },
  {
    id: "b2",
    left: "68%",
    top: "72%",
    width: 240,
    viewH: 110,
    start: { x: 15, y: 20 },
    end: { x: 225, y: 90 },
    cp1Base: { x: 80, y: 75 },
    cp2Base: { x: 170, y: 15 },
    cp1Motion: { ax: 32, ay: 20, speed: 0.48 },
    cp2Motion: { ax: 24, ay: 26, speed: 0.62 },
    color: colors.green,
    phase: 1.8,
  },
  {
    id: "b3",
    left: "0%",
    top: "58%",
    width: 200,
    viewH: 100,
    start: { x: 5, y: 50 },
    end: { x: 195, y: 55 },
    cp1Base: { x: 60, y: 10 },
    cp2Base: { x: 140, y: 95 },
    cp1Motion: { ax: 22, ay: 30, speed: 0.5 },
    cp2Motion: { ax: 26, ay: 16, speed: 0.38 },
    color: colors.pink,
    phase: 3.2,
  },
];

function AnimatedBackgroundBezier({ config, opacity }: { config: BezierConfig; opacity: number }) {
  const [cp1, setCp1] = useState(config.cp1Base);
  const [cp2, setCp2] = useState(config.cp2Base);
  const t = useRef(0);

  useAnimationFrame((time) => {
    t.current = time / 1000 + config.phase;
    setCp1({
      x: config.cp1Base.x + Math.sin(t.current * config.cp1Motion.speed) * config.cp1Motion.ax,
      y: config.cp1Base.y + Math.cos(t.current * config.cp1Motion.speed * 0.9) * config.cp1Motion.ay,
    });
    setCp2({
      x: config.cp2Base.x + Math.cos(t.current * config.cp2Motion.speed * 1.1) * config.cp2Motion.ax,
      y: config.cp2Base.y + Math.sin(t.current * config.cp2Motion.speed * 0.85) * config.cp2Motion.ay,
    });
  });

  const { start, end } = config;
  const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  const guideOpacity = opacity * 0.65;

  return (
    <motion.svg
      viewBox={`0 0 ${config.width} ${config.viewH}`}
      className="absolute overflow-visible"
      style={{
        left: config.left,
        top: config.top,
        width: config.width,
        height: config.viewH,
        opacity,
      }}
      animate={{ x: [0, 8, -5, 0], y: [0, -6, 4, 0] }}
      transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: config.phase }}
    >
      <line
        x1={start.x}
        y1={start.y}
        x2={cp1.x}
        y2={cp1.y}
        stroke={config.color}
        strokeWidth={1}
        strokeOpacity={guideOpacity}
        strokeDasharray="4 5"
      />
      <line
        x1={end.x}
        y1={end.y}
        x2={cp2.x}
        y2={cp2.y}
        stroke={config.color}
        strokeWidth={1}
        strokeOpacity={guideOpacity}
        strokeDasharray="4 5"
      />
      <path
        d={pathD}
        fill="none"
        stroke={config.color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeOpacity={opacity * 1.2}
      />
      <circle cx={start.x} cy={start.y} r={3.5} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} strokeOpacity={opacity * 1.4} />
      <circle cx={end.x} cy={end.y} r={3.5} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} strokeOpacity={opacity * 1.4} />
      <circle cx={cp1.x} cy={cp1.y} r={5} fill={config.color} fillOpacity={opacity * 1.1} />
      <circle cx={cp1.x} cy={cp1.y} r={8} fill="none" stroke={config.color} strokeWidth={1} strokeOpacity={guideOpacity} />
      <rect
        x={cp2.x - 3.5}
        y={cp2.y - 3.5}
        width={7}
        height={7}
        fill={colors.whitePure}
        stroke={config.color}
        strokeWidth={1.5}
        strokeOpacity={opacity * 1.3}
      />
    </motion.svg>
  );
}

function driftAnimation(index: number, kind: string) {
  const amp = kind === "ring" ? 16 : 22;
  const rot = kind === "rect" || kind === "diamond" || kind === "triangle" ? 14 : 0;
  return {
    x: [0, amp * 0.6, -amp * 0.4, amp * 0.3, 0],
    y: [0, -amp, amp * 0.5, -amp * 0.3, 0],
    rotate: rot ? [0, rot * 0.5, -rot * 0.35, rot * 0.2, 0] : [0, 0, 0, 0, 0],
    scale: kind === "circle" ? [1, 1.06, 0.97, 1.03, 1] : [1, 1.04, 0.98, 1.02, 1],
  };
}

function DoodleShape({ d, i }: { d: Doodle; i: number }) {
  const xPct = parsePct(d.x);
  const yPct = parsePct(d.y);
  const opacity = opacityFromCenter(xPct, yPct);
  const duration = d.duration ?? 16 + (i % 5) * 2;
  const animate = driftAnimation(i, d.kind);
  const transition = { duration, repeat: Infinity, ease: "easeInOut" as const, delay: d.delay };

  if (d.kind === "circle") {
    return (
      <motion.div
        className="absolute rounded-full"
        style={{ left: d.x, top: d.y, width: d.size, height: d.size, backgroundColor: d.color, opacity }}
        animate={animate}
        transition={transition}
      />
    );
  }

  if (d.kind === "rect") {
    return (
      <motion.div
        className="absolute"
        style={{
          left: d.x,
          top: d.y,
          width: d.w,
          height: d.h,
          borderRadius: d.rx,
          backgroundColor: d.color,
          opacity: opacity * 0.9,
        }}
        animate={animate}
        transition={transition}
      />
    );
  }

  if (d.kind === "ring") {
    return (
      <motion.div
        className="absolute"
        style={{ left: d.x, top: d.y, width: d.size, height: d.size, opacity }}
        animate={{ ...animate, rotate: [0, 360] }}
        transition={{
          ...transition,
          rotate: { duration: duration * 1.4, repeat: Infinity, ease: "linear", delay: d.delay },
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke={d.color} strokeWidth={d.stroke} strokeDasharray="10 7" />
        </svg>
      </motion.div>
    );
  }

  if (d.kind === "triangle") {
    return (
      <motion.svg
        viewBox="0 0 100 86"
        className="absolute"
        style={{ left: d.x, top: d.y, width: d.size, height: d.size * 0.86, opacity }}
        animate={{ ...animate, rotate: [d.rotate, d.rotate + 120, d.rotate] }}
        transition={{
          ...transition,
          rotate: { duration: duration * 1.2, repeat: Infinity, ease: "easeInOut", delay: d.delay },
        }}
      >
        <polygon points="50,4 96,82 4,82" fill={d.color} />
      </motion.svg>
    );
  }

  if (d.kind === "diamond") {
    return (
      <motion.div
        className="absolute"
        style={{ left: d.x, top: d.y, width: d.size, height: d.size, backgroundColor: d.color, opacity: opacity * 0.85 }}
        animate={{ ...animate, rotate: [d.rotate, d.rotate + 90, d.rotate + 45, d.rotate] }}
        transition={{
          ...transition,
          rotate: { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut", delay: d.delay },
        }}
      />
    );
  }

  return (
    <motion.svg
      viewBox="0 0 40 40"
      className="absolute"
      style={{ left: d.x, top: d.y, width: d.size, height: d.size, opacity }}
      animate={{ ...animate, rotate: [0, 90, 180, 270, 360] }}
      transition={{
        ...transition,
        rotate: { duration: duration * 2, repeat: Infinity, ease: "linear", delay: d.delay },
      }}
    >
      <rect x="17" y="4" width="6" height="32" rx="2" fill={d.color} />
      <rect x="4" y="17" width="32" height="6" rx="2" fill={d.color} />
    </motion.svg>
  );
}

export function LandingBackgroundDoodles() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 50% 45%, rgba(250,250,248,0.94) 0%, rgba(250,250,248,0.4) 45%, transparent 72%)",
        }}
      />

      {BACKGROUND_BEZIERS.map((b) => {
        const xPct = parsePct(b.left);
        const yPct = parsePct(b.top);
        const opacity = opacityFromCenter(xPct, yPct, 0.22, 0.04);
        return <AnimatedBackgroundBezier key={b.id} config={b} opacity={opacity} />;
      })}

      {DOODLES.map((d, i) => (
        <DoodleShape key={`${d.kind}-${i}`} d={d} i={i} />
      ))}

      {SCATTER_DOTS.map((dot, i) => {
        const opacity = opacityFromCenter(dot.x, dot.y, 0.2, 0.03);
        return (
          <motion.div
            key={`dot-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
              backgroundColor: dot.color,
              opacity,
            }}
            animate={{
              x: [0, 12, -8, 6, 0],
              y: [0, -14, 8, -6, 0],
              scale: [1, 1.2, 0.92, 1.1, 1],
            }}
            transition={{ duration: 10 + i * 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        );
      })}
    </div>
  );
}
