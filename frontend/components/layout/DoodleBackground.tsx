"use client";

import { motion } from "framer-motion";
import { colors, palette } from "@/lib/colors";

const DOODLES = [
  { x: "6%", y: "10%", size: 36, rotate: -12, delay: 0, shape: "blob" as const, color: colors.plum },
  { x: "88%", y: "14%", size: 28, rotate: 18, delay: 0.4, shape: "circle" as const, color: colors.chartreuse },
  { x: "92%", y: "58%", size: 32, rotate: -6, delay: 0.7, shape: "rect" as const, color: colors.green },
  { x: "4%", y: "68%", size: 24, rotate: 10, delay: 1, shape: "circle" as const, color: colors.pink },
  { x: "72%", y: "85%", size: 30, rotate: -15, delay: 0.3, shape: "blob" as const, color: colors.chartreuse },
  { x: "42%", y: "4%", size: 22, rotate: 8, delay: 0.9, shape: "arc" as const, color: colors.plum },
];

function DoodleShape({
  shape,
  size,
  color,
}: {
  shape: "circle" | "rect" | "arc" | "blob";
  size: number;
  color: string;
}) {
  if (shape === "blob") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <path
          d="M20,4 C32,2 38,14 36,24 C34,34 22,38 12,34 C2,30 4,14 12,8 C15,6 17,5 20,4"
          fill={color}
          opacity={0.45}
        />
      </svg>
    );
  }
  if (shape === "circle") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill={color} opacity="0.5" />
      </svg>
    );
  }
  if (shape === "rect") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <rect x="4" y="8" width="24" height="16" rx="4" fill={color} opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path
        d="M4 24 Q16 4 28 24"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function DoodleBackground({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
      style={{ zIndex: -1 }}
    >
      {DOODLES.map((d, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: d.x, top: d.y }}
          animate={{
            y: [0, -14, 0],
            rotate: [d.rotate, d.rotate + 10, d.rotate],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{
            duration: 5 + i * 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d.delay,
          }}
        >
          <DoodleShape shape={d.shape} size={d.size} color={d.color} />
        </motion.div>
      ))}
    </div>
  );
}

export { palette as doodlePalette };
