"use client";

import { useEffect, useState } from "react";
import { colors } from "@/lib/colors";

/** Large soft radial spots — green & plum, more visible */
const FADED_SPOTS = [
  {
    id: "p1",
    hue: colors.plum,
    size: "min(95vw, 920px)",
    top: "-18%",
    left: "-22%",
    opacity: 0.28,
    blur: 70,
    duration: 38,
    anim: "aurora-drift-a",
  },
  {
    id: "g1",
    hue: colors.green,
    size: "min(88vw, 860px)",
    top: "5%",
    left: "48%",
    opacity: 0.24,
    blur: 75,
    duration: 42,
    anim: "aurora-drift-b",
  },
  {
    id: "p2",
    hue: colors.plum,
    size: "min(78vw, 760px)",
    top: "38%",
    left: "-15%",
    opacity: 0.22,
    blur: 85,
    duration: 36,
    anim: "aurora-drift-c",
  },
  {
    id: "g2",
    hue: colors.green,
    size: "min(82vw, 800px)",
    top: "52%",
    left: "55%",
    opacity: 0.26,
    blur: 72,
    duration: 40,
    anim: "aurora-drift-d",
  },
  {
    id: "p3",
    hue: colors.plum,
    size: "min(70vw, 680px)",
    top: "72%",
    left: "18%",
    opacity: 0.2,
    blur: 80,
    duration: 44,
    anim: "aurora-drift-e",
  },
  {
    id: "g3",
    hue: colors.green,
    size: "min(65vw, 620px)",
    top: "22%",
    left: "32%",
    opacity: 0.18,
    blur: 65,
    duration: 33,
    anim: "aurora-drift-f",
  },
] as const;

const RINGS = [
  { x: "8%", y: "15%", size: 120, stroke: colors.plum, duration: 22, delay: 0 },
  { x: "82%", y: "28%", size: 90, stroke: colors.green, duration: 18, delay: 0.5 },
  { x: "75%", y: "78%", size: 140, stroke: colors.plum, duration: 26, delay: 1 },
  { x: "12%", y: "70%", size: 70, stroke: colors.green, duration: 20, delay: 0.3 },
  { x: "45%", y: "88%", size: 100, stroke: colors.plum, duration: 24, delay: 0.8 },
];

const SQUARES = [
  { x: "18%", y: "42%", size: 36, rotate: 12, color: colors.green, duration: 16 },
  { x: "68%", y: "12%", size: 28, rotate: -18, color: colors.plum, duration: 19 },
  { x: "88%", y: "55%", size: 44, rotate: 24, color: colors.green, duration: 21 },
  { x: "5%", y: "55%", size: 32, rotate: -8, color: colors.plum, duration: 17 },
  { x: "52%", y: "35%", size: 24, rotate: 45, color: colors.green, duration: 14 },
  { x: "35%", y: "8%", size: 20, rotate: 15, color: colors.plum, duration: 13 },
  { x: "92%", y: "38%", size: 26, rotate: -30, color: colors.green, duration: 15 },
];

const FILLED_CIRCLES = [
  { x: "28%", y: "25%", size: 48, color: colors.plum, duration: 20 },
  { x: "58%", y: "48%", size: 36, color: colors.green, duration: 18 },
  { x: "8%", y: "82%", size: 56, color: colors.plum, duration: 22 },
  { x: "78%", y: "8%", size: 40, color: colors.green, duration: 17 },
];

const TRIANGLES = [
  { x: "42%", y: "62%", size: 40, color: colors.plum, rotate: 0, duration: 19 },
  { x: "62%", y: "78%", size: 32, color: colors.green, rotate: 180, duration: 16 },
  { x: "15%", y: "30%", size: 28, color: colors.green, rotate: 90, duration: 21 },
];

const BEZIER_DOODLES = [
  {
    d: "M 0 80 C 60 20, 140 120, 200 60",
    stroke: colors.plum,
    left: "5%",
    top: "20%",
    width: 200,
    duration: 8,
    delay: 0,
  },
  {
    d: "M 20 40 C 80 100, 120 0, 180 70",
    stroke: colors.green,
    left: "70%",
    top: "60%",
    width: 180,
    duration: 10,
    delay: 0.5,
  },
  {
    d: "M 0 50 C 50 0, 100 80, 160 30",
    stroke: colors.plum,
    left: "60%",
    top: "8%",
    width: 160,
    duration: 9,
    delay: 1,
  },
  {
    d: "M 10 90 C 70 30, 90 100, 170 50",
    stroke: colors.green,
    left: "25%",
    top: "75%",
    width: 190,
    duration: 11,
    delay: 0.3,
  },
  {
    d: "M 0 60 C 40 10, 120 90, 180 20",
    stroke: colors.plum,
    left: "40%",
    top: "45%",
    width: 140,
    duration: 12,
    delay: 0.7,
  },
  {
    d: "M 30 70 Q 90 10 150 60",
    stroke: colors.green,
    left: "85%",
    top: "22%",
    width: 120,
    duration: 9,
    delay: 1.2,
  },
];

function GeometricDoodles() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {RINGS.map((ring, i) => (
        <div
          key={`ring-${i}`}
          className="absolute aurora-ring-spin"
          style={{
            left: ring.x,
            top: ring.y,
            width: ring.size,
            height: ring.size,
            animationDuration: `${ring.duration}s`,
            animationDelay: `${ring.delay}s`,
          }}
        >
          <div
            className="h-full w-full aurora-ring-pulse"
            style={{
              animationDuration: `${ring.duration * 0.5}s`,
              animationDelay: `${ring.delay}s`,
            }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <circle
                className="aurora-ring-stroke"
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={ring.stroke}
                strokeWidth="2"
                strokeOpacity={0.35}
                strokeDasharray="8 6"
                style={{
                  animationDuration: `${ring.duration * 0.4}s`,
                  animationDelay: `${ring.delay}s`,
                }}
              />
            </svg>
          </div>
        </div>
      ))}

      {SQUARES.map((sq, i) => (
        <div
          key={`sq-${i}`}
          className="absolute border-2 aurora-square"
          style={{
            left: sq.x,
            top: sq.y,
            width: sq.size,
            height: sq.size,
            borderColor: sq.color,
            opacity: 0.35,
            ["--aurora-rot" as string]: `${sq.rotate}deg`,
            animationDuration: `${sq.duration}s`,
          }}
        />
      ))}

      {FILLED_CIRCLES.map((c, i) => (
        <div
          key={`fc-${i}`}
          className="absolute rounded-full aurora-blob"
          style={{
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            opacity: 0.12,
            animationDuration: `${c.duration}s`,
          }}
        />
      ))}

      {TRIANGLES.map((tri, i) => (
        <svg
          key={`tri-${i}`}
          viewBox="0 0 100 86"
          className="absolute aurora-triangle"
          style={{
            left: tri.x,
            top: tri.y,
            width: tri.size,
            height: tri.size * 0.86,
            opacity: 0.28,
            ["--aurora-rot" as string]: `${tri.rotate}deg`,
            animationDuration: `${tri.duration}s`,
          }}
        >
          <polygon points="50,4 96,82 4,82" fill="none" stroke={tri.color} strokeWidth="3" />
        </svg>
      ))}

      {BEZIER_DOODLES.map((b, i) => (
        <svg
          key={`bezier-${i}`}
          viewBox="0 0 200 100"
          className="absolute overflow-visible aurora-bezier"
          style={{
            left: b.left,
            top: b.top,
            width: b.width,
            height: b.width * 0.5,
            animationDuration: `${b.duration + 4}s`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <path
            className="aurora-bezier-path"
            d={b.d}
            fill="none"
            stroke={b.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity={0.4}
            pathLength={1}
            style={{
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        </svg>
      ))}
    </div>
  );
}

export function AuroraBackground() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const sync = () => setPaused(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden aurora-root${paused ? " aurora-paused" : ""}`}
      aria-hidden="true"
      style={{ background: colors.white }}
    >
      {FADED_SPOTS.map((spot) => (
        <div
          key={spot.id}
          className={`absolute rounded-full aurora-spot ${spot.anim}`}
          style={{
            width: spot.size,
            height: spot.size,
            top: spot.top,
            left: spot.left,
            background: `radial-gradient(circle at 40% 40%, ${spot.hue} 0%, transparent 68%)`,
            opacity: spot.opacity,
            filter: `blur(${spot.blur}px)`,
            animationDuration: `${spot.duration}s`,
          }}
        />
      ))}

      <GeometricDoodles />

      {/* Lighter veil — spots stay visible, text still readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 50% -5%, rgba(250,250,248,0.35) 0%, transparent 45%), linear-gradient(180deg, rgba(250,250,248,0.08) 0%, rgba(250,250,248,0.45) 100%)",
        }}
      />
    </div>
  );
}
