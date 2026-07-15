"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { colors } from "@/lib/colors";

const SHAPE_OPACITY = 0.1;

type Doodle =
  | { kind: "circle"; x: string; y: string; size: number; color: string; delay: number }
  | { kind: "ring"; x: string; y: string; size: number; stroke: number; color: string; delay: number }
  | { kind: "rect"; x: string; y: string; w: number; h: number; rx: number; color: string; delay: number };

/** Sparse edge accents only — keep the lobby cards readable */
const DOODLES: Doodle[] = [
  { kind: "circle", x: "4%", y: "12%", size: 56, color: colors.chartreuse, delay: 0 },
  { kind: "ring", x: "88%", y: "8%", size: 72, stroke: 1.5, color: colors.plum, delay: 0.4 },
  { kind: "rect", x: "90%", y: "72%", w: 40, h: 40, rx: 12, color: colors.pink, delay: 0.2 },
  { kind: "circle", x: "6%", y: "78%", size: 44, color: colors.green, delay: 0.6 },
  { kind: "ring", x: "78%", y: "88%", size: 58, stroke: 1.5, color: colors.chartreuse, delay: 0.3 },
];

const WASHES = [
  {
    id: "wash-plum",
    color: colors.plum,
    size: "min(55vw, 380px)",
    top: "-18%",
    left: "-14%",
    opacity: 0.08,
  },
  {
    id: "wash-pink",
    color: colors.pink,
    size: "min(45vw, 320px)",
    top: "70%",
    left: "68%",
    opacity: 0.07,
  },
];

function DoodleShape({ d, i }: { d: Doodle; i: number }) {
  const duration = 22 + (i % 3) * 4;
  const transition = {
    duration,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay: d.delay,
  };
  const drift = {
    x: [0, 6, -4, 0],
    y: [0, -5, 4, 0],
  };

  if (d.kind === "circle") {
    return (
      <motion.div
        className="absolute rounded-full"
        style={{
          left: d.x,
          top: d.y,
          width: d.size,
          height: d.size,
          backgroundColor: d.color,
          opacity: SHAPE_OPACITY,
        }}
        animate={drift}
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
          opacity: SHAPE_OPACITY,
        }}
        animate={drift}
        transition={transition}
      />
    );
  }

  return (
    <motion.div
      className="absolute"
      style={{ left: d.x, top: d.y, width: d.size, height: d.size, opacity: SHAPE_OPACITY }}
      animate={drift}
      transition={transition}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={d.color}
          strokeWidth={d.stroke}
        />
      </svg>
    </motion.div>
  );
}

/** Quiet lobby backdrop — soft washes + a few edge shapes. */
export function LobbyBackgroundDoodles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {WASHES.map((wash) => (
        <div
          key={wash.id}
          className="absolute rounded-full"
          style={{
            top: wash.top,
            left: wash.left,
            width: wash.size,
            height: wash.size,
            background: `radial-gradient(circle, ${wash.color} 0%, transparent 70%)`,
            opacity: wash.opacity,
            filter: "blur(48px)",
          }}
        />
      ))}

      {mounted
        ? DOODLES.map((d, i) => <DoodleShape key={`lobby-${d.kind}-${i}`} d={d} i={i} />)
        : null}
    </div>
  );
}
