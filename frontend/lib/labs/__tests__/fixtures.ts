import type { LabGameId, TimedPoint } from "../types";

/** Build timed samples with mild human-like speed variation (anti-bot). */
function withTiming(points: Array<{ x: number; y: number }>): TimedPoint[] {
  let t = 0;
  return points.map((p, i) => {
    // Stronger Δt variation + slight spatial ease so bot gate stays clear.
    const ease = 0.85 + 0.3 * Math.sin(i / 11);
    const dt = (16 + ((i * 13) % 17) + (i % 5)) * ease;
    t += dt;
    return { x: p.x, y: p.y, t };
  });
}

function jitter(
  points: Array<{ x: number; y: number }>,
  amp: number,
  seed = 1,
): Array<{ x: number; y: number }> {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647) * 2 - 1;
  };
  return points.map((p) => ({
    x: p.x + rand() * amp,
    y: p.y + rand() * amp,
  }));
}

export function makeCircle(
  quality: "perfect" | "good" | "average" | "poor" | "invalid",
  n = 180,
): TimedPoint[] {
  if (quality === "invalid") {
    // Chaotic scribble
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      pts.push({
        x: 100 + Math.sin(i * 0.7) * 40 + (i % 17),
        y: 100 + Math.cos(i * 1.3) * 30 + ((i * 3) % 23),
      });
    }
    return withTiming(pts);
  }

  const noise =
    quality === "perfect"
      ? 0
      : quality === "good"
        ? 1.2
        : quality === "average"
          ? 4
          : 12;
  const cx = 200;
  const cy = 180;
  const r = 80;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / (n - 1);
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return withTiming(noise > 0 ? jitter(pts, noise, 42) : pts);
}

export function makeSquare(
  quality: "perfect" | "good" | "average" | "poor" | "invalid",
  n = 200,
): TimedPoint[] {
  if (quality === "invalid") return makeCircle("invalid", n);

  const noise =
    quality === "perfect"
      ? 0
      : quality === "good"
        ? 1
        : quality === "average"
          ? 3.5
          : 10;

  // Axis-aligned square, start at top-left, go clockwise then we rely on CCW fix.
  const x0 = 120;
  const y0 = 120;
  const s = 140;
  const perSide = Math.floor(n / 4);
  const pts: Array<{ x: number; y: number }> = [];
  const pushEdge = (ax: number, ay: number, bx: number, by: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const u = i / count;
      pts.push({ x: ax + (bx - ax) * u, y: ay + (by - ay) * u });
    }
  };
  pushEdge(x0, y0, x0 + s, y0, perSide);
  pushEdge(x0 + s, y0, x0 + s, y0 + s, perSide);
  pushEdge(x0 + s, y0 + s, x0, y0 + s, perSide);
  pushEdge(x0, y0 + s, x0, y0, n - 3 * perSide);

  return withTiming(noise > 0 ? jitter(pts, noise, 7) : pts);
}

export function makeTriangle(
  quality: "perfect" | "good" | "average" | "poor" | "invalid",
  n = 180,
): TimedPoint[] {
  if (quality === "invalid") return makeCircle("invalid", n);

  const noise =
    quality === "perfect"
      ? 0
      : quality === "good"
        ? 1
        : quality === "average"
          ? 3.5
          : 10;

  const cx = 200;
  const cy = 200;
  const r = 90;
  const verts = [0, 1, 2].map((k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const perSide = Math.floor(n / 3);
  const pts: Array<{ x: number; y: number }> = [];
  for (let e = 0; e < 3; e++) {
    const a = verts[e]!;
    const b = verts[(e + 1) % 3]!;
    const count = e === 2 ? n - 2 * perSide : perSide;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      pts.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    }
  }
  return withTiming(noise > 0 ? jitter(pts, noise, 11) : pts);
}

export function makeInfinity(
  quality: "perfect" | "good" | "average" | "poor" | "invalid",
  n = 220,
): TimedPoint[] {
  if (quality === "invalid") return makeCircle("invalid", n);

  const noise =
    quality === "perfect"
      ? 0
      : quality === "good"
        ? 1.5
        : quality === "average"
          ? 5
          : 14;

  const scale = 90;
  const cx = 200;
  const cy = 180;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    const s = Math.sin(t);
    const c = Math.cos(t);
    const denom = 1 + s * s;
    pts.push({
      x: cx + (scale * Math.SQRT2 * c) / denom,
      y: cy + (scale * Math.SQRT2 * c * s) / denom,
    });
  }
  return withTiming(noise > 0 ? jitter(pts, noise, 19) : pts);
}

export function sampleFor(
  game: LabGameId,
  quality: "perfect" | "good" | "average" | "poor" | "invalid",
): TimedPoint[] {
  switch (game) {
    case "perfect-circle":
      return makeCircle(quality);
    case "perfect-square":
      return makeSquare(quality);
    case "perfect-triangle":
      return makeTriangle(quality);
    case "infinity-loop":
      return makeInfinity(quality);
  }
}
