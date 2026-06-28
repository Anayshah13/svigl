"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";
import { colors } from "@/lib/colors";

const W = 480;
const H = 360;

/** Pictionary-style lighthouse — rects + circles that read at a glance */
const LIGHTHOUSE = [
  { type: "rect", x: 148, y: 274, w: 184, h: 12, fill: colors.plum, rx: 3, delay: 0.1 },
  { type: "rect", x: 198, y: 178, w: 52, h: 96, fill: colors.green, rx: 2, delay: 0.22 },
  { type: "rect", x: 198, y: 218, w: 52, h: 14, fill: colors.pink, delay: 0.38 },
  { type: "rect", x: 188, y: 154, w: 72, h: 28, fill: colors.plum, rx: 4, delay: 0.48 },
  { type: "circle", cx: 224, cy: 140, r: 28, fill: colors.chartreuse, delay: 0.58 },
  { type: "circle", cx: 224, cy: 200, r: 10, fill: colors.pink, delay: 0.68 },
  { type: "rect", x: 212, y: 252, w: 24, h: 22, fill: colors.ink, rx: 2, delay: 0.76 },
  { type: "circle", cx: 168, cy: 284, r: 18, fill: colors.chartreuse, delay: 0.84 },
  { type: "circle", cx: 312, cy: 280, r: 22, fill: colors.pink, delay: 0.92 },
  { type: "circle", cx: 356, cy: 288, r: 14, fill: colors.plum, delay: 1.0 },
];

/** Ocean wave drawn with the path (bezier) tool */
const WAVE_START = { x: 48, y: 262 };
const WAVE_END = { x: 432, y: 262 };
const WAVE_CP2 = { x: 310, y: 228 };

const REMOTE_PLAYERS = [
  {
    name: "mira",
    color: colors.plum,
    move: (t: number) => ({
      x: 218 + Math.sin(t * 0.9) * 14,
      y: 218 + Math.cos(t * 0.7) * 10,
    }),
  },
  {
    name: "kenji",
    color: colors.green,
    move: (t: number) => ({
      x: 88 + Math.sin(t * 0.6 + 1) * 18,
      y: 118 + Math.cos(t * 0.8) * 12,
    }),
  },
];

function CubicBezierWithHandle() {
  const [cp1, setCp1] = useState({ x: 175, y: 232 });
  const t = useRef(0);

  useAnimationFrame((time) => {
    t.current = time / 1000;
    setCp1({
      x: 175 + Math.sin(t.current * 0.7) * 38 + Math.cos(t.current * 1.1) * 18,
      y: 228 + Math.cos(t.current * 0.85) * 28 + Math.sin(t.current * 0.6) * 14,
    });
  });

  const pathD = `M ${WAVE_START.x} ${WAVE_START.y} C ${cp1.x} ${cp1.y} ${WAVE_CP2.x} ${WAVE_CP2.y} ${WAVE_END.x} ${WAVE_END.y}`;

  return (
    <g>
      <line
        x1={WAVE_START.x}
        y1={WAVE_START.y}
        x2={cp1.x}
        y2={cp1.y}
        stroke={colors.plum}
        strokeWidth={1.5}
        strokeOpacity={0.45}
        strokeDasharray="5 4"
      />
      <line
        x1={cp1.x}
        y1={cp1.y}
        x2={WAVE_CP2.x}
        y2={WAVE_CP2.y}
        stroke={colors.plum}
        strokeWidth={1}
        strokeOpacity={0.25}
        strokeDasharray="3 4"
      />
      <line
        x1={WAVE_CP2.x}
        y1={WAVE_CP2.y}
        x2={WAVE_END.x}
        y2={WAVE_END.y}
        stroke={colors.plum}
        strokeWidth={1}
        strokeOpacity={0.25}
        strokeDasharray="3 4"
      />
      <path d={pathD} fill="none" stroke={colors.plum} strokeWidth={3} strokeLinecap="round" />
      <circle
        cx={WAVE_START.x}
        cy={WAVE_START.y}
        r={4}
        fill={colors.whitePure}
        stroke={colors.plum}
        strokeWidth={2}
      />
      <circle
        cx={WAVE_END.x}
        cy={WAVE_END.y}
        r={4}
        fill={colors.whitePure}
        stroke={colors.plum}
        strokeWidth={2}
      />
      <rect
        x={WAVE_CP2.x - 4}
        y={WAVE_CP2.y - 4}
        width={8}
        height={8}
        fill={colors.whitePure}
        stroke={colors.green}
        strokeWidth={1.5}
      />
      <circle cx={cp1.x} cy={cp1.y} r={7} fill={colors.plum} />
      <circle
        cx={cp1.x}
        cy={cp1.y}
        r={11}
        fill="none"
        stroke={colors.plum}
        strokeWidth={1.5}
        opacity={0.45}
      />
    </g>
  );
}

function RemotePlayerCursors() {
  const [positions, setPositions] = useState(REMOTE_PLAYERS.map((p) => p.move(0)));
  const t = useRef(0);

  useAnimationFrame((time) => {
    t.current = time / 1000;
    setPositions(REMOTE_PLAYERS.map((p) => p.move(t.current)));
  });

  return (
    <>
      {REMOTE_PLAYERS.map((player, i) => {
        const pos = positions[i];
        return (
          <div
            key={player.name}
            className="pointer-events-none absolute z-20"
            style={{
              left: `${(pos.x / W) * 100}%`,
              top: `${(pos.y / H) * 100}%`,
              transform: "translate(-2px, -2px)",
            }}
          >
            <svg width="14" height="18" viewBox="0 0 14 18" className="drop-shadow-sm">
              <path d="M0 0 L0 14 L4 10 L7 16 L10 14 L6 8 L12 8 Z" fill={player.color} />
            </svg>
            <span
              className="absolute left-3 top-3 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-sm"
              style={{
                background: colors.whitePure,
                color: colors.ink,
                border: `1.5px solid ${player.color}`,
              }}
            >
              {player.name}
            </span>
          </div>
        );
      })}
    </>
  );
}

export function HeroCanvasPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div
        className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-sm"
        style={{ boxShadow: `0 32px 64px -16px ${colors.plum}25, 0 0 0 1px rgba(255,255,255,0.8)` }}
      >
        <div className="flex items-center gap-2 border-b border-black/5 bg-white/90 px-4 py-2.5">
          <span className="font-mono text-xs" style={{ color: `${colors.ink}99` }}>
            svigl.app · QXP4M
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            3 online
          </span>
        </div>

        <div className="dot-grid-canvas relative bg-white" style={{ aspectRatio: "4/3" }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="relative z-0 h-full w-full">
            {LIGHTHOUSE.map((s, i) => {
              if (s.type === "circle") {
                return (
                  <motion.circle
                    key={i}
                    cx={s.cx}
                    cy={s.cy}
                    r={0}
                    fill={s.fill}
                    animate={{ r: s.r }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: s.delay }}
                  />
                );
              }
              return (
                <motion.rect
                  key={i}
                  x={s.x}
                  y={s.y}
                  width={0}
                  height={0}
                  rx={s.rx}
                  fill={s.fill}
                  animate={{ width: s.w, height: s.h }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: s.delay }}
                />
              );
            })}
            <CubicBezierWithHandle />
          </svg>

          <RemotePlayerCursors />

          <motion.div
            className="absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md"
            style={{ background: colors.plum }}
          >
            0:42
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4, type: "spring" }}
            className="absolute bottom-12 left-4 z-10 max-w-[180px] rounded-2xl rounded-bl-sm px-3 py-2 text-xs shadow-md"
            style={{ background: colors.whitePure, color: colors.ink }}
          >
            <span style={{ color: `${colors.ink}99` }}>guess: </span>
            <span className="script-accent text-base font-semibold" style={{ color: colors.plum }}>
              lighthouse?
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, type: "spring" }}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-black/5 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur-sm"
          >
            {["V", "P", "R", "O"].map((k, i) => (
              <div
                key={k}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold"
                style={{
                  background: i === 1 ? colors.plum : "transparent",
                  color: i === 1 ? colors.whitePure : colors.ink,
                }}
              >
                {k}
              </div>
            ))}
            <div className="mx-0.5 h-4 w-px bg-black/10" />
            {[colors.ink, colors.plum, colors.green, colors.pink].map((c) => (
              <div
                key={c}
                className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                style={{ background: c }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
