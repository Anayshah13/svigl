"use client";

import { motion, useAnimationFrame } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { colors, palette } from "@/lib/colors";
import { prefersReducedMotion } from "@/lib/gsap";

const SHAPE_OPACITY = 0.22;
const CURVE_OPACITY = 0.2;
const DOT_OPACITY = 0.18;

type BaseDoodle = { x: string; y: string; color: string; delay: number; duration?: number; opacity?: number };

type CircleDoodle = BaseDoodle & { kind: "circle"; size: number };
type RectDoodle = BaseDoodle & { kind: "rect"; w: number; h: number; rx: number };
type RingDoodle = BaseDoodle & { kind: "ring"; size: number; stroke: number };
type TriangleDoodle = BaseDoodle & { kind: "triangle"; size: number; rotate: number };
type DiamondDoodle = BaseDoodle & { kind: "diamond"; size: number; rotate: number };
type CrossDoodle = BaseDoodle & { kind: "cross"; size: number };

type Doodle = CircleDoodle | RectDoodle | RingDoodle | TriangleDoodle | DiamondDoodle | CrossDoodle;

/** Soft color washes — fill hero side margins with living light */
const HERO_ORBS = [
  { x: "3%", y: "8%", size: 280, color: colors.chartreuse, opacity: 0.2, duration: 18, blur: 48 },
  { x: "78%", y: "4%", size: 320, color: colors.pink, opacity: 0.18, duration: 22, blur: 56 },
  { x: "68%", y: "42%", size: 240, color: colors.plum, opacity: 0.14, duration: 20, blur: 52 },
  { x: "0%", y: "48%", size: 260, color: colors.green, opacity: 0.16, duration: 24, blur: 50 },
  { x: "85%", y: "28%", size: 200, color: colors.chartreuse, opacity: 0.15, duration: 16, blur: 44 },
  { x: "12%", y: "28%", size: 180, color: colors.pink, opacity: 0.12, duration: 19, blur: 40 },
];

/** Extra hero-margin shapes — denser where the canvas used to live */
const HERO_MARGIN_DOODLES: Doodle[] = [
  { kind: "circle", x: "6%", y: "18%", size: 56, color: colors.chartreuse, delay: 0.1, duration: 11, opacity: 0.28 },
  { kind: "ring", x: "88%", y: "16%", size: 96, stroke: 2.5, color: colors.plum, delay: 0.2, duration: 16, opacity: 0.32 },
  { kind: "triangle", x: "82%", y: "38%", size: 48, rotate: -18, color: colors.green, delay: 0.35, duration: 14, opacity: 0.26 },
  { kind: "diamond", x: "4%", y: "42%", size: 40, rotate: 12, color: colors.pink, delay: 0.45, duration: 13, opacity: 0.24 },
  { kind: "cross", x: "92%", y: "48%", size: 34, color: colors.chartreuse, delay: 0.15, duration: 12, opacity: 0.3 },
  { kind: "rect", x: "2%", y: "62%", w: 42, h: 42, rx: 10, color: colors.plum, delay: 0.55, duration: 15, opacity: 0.22 },
  { kind: "circle", x: "90%", y: "62%", size: 64, color: colors.pink, delay: 0.25, duration: 10, opacity: 0.2 },
  { kind: "ring", x: "8%", y: "72%", size: 72, stroke: 2, color: colors.green, delay: 0.4, duration: 18, opacity: 0.28 },
  { kind: "triangle", x: "94%", y: "8%", size: 36, rotate: 25, color: colors.plum, delay: 0.6, duration: 12, opacity: 0.24 },
  { kind: "diamond", x: "14%", y: "8%", size: 32, rotate: -8, color: colors.green, delay: 0.3, duration: 14, opacity: 0.26 },
];

/** Dense field — hero through footer */
const DOODLES: Doodle[] = [
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

  { kind: "circle", x: "6%", y: "20%", size: 52, color: colors.pink, delay: 0.2 },
  { kind: "rect", x: "38%", y: "18%", w: 64, h: 24, rx: 12, color: colors.plum, delay: 0.65 },
  { kind: "triangle", x: "82%", y: "22%", size: 48, rotate: -20, color: colors.plum, delay: 0.5, duration: 22 },
  { kind: "circle", x: "62%", y: "24%", size: 42, color: colors.chartreuse, delay: 0.15 },
  { kind: "cross", x: "22%", y: "26%", size: 28, color: colors.green, delay: 0.8, duration: 19 },
  { kind: "diamond", x: "48%", y: "20%", size: 40, rotate: 15, color: colors.pink, delay: 0.3, duration: 20 },
  { kind: "ring", x: "12%", y: "24%", size: 70, stroke: 2, color: colors.chartreuse, delay: 0.4, duration: 26 },
  { kind: "circle", x: "94%", y: "26%", size: 34, color: colors.green, delay: 0.75 },

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

  { kind: "circle", x: "72%", y: "50%", size: 68, color: colors.green, delay: 0.15, opacity: 0.18 },
  { kind: "rect", x: "14%", y: "52%", w: 40, h: 64, rx: 8, color: colors.pink, delay: 0.4 },
  { kind: "triangle", x: "46%", y: "54%", size: 50, rotate: -12, color: colors.chartreuse, delay: 0.55, duration: 21 },
  { kind: "diamond", x: "88%", y: "56%", size: 38, rotate: 45, color: colors.plum, delay: 0.3, duration: 24 },
  { kind: "circle", x: "32%", y: "58%", size: 44, color: colors.plum, delay: 0.65 },
  { kind: "ring", x: "58%", y: "60%", size: 96, stroke: 2, color: colors.green, delay: 0.2, duration: 32 },
  { kind: "cross", x: "78%", y: "62%", size: 34, color: colors.chartreuse, delay: 0.75, duration: 18 },
  { kind: "rect", x: "4%", y: "64%", w: 56, h: 32, rx: 16, color: colors.green, delay: 0.45 },
  { kind: "circle", x: "52%", y: "66%", size: 30, color: colors.pink, delay: 0.8 },
  { kind: "triangle", x: "22%", y: "68%", size: 42, rotate: 25, color: colors.green, delay: 0.35, duration: 19 },

  { kind: "circle", x: "38%", y: "72%", size: 54, color: colors.chartreuse, delay: 0.5 },
  { kind: "rect", x: "66%", y: "70%", w: 48, h: 48, rx: 12, color: colors.pink, delay: 0.25 },
  { kind: "ring", x: "10%", y: "74%", size: 74, stroke: 2, color: colors.plum, delay: 0.6, duration: 27 },
  { kind: "diamond", x: "82%", y: "76%", size: 32, rotate: 20, color: colors.green, delay: 0.4, duration: 22 },
  { kind: "circle", x: "54%", y: "78%", size: 40, color: colors.plum, delay: 0.15 },
  { kind: "cross", x: "44%", y: "80%", size: 26, color: colors.pink, delay: 0.7, duration: 17 },
  { kind: "triangle", x: "92%", y: "82%", size: 44, rotate: -15, color: colors.chartreuse, delay: 0.55, duration: 20 },
  { kind: "circle", x: "18%", y: "80%", size: 36, color: colors.pink, delay: 0.3 },

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

const BACKGROUND_BEZIERS: BezierConfig[] = [
  { id: "b1", left: "2%", top: "4%", width: 240, viewH: 120, start: { x: 10, y: 90 }, end: { x: 230, y: 20 }, cp1Base: { x: 55, y: 28 }, cp2Base: { x: 170, y: 85 }, cp1Motion: { ax: 32, ay: 26, speed: 0.62 }, cp2Motion: { ax: 26, ay: 20, speed: 0.48 }, color: colors.plum, phase: 0 },
  { id: "b2", left: "58%", top: "2%", width: 220, viewH: 110, start: { x: 15, y: 75 }, end: { x: 205, y: 22 }, cp1Base: { x: 60, y: 18 }, cp2Base: { x: 145, y: 72 }, cp1Motion: { ax: 24, ay: 28, speed: 0.55 }, cp2Motion: { ax: 20, ay: 18, speed: 0.65 }, color: colors.pink, phase: 0.9 },
  { id: "b3", left: "28%", top: "10%", width: 260, viewH: 100, start: { x: 5, y: 45 }, end: { x: 255, y: 48 }, cp1Base: { x: 80, y: 6 }, cp2Base: { x: 175, y: 90 }, cp1Motion: { ax: 28, ay: 20, speed: 0.5 }, cp2Motion: { ax: 22, ay: 24, speed: 0.58 }, color: colors.green, phase: 1.6 },
  { id: "b4", left: "72%", top: "14%", width: 200, viewH: 130, start: { x: 20, y: 110 }, end: { x: 180, y: 12 }, cp1Base: { x: 55, y: 55 }, cp2Base: { x: 130, y: 40 }, cp1Motion: { ax: 26, ay: 22, speed: 0.68 }, cp2Motion: { ax: 18, ay: 20, speed: 0.5 }, color: colors.chartreuse, phase: 2.2 },
  { id: "b5", left: "4%", top: "22%", width: 280, viewH: 100, start: { x: 8, y: 48 }, end: { x: 272, y: 52 }, cp1Base: { x: 90, y: 10 }, cp2Base: { x: 185, y: 92 }, cp1Motion: { ax: 34, ay: 22, speed: 0.52 }, cp2Motion: { ax: 26, ay: 28, speed: 0.6 }, color: colors.plum, phase: 0.5 },
  { id: "b6", left: "48%", top: "26%", width: 230, viewH: 115, start: { x: 12, y: 90 }, end: { x: 218, y: 16 }, cp1Base: { x: 70, y: 32 }, cp2Base: { x: 155, y: 68 }, cp1Motion: { ax: 28, ay: 20, speed: 0.58 }, cp2Motion: { ax: 22, ay: 18, speed: 0.52 }, color: colors.pink, phase: 3.0 },
  { id: "b7", left: "14%", top: "36%", width: 250, viewH: 110, start: { x: 10, y: 50 }, end: { x: 240, y: 55 }, cp1Base: { x: 75, y: 8 }, cp2Base: { x: 170, y: 95 }, cp1Motion: { ax: 30, ay: 24, speed: 0.62 }, cp2Motion: { ax: 22, ay: 20, speed: 0.55 }, color: colors.green, phase: 1.2 },
  { id: "b8", left: "75%", top: "34%", width: 210, viewH: 125, start: { x: 15, y: 105 }, end: { x: 195, y: 18 }, cp1Base: { x: 50, y: 40 }, cp2Base: { x: 140, y: 78 }, cp1Motion: { ax: 26, ay: 22, speed: 0.64 }, cp2Motion: { ax: 20, ay: 16, speed: 0.5 }, color: colors.chartreuse, phase: 2.8 },
  { id: "b9", left: "2%", top: "48%", width: 270, viewH: 95, start: { x: 5, y: 42 }, end: { x: 265, y: 48 }, cp1Base: { x: 85, y: 4 }, cp2Base: { x: 180, y: 90 }, cp1Motion: { ax: 36, ay: 16, speed: 0.48 }, cp2Motion: { ax: 28, ay: 22, speed: 0.56 }, color: colors.plum, phase: 0.3 },
  { id: "b10", left: "40%", top: "44%", width: 240, viewH: 120, start: { x: 18, y: 95 }, end: { x: 222, y: 20 }, cp1Base: { x: 72, y: 36 }, cp2Base: { x: 160, y: 65 }, cp1Motion: { ax: 24, ay: 28, speed: 0.7 }, cp2Motion: { ax: 26, ay: 20, speed: 0.52 }, color: colors.pink, phase: 3.6 },
  { id: "b11", left: "60%", top: "52%", width: 220, viewH: 110, start: { x: 10, y: 85 }, end: { x: 210, y: 22 }, cp1Base: { x: 58, y: 28 }, cp2Base: { x: 150, y: 72 }, cp1Motion: { ax: 28, ay: 20, speed: 0.55 }, cp2Motion: { ax: 20, ay: 24, speed: 0.62 }, color: colors.green, phase: 1.8 },
  { id: "b12", left: "10%", top: "58%", width: 260, viewH: 100, start: { x: 8, y: 47 }, end: { x: 252, y: 50 }, cp1Base: { x: 82, y: 6 }, cp2Base: { x: 175, y: 92 }, cp1Motion: { ax: 30, ay: 22, speed: 0.58 }, cp2Motion: { ax: 22, ay: 20, speed: 0.48 }, color: colors.chartreuse, phase: 2.4 },
];

type BezierDomRefs = {
  path: SVGPathElement | null;
  line1: SVGLineElement | null;
  line2: SVGLineElement | null;
  line3: SVGLineElement | null;
  cp1: SVGCircleElement | null;
  cp1Ring: SVGCircleElement | null;
  cp2: SVGRectElement | null;
};

function AnimatedBezierLayer({
  configs,
  reduced,
}: {
  configs: BezierConfig[];
  reduced: boolean;
}) {
  const refs = useRef<BezierDomRefs[]>(configs.map(() => ({
    path: null,
    line1: null,
    line2: null,
    line3: null,
    cp1: null,
    cp1Ring: null,
    cp2: null,
  })));

  useAnimationFrame((time) => {
    if (reduced) return;
    const t = time / 1000;
    configs.forEach((c, i) => {
      const el = refs.current[i];
      if (!el.path) return;
      const phase = t + c.phase;
      const cp1x = c.cp1Base.x + Math.sin(phase * c.cp1Motion.speed) * c.cp1Motion.ax;
      const cp1y = c.cp1Base.y + Math.cos(phase * c.cp1Motion.speed * 0.9) * c.cp1Motion.ay;
      const cp2x = c.cp2Base.x + Math.cos(phase * c.cp2Motion.speed * 1.1) * c.cp2Motion.ax;
      const cp2y = c.cp2Base.y + Math.sin(phase * c.cp2Motion.speed * 0.85) * c.cp2Motion.ay;
      const { start, end } = c;
      el.path.setAttribute("d", `M ${start.x} ${start.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${end.x} ${end.y}`);
      el.line1?.setAttribute("x2", String(cp1x));
      el.line1?.setAttribute("y2", String(cp1y));
      el.line2?.setAttribute("x2", String(cp2x));
      el.line2?.setAttribute("y2", String(cp2y));
      el.line3?.setAttribute("x1", String(cp1x));
      el.line3?.setAttribute("y1", String(cp1y));
      el.line3?.setAttribute("x2", String(cp2x));
      el.line3?.setAttribute("y2", String(cp2y));
      el.cp1?.setAttribute("cx", String(cp1x));
      el.cp1?.setAttribute("cy", String(cp1y));
      el.cp1Ring?.setAttribute("cx", String(cp1x));
      el.cp1Ring?.setAttribute("cy", String(cp1y));
      el.cp2?.setAttribute("x", String(cp2x - 3.5));
      el.cp2?.setAttribute("y", String(cp2y - 3.5));
    });
  });

  return (
    <>
      {configs.map((config, i) => {
        const { start, end, cp1Base, cp2Base } = config;
        const pathD = `M ${start.x} ${start.y} C ${cp1Base.x} ${cp1Base.y} ${cp2Base.x} ${cp2Base.y} ${end.x} ${end.y}`;
        const opacity = config.opacity ?? CURVE_OPACITY;
        const bind = <K extends keyof BezierDomRefs>(key: K) => (node: BezierDomRefs[K]) => {
          refs.current[i][key] = node;
        };

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
            animate={
              reduced
                ? undefined
                : { x: [0, 10, -8, 0], y: [0, -9, 7, 0], rotate: [0, 1.5, -1, 0] }
            }
            transition={{
              duration: 14 + (i % 5) * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: config.phase,
            }}
          >
            <line
              ref={bind("line1")}
              x1={start.x}
              y1={start.y}
              x2={cp1Base.x}
              y2={cp1Base.y}
              stroke={config.color}
              strokeWidth={1}
              strokeOpacity={0.45}
              strokeDasharray="4 5"
            />
            <line
              ref={bind("line2")}
              x1={end.x}
              y1={end.y}
              x2={cp2Base.x}
              y2={cp2Base.y}
              stroke={config.color}
              strokeWidth={1}
              strokeOpacity={0.45}
              strokeDasharray="4 5"
            />
            <line
              ref={bind("line3")}
              x1={cp1Base.x}
              y1={cp1Base.y}
              x2={cp2Base.x}
              y2={cp2Base.y}
              stroke={config.color}
              strokeWidth={0.8}
              strokeOpacity={0.22}
              strokeDasharray="3 6"
            />
            <path
              ref={bind("path")}
              d={pathD}
              fill="none"
              stroke={config.color}
              strokeWidth={2.8}
              strokeLinecap="round"
            />
            <circle cx={start.x} cy={start.y} r={3.5} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} />
            <circle cx={end.x} cy={end.y} r={3.5} fill={colors.whitePure} stroke={config.color} strokeWidth={1.5} />
            <circle
              ref={bind("cp1")}
              cx={cp1Base.x}
              cy={cp1Base.y}
              r={5}
              fill={config.color}
              fillOpacity={0.95}
            />
            <circle
              ref={bind("cp1Ring")}
              cx={cp1Base.x}
              cy={cp1Base.y}
              r={10}
              fill="none"
              stroke={config.color}
              strokeWidth={1}
              strokeOpacity={0.4}
            />
            <rect
              ref={bind("cp2")}
              x={cp2Base.x - 3.5}
              y={cp2Base.y - 3.5}
              width={7}
              height={7}
              fill={colors.whitePure}
              stroke={config.color}
              strokeWidth={1.5}
            />
          </motion.svg>
        );
      })}
    </>
  );
}

function driftAnimation(kind: string, ampBoost = 1) {
  const amp = (kind === "ring" ? 16 : 22) * ampBoost;
  const rot = kind === "rect" || kind === "diamond" || kind === "triangle" || kind === "cross" ? 14 : 0;
  return {
    x: [0, amp * 0.65, -amp * 0.5, amp * 0.35, 0],
    y: [0, -amp * 0.95, amp * 0.55, -amp * 0.4, 0],
    rotate: rot ? [0, rot * 0.55, -rot * 0.4, rot * 0.2, 0] : [0, 0, 0, 0, 0],
    scale: kind === "circle" ? [1, 1.12, 0.94, 1.08, 1] : [1, 1.08, 0.96, 1.05, 1],
  };
}

function DoodleShape({
  d,
  i,
  reduced,
  amplify = false,
  strength = 16,
  radius = 145,
}: {
  d: Doodle;
  i: number;
  reduced: boolean;
  amplify?: boolean;
  strength?: number;
  radius?: number;
}) {
  const opacity = d.opacity ?? SHAPE_OPACITY;
  const duration = reduced ? 0 : (d.duration ?? 10 + (i % 6) * 1.6);
  const animate = reduced ? undefined : driftAnimation(d.kind, amplify ? 1.35 : 1);
  const transition = { duration, repeat: Infinity, ease: "easeInOut" as const, delay: d.delay };

  const w = d.kind === "rect" ? d.w : d.size;
  const h =
    d.kind === "rect" ? d.h : d.kind === "triangle" ? d.size * 0.86 : d.size;

  let inner: ReactNode = null;

  if (d.kind === "circle") {
    inner = (
      <motion.div
        className="rounded-full"
        style={{ width: d.size, height: d.size, backgroundColor: d.color, opacity }}
        animate={animate}
        transition={transition}
      />
    );
  } else if (d.kind === "rect") {
    inner = (
      <motion.div
        style={{
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
  } else if (d.kind === "ring") {
    inner = (
      <motion.div
        style={{ width: d.size, height: d.size, opacity }}
        animate={reduced ? undefined : { ...animate!, rotate: [0, 360] }}
        transition={{
          ...transition,
          rotate: { duration: duration * 1.2, repeat: Infinity, ease: "linear", delay: d.delay },
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke={d.color} strokeWidth={d.stroke} strokeDasharray="10 7" />
        </svg>
      </motion.div>
    );
  } else if (d.kind === "triangle") {
    inner = (
      <motion.svg
        viewBox="0 0 100 86"
        style={{ width: d.size, height: d.size * 0.86, opacity }}
        animate={
          reduced ? undefined : { ...animate!, rotate: [d.rotate, d.rotate + 16, d.rotate] }
        }
        transition={{
          ...transition,
          rotate: { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut", delay: d.delay },
        }}
      >
        <polygon points="50,4 96,82 4,82" fill={d.color} />
      </motion.svg>
    );
  } else if (d.kind === "cross") {
    inner = (
      <motion.svg
        viewBox="0 0 40 40"
        style={{ width: d.size, height: d.size, opacity }}
        animate={
          reduced ? undefined : { ...animate!, rotate: [0, 90, 180, 270, 360] }
        }
        transition={{
          ...transition,
          rotate: { duration: duration * 1.6, repeat: Infinity, ease: "linear", delay: d.delay },
        }}
      >
        <rect x="17" y="4" width="6" height="32" rx="2" fill={d.color} />
        <rect x="4" y="17" width="32" height="6" rx="2" fill={d.color} />
      </motion.svg>
    );
  } else {
    inner = (
      <motion.div
        className="rotate-45"
        style={{ width: d.size, height: d.size, backgroundColor: d.color, opacity }}
        animate={
          reduced ? undefined : { ...animate!, rotate: [d.rotate, d.rotate + 14, d.rotate] }
        }
        transition={{
          ...transition,
          rotate: { duration: duration * 1.05, repeat: Infinity, ease: "easeInOut", delay: d.delay },
        }}
      />
    );
  }

  return (
    <RepelShell
      strength={strength}
      radius={radius}
      className="absolute"
      style={{ left: d.x, top: d.y, width: w, height: h }}
    >
      {inner}
    </RepelShell>
  );
}

function HeroOrbs({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {HERO_ORBS.map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle at 40% 40%, ${orb.color} 0%, transparent 70%)`,
            opacity: orb.opacity,
            filter: `blur(${orb.blur}px)`,
            willChange: "transform",
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: [0, 40 + i * 8, -28, 18, 0],
                  y: [0, -32 - i * 4, 28, -16, 0],
                  scale: [1, 1.18, 0.9, 1.1, 1],
                }
          }
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/** Tiny orbiting “cursors” — sell the multiplayer vector feel in empty margins */
function FloatingCursors({ reduced }: { reduced: boolean }) {
  const cursors = [
    { x: "10%", y: "30%", color: colors.plum, label: "A", duration: 11 },
    { x: "86%", y: "24%", color: colors.green, label: "M", duration: 13 },
    { x: "78%", y: "58%", color: colors.pink, label: "K", duration: 12 },
    { x: "8%", y: "55%", color: colors.chartreuse, label: "R", duration: 14 },
  ];

  return (
    <>
      {cursors.map((c, i) => (
        <RepelShell
          key={`cursor-${i}`}
          strength={8}
          radius={130}
          className="absolute hidden sm:block"
          style={{ left: c.x, top: c.y }}
        >
          <motion.div
            animate={
              reduced
                ? undefined
                : {
                    x: [0, 28, -18, 12, 0],
                    y: [0, -22, 16, -10, 0],
                  }
            }
            transition={{ duration: c.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden>
              <path
                d="M1 1L1 18L5.5 14.5L9 21L11.5 20L8 13.5H14L1 1Z"
                fill={c.color}
                stroke={colors.whitePure}
                strokeWidth="1"
              />
            </svg>
            <span
              className="absolute left-3.5 top-4 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"
              style={{ backgroundColor: c.color }}
            >
              {c.label}
            </span>
          </motion.div>
        </RepelShell>
      ))}
    </>
  );
}

type RepelBody = {
  el: HTMLElement;
  strength: number;
  radius: number;
  ox: number;
  oy: number;
  baseX: number;
  baseY: number;
};

type RepelApi = {
  register: (el: HTMLElement, strength: number, radius: number) => () => void;
};

const RepelContext = createContext<RepelApi | null>(null);

/** Very minor outer-space push — soft falloff, inertial settle. */
function CursorRepelProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const bodies = useRef(new Map<HTMLElement, RepelBody>());
  const cursor = useRef({ x: -9999, y: -9999, active: false });

  const register = useCallback((el: HTMLElement, strength: number, radius: number) => {
    const rect = el.getBoundingClientRect();
    bodies.current.set(el, {
      el,
      strength,
      radius,
      ox: 0,
      oy: 0,
      baseX: rect.left + rect.width / 2,
      baseY: rect.top + rect.height / 2,
    });

    return () => {
      bodies.current.delete(el);
      el.style.transform = "";
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const refreshBases = () => {
      bodies.current.forEach((body) => {
        const rect = body.el.getBoundingClientRect();
        // undo current visual offset so we measure rest position
        body.baseX = rect.left + rect.width / 2 - body.ox;
        body.baseY = rect.top + rect.height / 2 - body.oy;
      });
    };

    const onMove = (e: MouseEvent) => {
      cursor.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      cursor.current.active = false;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", refreshBases);
    window.addEventListener("scroll", refreshBases, { passive: true });

    // Initial base positions after layout
    const t = window.setTimeout(refreshBases, 50);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", refreshBases);
      window.removeEventListener("scroll", refreshBases);
    };
  }, [enabled]);

  useAnimationFrame(() => {
    if (!enabled) return;
    const { x: cx, y: cy, active } = cursor.current;
    const ease = 0.055; // inertial — floats like space dust

    bodies.current.forEach((body) => {
      let tx = 0;
      let ty = 0;

      if (active) {
        const dx = body.baseX - cx;
        const dy = body.baseY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist < body.radius) {
          const t = 1 - dist / body.radius;
          // soft quadratic falloff — gentle nudge, not a shove
          const force = t * t * body.strength;
          tx = (dx / dist) * force;
          ty = (dy / dist) * force;
        }
      }

      body.ox += (tx - body.ox) * ease;
      body.oy += (ty - body.oy) * ease;

      if (Math.abs(body.ox) < 0.05 && Math.abs(body.oy) < 0.05 && tx === 0 && ty === 0) {
        body.ox = 0;
        body.oy = 0;
        body.el.style.transform = "";
        return;
      }

      body.el.style.transform = `translate3d(${body.ox.toFixed(2)}px, ${body.oy.toFixed(2)}px, 0)`;
    });
  });

  return <RepelContext.Provider value={{ register }}>{children}</RepelContext.Provider>;
}

function RepelShell({
  children,
  strength = 9,
  radius = 150,
  className,
  style,
}: {
  children: ReactNode;
  strength?: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const api = useContext(RepelContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !api) return;
    return api.register(el, strength, radius);
  }, [api, strength, radius]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: "transform", ...style }}
    >
      {children}
    </div>
  );
}

export function LandingBackgroundDoodles() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {mounted ? (
        <CursorRepelProvider enabled={!reduced}>
          <HeroOrbs reduced={reduced} />

          <div className="absolute inset-0">
            <AnimatedBezierLayer configs={BACKGROUND_BEZIERS} reduced={reduced} />

            {SCATTER_DOTS.map((dot, i) => (
              <RepelShell
                key={`dot-${i}`}
                strength={6}
                radius={110}
                className="absolute"
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: dot.size,
                  height: dot.size,
                }}
              >
                <motion.div
                  className="rounded-full"
                  style={{
                    width: dot.size,
                    height: dot.size,
                    backgroundColor: dot.color,
                    opacity: DOT_OPACITY,
                  }}
                  animate={
                    reduced
                      ? undefined
                      : {
                          x: [0, 14, -9, 7, 0],
                          y: [0, -16, 10, -7, 0],
                          scale: [1, 1.28, 0.88, 1.14, 1],
                          opacity: [DOT_OPACITY, DOT_OPACITY * 1.35, DOT_OPACITY * 0.75, DOT_OPACITY],
                        }
                  }
                  transition={{
                    duration: 7 + (i % 7) * 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i % 11) * 0.22,
                  }}
                />
              </RepelShell>
            ))}

            {DOODLES.map((d, i) => (
              <DoodleShape key={`${d.kind}-${i}`} d={d} i={i} reduced={reduced} />
            ))}

            {HERO_MARGIN_DOODLES.map((d, i) => (
              <DoodleShape
                key={`margin-${d.kind}-${i}`}
                d={d}
                i={i}
                reduced={reduced}
                amplify
                strength={10}
                radius={165}
              />
            ))}

            <FloatingCursors reduced={reduced} />
          </div>
        </CursorRepelProvider>
      ) : null}
    </div>
  );
}
