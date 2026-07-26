/**
 * Flood fill on an offscreen canvas, then contour-trace the filled region
 * into an SVG path. Used by the fill-bucket tool only — the main surface stays SVG.
 *
 * Contours include holes (e.g. a ring between two concentric circles) so the
 * result can be painted with fill-rule="evenodd" without covering nested voids.
 */

export interface FloodFillOptions {
  width: number;
  height: number;
  /** Click point in canvas pixel space (same as viewBox units when 1:1). */
  x: number;
  y: number;
  fillColor: string;
  /** Max channel delta (0–255) from seed color to keep flooding. */
  tolerance?: number;
  /** Optional SVG markup to rasterize as the fill source. */
  svgMarkup: string;
}

type Point = { x: number; y: number };

function parseCssColor(color: string): [number, number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0, 0, 0, 255];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

function colorMatch(
  data: Uint8ClampedArray,
  idx: number,
  target: [number, number, number, number],
  tolerance: number,
): boolean {
  const dr = Math.abs(data[idx] - target[0]);
  const dg = Math.abs(data[idx + 1] - target[1]);
  const db = Math.abs(data[idx + 2] - target[2]);
  const da = Math.abs(data[idx + 3] - target[3]);
  return Math.max(dr, dg, db, da) <= tolerance;
}

/**
 * Scanline flood fill. Returns a boolean mask (1 = filled) and count of filled pixels.
 */
export function floodFillMask(
  imageData: ImageData,
  sx: number,
  sy: number,
  tolerance: number,
): { mask: Uint8Array; count: number } {
  const { width, height, data } = imageData;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const mask = new Uint8Array(width * height);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) {
    return { mask, count: 0 };
  }

  const seedIdx = (y0 * width + x0) * 4;
  const seed: [number, number, number, number] = [
    data[seedIdx],
    data[seedIdx + 1],
    data[seedIdx + 2],
    data[seedIdx + 3],
  ];

  const stack: number[] = [x0, y0];
  let count = 0;

  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    let idx = y * width + x;
    // Move left
    while (x >= 0 && !mask[idx] && colorMatch(data, idx * 4, seed, tolerance)) {
      x--;
      idx--;
    }
    x++;
    idx++;
    let spanAbove = false;
    let spanBelow = false;
    while (x < width && !mask[idx] && colorMatch(data, idx * 4, seed, tolerance)) {
      mask[idx] = 1;
      count++;
      if (y > 0) {
        const above = idx - width;
        if (!spanAbove && !mask[above] && colorMatch(data, above * 4, seed, tolerance)) {
          stack.push(x, y - 1);
          spanAbove = true;
        } else if (spanAbove && (mask[above] || !colorMatch(data, above * 4, seed, tolerance))) {
          spanAbove = false;
        }
      }
      if (y < height - 1) {
        const below = idx + width;
        if (!spanBelow && !mask[below] && colorMatch(data, below * 4, seed, tolerance)) {
          stack.push(x, y + 1);
          spanBelow = true;
        } else if (spanBelow && (mask[below] || !colorMatch(data, below * 4, seed, tolerance))) {
          spanBelow = false;
        }
      }
      x++;
      idx++;
    }
  }

  return { mask, count };
}

/**
 * Expand the fill mask one step into anti-aliased fringe pixels that are still
 * close to the seed color, without crossing hard stroke barriers.
 * This closes the hairline gaps that appear between the fill and stroke edges.
 */
export function growMaskIntoFringe(
  mask: Uint8Array,
  imageData: ImageData,
  seed: [number, number, number, number],
  fringeTolerance: number,
): number {
  const { width, height, data } = imageData;
  const next: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) next.push(i - 1);
    if (x < width - 1) next.push(i + 1);
    if (y > 0) next.push(i - width);
    if (y < height - 1) next.push(i + width);
  }

  let grown = 0;
  const seen = new Uint8Array(mask.length);
  for (const i of next) {
    if (mask[i] || seen[i]) continue;
    seen[i] = 1;
    if (colorMatch(data, i * 4, seed, fringeTolerance)) {
      mask[i] = 1;
      grown++;
    }
  }
  return grown;
}

/** Mark unfilled pixels reachable from the image border (true exterior). */
export function markExterior(mask: Uint8Array, width: number, height: number): Uint8Array {
  const exterior = new Uint8Array(width * height);
  const stack: number[] = [];

  const tryPush = (i: number) => {
    if (mask[i] || exterior[i]) return;
    exterior[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x++) {
    tryPush(x);
    tryPush((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    tryPush(y * width);
    tryPush(y * width + width - 1);
  }

  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) tryPush(i - 1);
    if (x < width - 1) tryPush(i + 1);
    if (y > 0) tryPush(i - width);
    if (y < height - 1) tryPush(i + width);
  }

  return exterior;
}

const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;

/**
 * Moore-neighborhood contour walk over pixels where `isInside` is true.
 * Uses a left-turn preference so the region stays on the walker's left.
 */
export function traceContour(
  isInside: (x: number, y: number) => boolean,
  startX: number,
  startY: number,
  width: number,
  height: number,
): Point[] {
  if (!isInside(startX, startY)) return [];

  const points: Point[] = [];
  let x = startX;
  let y = startY;
  let dir = 0;
  const maxSteps = width * height * 2;
  let steps = 0;

  do {
    points.push({ x, y });
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + 6 + i) % 8;
      const nx = x + DIRS[nd][0];
      const ny = y + DIRS[nd][1];
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && isInside(nx, ny)) {
        x = nx;
        y = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found) break;
    steps++;
  } while ((x !== startX || y !== startY) && steps < maxSteps);

  return points;
}

/** Keep corners; only thin long collinear runs on huge contours. */
function simplifyContour(points: Point[]): Point[] {
  if (points.length < 4) return points;

  // Always keep direction-change vertices; sample every Nth only on long
  // collinear stretches so large fills stay compact without leaving gaps.
  const out: Point[] = [points[0]];
  let run = 0;
  const maxRun = points.length > 8000 ? 3 : points.length > 3000 ? 2 : 1;

  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (cross !== 0) {
      out.push(b);
      run = 0;
    } else {
      run++;
      if (run >= maxRun) {
        out.push(b);
        run = 0;
      }
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function contourToPathPart(points: Point[]): string {
  if (points.length < 3) {
    const p = points[0];
    if (!p) return "";
    // Pixel-center → unit square so tiny fills still cover their mask cell.
    return `M ${p.x} ${p.y} h 1 v 1 h -1 Z`;
  }
  const simplified = simplifyContour(points);
  // Offset to pixel corners (+0.5) so the filled path covers the mask cells
  // instead of sitting on centers and leaving a fringe against strokes.
  const parts: string[] = [];
  for (let i = 0; i < simplified.length; i++) {
    const p = simplified[i];
    const x = p.x + 0.5;
    const y = p.y + 0.5;
    parts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function floodComponent(
  start: number,
  width: number,
  height: number,
  isMember: (i: number) => boolean,
  visited: Uint8Array,
): void {
  const stack = [start];
  visited[start] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i / width) | 0;
    const neighbors = [i - 1, i + 1, i - width, i + width];
    const inBounds = [
      x > 0,
      x < width - 1,
      y > 0,
      y < height - 1,
    ];
    for (let n = 0; n < 4; n++) {
      if (!inBounds[n]) continue;
      const j = neighbors[n];
      if (visited[j] || !isMember(j)) continue;
      visited[j] = 1;
      stack.push(j);
    }
  }
}

/**
 * Trace outer boundaries of every filled component plus every enclosed hole.
 * Returns a compound path suitable for fill-rule="evenodd".
 */
export function maskToPath(mask: Uint8Array, width: number, height: number): string {
  const exterior = markExterior(mask, width, height);
  const visitedFilled = new Uint8Array(width * height);
  const visitedHoles = new Uint8Array(width * height);
  const parts: string[] = [];

  const isFilled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i] || visitedFilled[i]) continue;

      // Topmost-leftmost pixel of this filled component → outer contour start.
      const contour = traceContour(isFilled, x, y, width, height);
      const part = contourToPathPart(contour);
      if (part) parts.push(part);
      floodComponent(i, width, height, (j) => mask[j] === 1, visitedFilled);
    }
  }

  if (parts.length === 0) return "";

  // Holes: unfilled islands not connected to the image border through unfilled cells.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i] || exterior[i] || visitedHoles[i]) continue;

      const isHole = (hx: number, hy: number) => {
        if (hx < 0 || hy < 0 || hx >= width || hy >= height) return false;
        const hi = hy * width + hx;
        return mask[hi] === 0 && exterior[hi] === 0;
      };

      const contour = traceContour(isHole, x, y, width, height);
      const part = contourToPathPart(contour);
      if (part) parts.push(part);
      floodComponent(
        i,
        width,
        height,
        (j) => mask[j] === 0 && exterior[j] === 0,
        visitedHoles,
      );
    }
  }

  return parts.join(" ");
}

async function loadSvgImage(svgMarkup: string): Promise<HTMLImageElement> {
  // Prefer data: URLs — Safari is stricter about blob: SVG → canvas → getImageData.
  const encoded = encodeURIComponent(svgMarkup)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("data-url"));
      image.src = dataUrl;
    });
  } catch {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to rasterize SVG for flood fill"));
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function rasterizeSvg(
  svgMarkup: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const img = await loadSvgImage(svgMarkup);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D context unavailable for flood fill");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  try {
    return ctx.getImageData(0, 0, width, height);
  } catch {
    throw new Error("Failed to read flood-fill pixels (canvas tainted)");
  }
}

/**
 * Run flood fill and return an SVG path `d` for the filled region, or null if nothing filled.
 * Paths may contain holes; render with fill-rule="evenodd".
 */
export async function floodFillToPath(options: FloodFillOptions): Promise<string | null> {
  const {
    width,
    height,
    x,
    y,
    fillColor,
    tolerance = 24,
    svgMarkup,
  } = options;

  const imageData = await rasterizeSvg(svgMarkup, width, height);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return null;

  const seedIdx = (y0 * width + x0) * 4;
  const seed: [number, number, number, number] = [
    imageData.data[seedIdx],
    imageData.data[seedIdx + 1],
    imageData.data[seedIdx + 2],
    imageData.data[seedIdx + 3],
  ];

  const { mask, count } = floodFillMask(imageData, x, y, tolerance);
  if (count === 0) return null;

  // Pull the fill up to the stroke through soft AA fringes without crossing ink.
  growMaskIntoFringe(mask, imageData, seed, Math.max(tolerance * 3, 72));

  const d = maskToPath(mask, width, height);
  if (!d) return null;

  parseCssColor(fillColor);
  return d;
}

/** Pure helpers exported for unit tests (no DOM). */
export const floodFillTestUtils = {
  colorMatch,
  parseCssColor,
};
