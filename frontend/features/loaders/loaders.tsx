"use client";

import "./loaders.css";

const colors = {
  pink: "#ED7FB8",
  green: "#10865C",
  plum: "#703F93",
  chartreuse: "#BBE331",
};

type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-14 w-14",
  md: "h-24 w-24",
  lg: "h-28 w-28",
};

/** Equalizer bars — landing / auth splash */
export function BarCascade({ size = "md" }: { size?: Size }) {
  const bars = [
    { h: size === "sm" ? 18 : 28, color: colors.plum, delay: 0 },
    { h: size === "sm" ? 28 : 44, color: colors.pink, delay: 1 },
    { h: size === "sm" ? 36 : 56, color: colors.chartreuse, delay: 2 },
    { h: size === "sm" ? 26 : 40, color: colors.green, delay: 3 },
    { h: size === "sm" ? 20 : 32, color: colors.plum, delay: 4 },
  ];

  return (
    <div
      className={`flex items-end justify-center gap-1.5 ${sizeClass[size]}`}
      role="status"
      aria-label="Loading"
    >
      {bars.map((b) => (
        <div
          key={b.delay}
          className={`svigl-anim-bar svigl-anim-bar-d${b.delay} w-2.5 rounded-full sm:w-3`}
          style={{ height: b.h, background: b.color }}
        />
      ))}
    </div>
  );
}

/** 3×3 brand-dot wave — word pick waits + general network waits */
export function DotPulseGrid({ size = "md" }: { size?: Size }) {
  const dots: { cx: number; cy: number; fill: string; delay: number }[] = [
    { cx: 30, cy: 30, fill: colors.pink, delay: 0 },
    { cx: 60, cy: 30, fill: colors.chartreuse, delay: 1 },
    { cx: 90, cy: 30, fill: colors.plum, delay: 2 },
    { cx: 30, cy: 60, fill: colors.green, delay: 3 },
    { cx: 60, cy: 60, fill: colors.pink, delay: 4 },
    { cx: 90, cy: 60, fill: colors.chartreuse, delay: 5 },
    { cx: 30, cy: 90, fill: colors.plum, delay: 6 },
    { cx: 60, cy: 90, fill: colors.green, delay: 7 },
    { cx: 90, cy: 90, fill: colors.pink, delay: 8 },
  ];

  return (
    <svg
      viewBox="0 0 120 120"
      className={sizeClass[size]}
      role="status"
      aria-label="Loading"
    >
      {dots.map((d) => (
        <circle
          key={`${d.cx}-${d.cy}`}
          cx={d.cx}
          cy={d.cy}
          r="8"
          fill={d.fill}
          className={`svigl-anim-dot svigl-anim-dot-d${d.delay}`}
        />
      ))}
    </svg>
  );
}

/** SVIGL wordmark bounce — results reveal + lobby waiting */
export function LetterBounce({ size = "md" }: { size?: Size }) {
  const letters = [
    { ch: "S", color: colors.pink },
    { ch: "V", color: colors.chartreuse },
    { ch: "I", color: colors.plum },
    { ch: "G", color: colors.green },
    { ch: "L", color: colors.pink },
  ];

  const textSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";

  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="status"
      aria-label="Loading"
    >
      {letters.map((l, i) => (
        <span
          key={l.ch}
          className={`svigl-anim-letter svigl-anim-letter-d${i} font-black tracking-tight ${textSize}`}
          style={{ color: l.color }}
        >
          {l.ch}
        </span>
      ))}
    </div>
  );
}

type LoaderKind = "bars" | "dots" | "letters";

const LOADER: Record<LoaderKind, typeof BarCascade> = {
  bars: BarCascade,
  dots: DotPulseGrid,
  letters: LetterBounce,
};

/** Full-page / centered wait state with label */
export function LoaderScreen({
  kind,
  label,
  size = "md",
  className = "",
}: {
  kind: LoaderKind;
  label: string;
  size?: Size;
  className?: string;
}) {
  const Loader = LOADER[kind];
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 ${className}`}
    >
      <Loader size={size} />
      <p className="text-sm font-medium text-ink-muted">{label}</p>
    </div>
  );
}
