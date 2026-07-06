"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { colors, palette } from "@/lib/colors";

const SHAPE_OPACITY = 0.14;
const CURVE_OPACITY = 0.13;
const DOT_OPACITY = 0.11;

type BaseDoodle = { x: string; y: string; color: string; delay: number; duration?: number; opacity?: number };

type CircleDoodle = BaseDoodle & { kind: "circle"; size: number };
type RectDoodle = BaseDoodle & { kind: "rect"; w: number; h: number; rx: number };
type RingDoodle = BaseDoodle & { kind: "ring"; size: number; stroke: number };
type TriangleDoodle = BaseDoodle & { kind: "triangle"; size: number; rotate: number };
type DiamondDoodle = BaseDoodle & { kind: "diamond"; size: number; rotate: number };
type CrossDoodle = BaseDoodle & { kind: "cross"; size: number };

type Doodle = CircleDoodle | RectDoodle | RingDoodle | TriangleDoodle | DiamondDoodle | CrossDoodle;

/** Dense field — hero through footer, scattered across x and y */
const DOODLES: Doodle[] = [
  // ── Hero (0–16%) ──
  { kind: "circle", x: "4%", y: "2%", size: 72, color: colors.chartreuse, delay: 0 },
  { kind: "circle", x: "88%", y: "1%", size: 64, color: colors.pink, delay: 0.3 },
  { kind: "rect", x: "72%", y: "8%", w: 48, h: 48, rx: 12, color: colors.pink, delay: 0.15 },
  { kind: "ring", x: "42%", y: "3%", size: 88, stroke: 2, color: colors.plum, delay: 0.5, duration: 24 },
  { kind: "cross", x: "16%", y: "5%", size: 32, color: colors.plum, delay: 0.4, duration: 17 },
  { kind: "triangle", x: "58%", y: "10%", size: 44, rotate: 12, color: colors.green, delay: 0.25, duration: 20 },
  { kind: "circle", x: "30%", y: "14%", size: 38, color: colors.green, delay: 0.6 },
  { kind: "diamond", x: "92%", y: "12%", size: 36, rotate: 0, color: colors.chartreuse, delay: 0.35, duration: 21 },
  { kind: "rect", x: "8%", y: "11%", w: 36, h: 56, rx: 8, color: colors.green, delay: 0.45 },
  { kind: "circle", x: "50%", y: "8%", size: 28, color: colors.pink, delay: 0.7 },
  { kind: "ring", x: "78%", y: "14%", size: 56, stroke: 1.5, color: colors.green, delay: 0.55, duration: 28 },

  // ── Hero lower / pre-features (16–28%) ──
  { kind: "circle", x: "6%", y: "20%", size: 52, color: colors.pink, delay: 0.2 },
  { kind: "rect", x: "38%", y: "18%", w: 64, h: 24, rx: 12, color: colors.plum, delay: 0.65 },
  { kind: "triangle", x: "82%", y: "22%", size: 48, rotate: -20, color: colors.plum, delay: 0.5, duration: 22 },
  { kind: "circle", x: "62%", y: "24%", size: 42, color: colors.chartreuse, delay: 0.15 },
  { kind: "cross", x: "22%", y: "26%", size: 28, color: colors.green, delay: 0.8, duration: 19 },
  { kind: "diamond", x: "48%", y: "20%", size: 40, rotate: 15, color: colors.pink, delay: 0.3, duration: 20 },
  { kind: "ring", x: "12%", y: "24%", size: 70, stroke: 2, color: colors.chartreuse, delay: 0.4, duration: 26 },
  { kind: "circle", x: "94%", y: "26%", size: 34, color: colors.green, delay: 0.75 },

  // ── Game features band (28–48%) ──
  { kind: "circle", x: "18%", y: "32%", size: 58, color: colors.chartreuse, delay: 0.1 },
  { kind: "rect", x: "52%", y: "30%", w: 44, h: 44, rx: 10, color: colors.green, delay: 0.55 },
  { kind: "ring", x: "76%", y: "34%", size: 80, stroke: 2, color: colors.pink, delay: 0.35, duration: 30 },
  { kind: "triangle", x: "36%", y: "38%", size: 36, rotate: 8, color: colors.plum, delay: 0.45, duration: 18 },
  { kind: "circle", x: "68%", y: "40%", size: 46, color: colors.plum, delay: 0.25 },
  { kind: "diamond", x: "8%", y: "42%", size: 34, rotate: 30, color: colors.pink, delay: 0.6, duration: 23 },
  { kind: "rect", x: "84%", y: "44%", w: 52, h: 28, rx: 14, color: colors.chartreuse, delay: 0.2 },
  { kind: "cross", x: "58%", y: "46%", size: 30, color: colors.green, delay: 0.7, duration: 16 },
  { kind: "circle", x: "42%", y: "34%", size: 24, color: colors.pink, delay: 0.85 },
  { kind: "ring", x: "28%", y: "44%", size: 52, stroke: 1.5, color: colors.plum, delay: 0.5, duration: 22 },

  // ── Vector primitives band (48–68%) ──
  { kind: "circle", x: "72%", y: "50%", size: 68, color: colors.green, delay: 0.15, opacity: 0.12 },
  { kind: "rect", x: "14%", y: "52%", w: 40, h: 64, rx: 8, color: colors.pink, delay: 0.4 },
  { kind: "triangle", x: "46%", y: "54%", size: 50, rotate: -12, color: colors.chartreuse, delay: 0.55, duration: 21 },
  { kind: "diamond", x: "88%", y: "56%", size: 38, rotate: 45, color: colors.plum, delay: 0.3, duration: 24 },
  { kind: "circle", x: "32%", y: "58%", size: 44, color: colors.plum, delay: 0.65 },
  { kind: "ring", x: "58%", y: "60%", size: 96, stroke: 2, color: colors.green, delay: 0.2, duration: 32 },
  { kind: "cross", x: "78%", y: "62%", size: 34, color: colors.chartreuse, delay: 0.75, duration: 18 },
  { kind: "rect", x: "4%", y: "64%", w: 56, h: 32, rx: 16, color: colors.green, delay: 0.45 },
  { kind: "circle", x: "52%", y: "66%", size: 30, color: colors.pink, delay: 0.8 },
  { kind: "triangle", x: "22%", y: "68%", size: 42, rotate: 25, color: colors.green, delay: 0.35, duration: 19 },

  // ── CTA band (68–84%) ──
  { kind: "circle", x: "38%", y: "72%", size: 54, color: colors.chartreuse, delay: 0.5 },
  { kind: "rect", x: "66%", y: "70%", w: 48, h: 48, rx: 12, color: colors.pink, delay: 0.25 },
  { kind: "ring", x: "10%", y: "74%", size: 74, stroke: 2, color: colors.plum, delay: 0.6, duration: 27 },
  { kind: "diamond", x: "82%", y: "76%", size: 32, rotate: 20, color: colors.green, delay: 0.4, duration: 22 },
  { kind: "circle", x: "54%", y: "78%", size: 40, color: colors.plum, delay: 0.15 },
  { kind: "cross", x: "44%", y: "80%", size: 26, color: colors.pink, delay: 0.7, duration: 17 },
  { kind: "triangle", x: "92%", y: "82%", size: 44, rotate: -15, color: colors.chartreuse, delay: 0.55, duration: 20 },
  { kind: "circle", x: "18%", y: "80%", size: 36, color: colors.pink, delay: 0.3 },

  // ── Footer band (84–98%) ──
  { kind: "circle", x: "62%", y: "86%", size: 48, color: colors.green, delay: 0.45 },
  { kind: "rect", x: "28%", y: "88%", w: 44, h: 24, rx: 8, color: colors.plum, delay: 0.65 },
  { kind: "ring", x: "48%", y: "90%", size: 60, stroke: 1.5, color: colors.pink, delay: 0.2, duration: 25 },
  { kind: "circle", x: "8%", y: "92%", size: 42, color: colors.chartreuse, delay: 0.75 },
  { kind: "diamond", x: "78%", y: "94%", size: 36, rotate: 10, color: colors.pink, delay: 0.5, duration: 21 },
  { kind: "triangle", x: "36%", y: "96%", size: 38, rotate: 18, color: colors.plum, delay: 0.35, duration: 23 },
  { kind: "cross", x: "88%", y: "92%", size: 30, color: colors.green, delay: 0.6, duration: 18 },
  { kind: "circle", x: "52%", y: "95%", size: 26, color: colors.plum, delay: 0.85 },
];

const SCATTER_DOTS = [
  { x: 12, y: 4, size: 12, color: palette[0] },
  { x: 35, y: 7, size: 10, color: palette[2] },
  { x: 68, y: 5, size: 14, color: palette[1] },
  { x: 92, y: 9, size: 11, color: palette[3] },
  { x: 24, y: 15, size: 9, color: palette[4] },
  { x: 55, y: 13, size: 13, color: palette[0] },
  { x: 80, y: 17, size: 10, color: palette[2] },
  { x: 8, y: 22, size: 11, color: palette[1] },
  { x: 42, y: 24, size: 12, color: palette[3] },
  { x: 72, y: 21, size: 9, color: palette[4] },
  { x: 96, y: 25, size: 14, color: palette[0] },
  { x: 18, y: 31, size: 10, color: palette[2] },
  { x: 48, y: 33, size: 12, color: palette[1] },
  { x: 64, y: 29, size: 8, color: palette[3] },
  { x: 86, y: 35, size: 11, color: palette[4] },
  { x: 6, y: 40, size: 13, color: palette[0] },
  { x: 32, y: 42, size: 9, color: palette[2] },
  { x: 58, y: 38, size: 14, color: palette[1] },
  { x: 78, y: 43, size: 10, color: palette[3] },
  { x: 94, y: 41, size: 12, color: palette[4] },
  { x: 14, y: 50, size: 11, color: palette[0] },
  { x: 40, y: 52, size: 13, color: palette[2] },
  { x: 62, y: 48, size: 9, color: palette[1] },
  { x: 84, y: 53, size: 12, color: palette[3] },
  { x: 26, y: 58, size: 10, color: palette[4] },
  { x: 50, y: 60, size: 14, color: palette[0] },
  { x: 74, y: 57, size: 11, color: palette[2] },
  { x: 4, y: 64, size: 12, color: palette[1] },
  { x: 36, y: 66, size: 9, color: palette[3] },
  { x: 60, y: 63, size: 13, color: palette[4] },
  { x: 88, y: 67, size: 10, color: palette[0] },
  { x: 16, y: 72, size: 11, color: palette[2] },
  { x: 44, y: 74, size: 12, color: palette[1] },
  { x: 68, y: 71, size: 9, color: palette[3] },
  { x: 92, y: 75, size: 14, color: palette[4] },
  { x: 10, y: 80, size: 10, color: palette[0] },
  { x: 52, y: 82, size: 13, color: palette[2] },
  { x: 76, y: 79, size: 11, color: palette[1] },
  { x: 30, y: 86, size: 12, color: palette[3] },
  { x: 58, y: 88, size: 9, color: palette[4] },
  { x: 82, y: 85, size: 14, color: palette[0] },
  { x: 20, y: 92, size: 11, color: palette[2] },
  { x: 46, y: 94, size: 10, color: palette[1] },
  { x: 70, y: 91, size: 13, color: palette[3] },
  { x: 94, y: 96, size: 12, color: palette[4] },
];

export type BezierConfig = {
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
  opacity?: number;
};

/** Cubic beziers with live control-point manipulation — spread across full page */
const BACKGROUND_BEZIERS: BezierConfig[] = [
  { id: "b1", left: "2%", top: "4%", width: 220, viewH: 110, start: { x: 10, y: 90 }, end: { x: 210, y: 20 }, cp1Base: { x: 50, y: 30 }, cp2Base: { x: 160, y: 80 }, cp1Motion: { ax: 22, ay: 18, speed: 0.52 }, cp2Motion: { ax: 18, ay: 14, speed: 0.4 }, color: colors.plum, phase: 0 },
  { id: "b2", left: "55%", top: "2%", width: 200, viewH: 100, start: { x: 15, y: 75 }, end: { x: 185, y: 25 }, cp1Base: { x: 60, y: 20 }, cp2Base: { x: 130, y: 70 }, cp1Motion: { ax: 16, ay: 20, speed: 0.48 }, cp2Motion: { ax: 14, ay: 12, speed: 0.55 }, color: colors.pink, phase: 0.9 },
  { id: "b3", left: "32%", top: "12%", width: 240, viewH: 90, start: { x: 5, y: 45 }, end: { x: 235, y: 48 }, cp1Base: { x: 75, y: 8 }, cp2Base: { x: 165, y: 82 }, cp1Motion: { ax: 20, ay: 14, speed: 0.44 }, cp2Motion: { ax: 16, ay: 18, speed: 0.5 }, color: colors.green, phase: 1.6 },
  { id: "b4", left: "68%", top: "16%", width: 180, viewH: 120, start: { x: 20, y: 100 }, end: { x: 160, y: 15 }, cp1Base: { x: 55, y: 55 }, cp2Base: { x: 120, y: 40 }, cp1Motion: { ax: 18, ay: 16, speed: 0.58 }, cp2Motion: { ax: 12, ay: 14, speed: 0.42 }, color: colors.chartreuse, phase: 2.2 },
  { id: "b5", left: "8%", top: "24%", width: 260, viewH: 95, start: { x: 8, y: 48 }, end: { x: 252, y: 52 }, cp1Base: { x: 85, y: 12 }, cp2Base: { x: 175, y: 88 }, cp1Motion: { ax: 24, ay: 16, speed: 0.46 }, cp2Motion: { ax: 18, ay: 20, speed: 0.52 }, color: colors.plum, phase: 0.5 },
  { id: "b6", left: "48%", top: "28%", width: 210, viewH: 105, start: { x: 12, y: 85 }, end: { x: 198, y: 18 }, cp1Base: { x: 65, y: 35 }, cp2Base: { x: 145, y: 65 }, cp1Motion: { ax: 20, ay: 14, speed: 0.5 }, cp2Motion: { ax: 15, ay: 12, speed: 0.45 }, color: colors.pink, phase: 3.0 },
  { id: "b7", left: "18%", top: "38%", width: 230, viewH: 100, start: { x: 10, y: 50 }, end: { x: 220, y: 55 }, cp1Base: { x: 70, y: 10 }, cp2Base: { x: 160, y: 90 }, cp1Motion: { ax: 22, ay: 18, speed: 0.54 }, cp2Motion: { ax: 16, ay: 14, speed: 0.48 }, color: colors.green, phase: 1.2 },
  { id: "b8", left: "72%", top: "36%", width: 190, viewH: 115, start: { x: 15, y: 95 }, end: { x: 175, y: 20 }, cp1Base: { x: 50, y: 40 }, cp2Base: { x: 130, y: 75 }, cp1Motion: { ax: 18, ay: 16, speed: 0.56 }, cp2Motion: { ax: 14, ay: 10, speed: 0.44 }, color: colors.chartreuse, phase: 2.8 },
  { id: "b9", left: "4%", top: "48%", width: 250, viewH: 90, start: { x: 5, y: 42 }, end: { x: 245, y: 48 }, cp1Base: { x: 80, y: 5 }, cp2Base: { x: 170, y: 85 }, cp1Motion: { ax: 26, ay: 12, speed: 0.42 }, cp2Motion: { ax: 20, ay: 16, speed: 0.5 }, color: colors.plum, phase: 0.3 },
  { id: "b10", left: "38%", top: "46%", width: 220, viewH: 110, start: { x: 18, y: 88 }, end: { x: 202, y: 22 }, cp1Base: { x: 68, y: 38 }, cp2Base: { x: 152, y: 62 }, cp1Motion: { ax: 16, ay: 20, speed: 0.6 }, cp2Motion: { ax: 18, ay: 14, speed: 0.46 }, color: colors.pink, phase: 3.6 },
  { id: "b11", left: "58%", top: "54%", width: 200, viewH: 100, start: { x: 10, y: 80 }, end: { x: 190, y: 25 }, cp1Base: { x: 55, y: 30 }, cp2Base: { x: 140, y: 70 }, cp1Motion: { ax: 20, ay: 14, speed: 0.48 }, cp2Motion: { ax: 14, ay: 18, speed: 0.54 }, color: colors.green, phase: 1.8 },
  { id: "b12", left: "12%", top: "58%", width: 240, viewH: 95, start: { x: 8, y: 47 }, end: { x: 232, y: 50 }, cp1Base: { x: 78, y: 8 }, cp2Base: { x: 168, y: 88 }, cp1Motion: { ax: 22, ay: 16, speed: 0.5 }, cp2Motion: { ax: 16, ay: 14, speed: 0.42 }, color: colors.chartreuse, phase: 2.4 },
  { id: "b13", left: "44%", top: "66%", width: 210, viewH: 105, start: { x: 15, y: 90 }, end: { x: 195, y: 15 }, cp1Base: { x: 62, y: 42 }, cp2Base: { x: 148, y: 58 }, cp1Motion: { ax: 18, ay: 12, speed: 0.52 }, cp2Motion: { ax: 12, ay: 16, speed: 0.48 }, color: colors.plum, phase: 0.7 },
  { id: "b14", left: "78%", top: "62%", width: 185, viewH: 115, start: { x: 12, y: 95 }, end: { x: 173, y: 18 }, cp1Base: { x: 48, y: 38 }, cp2Base: { x: 125, y: 72 }, cp1Motion: { ax: 16, ay: 18, speed: 0.56 }, cp2Motion: { ax: 14, ay: 10, speed: 0.44 }, color: colors.pink, phase: 3.2 },
  { id: "b15", left: "22%", top: "74%", width: 230, viewH: 90, start: { x: 6, y: 44 }, end: { x: 224, y: 46 }, cp1Base: { x: 72, y: 6 }, cp2Base: { x: 162, y: 84 }, cp1Motion: { ax: 24, ay: 14, speed: 0.46 }, cp2Motion: { ax: 18, ay: 18, speed: 0.52 }, color: colors.green, phase: 1.4 },
  { id: "b16", left: "52%", top: "78%", width: 200, viewH: 100, start: { x: 10, y: 82 }, end: { x: 190, y: 20 }, cp1Base: { x: 58, y: 32 }, cp2Base: { x: 138, y: 68 }, cp1Motion: { ax: 20, ay: 16, speed: 0.5 }, cp2Motion: { ax: 14, ay: 12, speed: 0.46 }, color: colors.chartreuse, phase: 2.0, opacity: 0.1 },
  { id: "b17", left: "6%", top: "86%", width: 220, viewH: 95, start: { x: 8, y: 48 }, end: { x: 212, y: 50 }, cp1Base: { x: 68, y: 10 }, cp2Base: { x: 158, y: 86 }, cp1Motion: { ax: 22, ay: 14, speed: 0.48 }, cp2Motion: { ax: 16, ay: 16, speed: 0.54 }, color: colors.plum, phase: 3.8 },
  { id: "b18", left: "62%", top: "88%", width: 195, viewH: 105, start: { x: 14, y: 88 }, end: { x: 181, y: 22 }, cp1Base: { x: 52, y: 36 }, cp2Base: { x: 132, y: 64 }, cp1Motion: { ax: 18, ay: 12, speed: 0.52 }, cp2Motion: { ax: 12, ay: 14, speed: 0.42 }, color: colors.pink, phase: 1.0 },
];

type BezierState = { cp1: { x: number; y: number }; cp2: { x: number; y: number } };

function AnimatedBezierLayer({ configs }: { configs: BezierConfig[] }) {
  const [states, setStates] = useState<BezierState[]>(() =>
    configs.map((c) => ({ cp1: c.cp1Base, cp2: c.cp2Base })),
  );
  const t = useRef(0);

  useAnimationFrame((time) => {
    t.current = time / 1000;
    setStates(
      configs.map((c) => {
        const phase = t.current + c.phase;
        return {
          cp1: {
            x: c.cp1Base.x + Math.sin(phase * c.cp1Motion.speed) * c.cp1Motion.ax,
            y: c.cp1Base.y + Math.cos(phase * c.cp1Motion.speed * 0.9) * c.cp1Motion.ay,
          },
          cp2: {
            x: c.cp2Base.x + Math.cos(phase * c.cp2Motion.speed * 1.1) * c.cp2Motion.ax,
            y: c.cp2Base.y + Math.sin(phase * c.cp2Motion.speed * 0.85) * c.cp2Motion.ay,
          },
        };
      }),
    );
  });

  return (
    <>
      {configs.map((config, i) => {
        const { cp1, cp2 } = states[i];
        const { start, end } = config;
        const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
        const opacity = config.opacity ?? CURVE_OPACITY;

        return (
          <motion.svg
            key={config.id}
            viewBox={`0 0 ${config.width} ${config.viewH}`}
            className="absolute overflow-visible"
            style={{
              left: config.left,
              top: config.top,
              width: config.width,
              height: config.viewH,
              opacity,
            }}
            animate={{ x: [0, 6, -4, 0], y: [0, -5, 4, 0] }}
            transition={{
              duration: 20 + (i % 5) * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: config.phase,
            }}
          >
            {/* Control polygon — shows cubic bezier handles being manipulated */}
            <line x1={start.x} y1={start.y} x2={cp1.x} y2={cp1.y} stroke={config.color} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 5" />
            <line x1={end.x} y1={end.y} x2={cp2.x} y2={cp2.y} stroke={config.color} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 5" />
            <line x1={cp1.x} y1={cp1.y} x2={cp2.x} y2={cp2.y} stroke={config.color} strokeWidth={0.8} strokeOpacity={0.18} strokeDasharray="3 6" />
            <path d={pathD} fill="none" stroke={config.color} strokeWidth={2.5} strokeLinecap="round" />
            {/* Anchor points */}
            <circle cx={start.x} cy={start.y} r={3.5} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} />
            <circle cx={end.x} cy={end.y} r={3.5} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} />
            {/* cp1 — circular handle */}
            <circle cx={cp1.x} cy={cp1.y} r={5} fill={config.color} fillOpacity={0.9} />
            <circle cx={cp1.x} cy={cp1.y} r={9} fill="none" stroke={config.color} strokeWidth={1} strokeOpacity={0.35} />
            {/* cp2 — square handle */}
            <rect x={cp2.x - 3.5} y={cp2.y - 3.5} width={7} height={7} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} />
          </motion.svg>
        );
      })}
    </>
  );
}

function driftAnimation(index: number, kind: string) {
  const amp = kind === "ring" ? 10 : 14;
  const rot = kind === "rect" || kind === "diamond" || kind === "triangle" || kind === "cross" ? 8 : 0;
  return {
    x: [0, amp * 0.55, -amp * 0.4, amp * 0.25, 0],
    y: [0, -amp * 0.8, amp * 0.45, -amp * 0.3, 0],
    rotate: rot ? [0, rot * 0.45, -rot * 0.3, rot * 0.15, 0] : [0, 0, 0, 0, 0],
    scale: kind === "circle" ? [1, 1.05, 0.97, 1.03, 1] : [1, 1.04, 0.98, 1.02, 1],
  };
}

function DoodleShape({ d, i }: { d: Doodle; i: number }) {
  const opacity = d.opacity ?? SHAPE_OPACITY;
  const duration = d.duration ?? 14 + (i % 6) * 2;
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
          opacity,
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
          rotate: { duration: duration * 1.5, repeat: Infinity, ease: "linear", delay: d.delay },
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
        animate={{ ...animate, rotate: [d.rotate, d.rotate + 10, d.rotate] }}
        transition={{
          ...transition,
          rotate: { duration: duration * 1.2, repeat: Infinity, ease: "easeInOut", delay: d.delay },
        }}
      >
        <polygon points="50,4 96,82 4,82" fill={d.color} />
      </motion.svg>
    );
  }

  if (d.kind === "cross") {
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

  return (
    <motion.div
      className="absolute rotate-45"
      style={{ left: d.x, top: d.y, width: d.size, height: d.size, backgroundColor: d.color, opacity }}
      animate={{ ...animate, rotate: [d.rotate, d.rotate + 8, d.rotate] }}
      transition={{
        ...transition,
        rotate: { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut", delay: d.delay },
      }}
    />
  );
}

export function LandingBackgroundDoodles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {mounted ? (
        <>
          <div className="absolute inset-0">
            <AnimatedBezierLayer configs={BACKGROUND_BEZIERS} />

            {SCATTER_DOTS.map((dot, i) => (
              <motion.div
                key={`dot-${i}`}
                className="absolute rounded-full"
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: dot.size,
                  height: dot.size,
                  backgroundColor: dot.color,
                  opacity: DOT_OPACITY,
                }}
                animate={{
                  x: [0, 8, -5, 4, 0],
                  y: [0, -10, 6, -4, 0],
                  scale: [1, 1.15, 0.92, 1.08, 1],
                }}
                transition={{
                  duration: 9 + (i % 7) * 1.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 11) * 0.28,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0">
            {DOODLES.map((d, i) => (
              <DoodleShape key={`${d.kind}-${i}`} d={d} i={i} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
