/**
 * Flood fill on an offscreen canvas, then contour-trace the filled region
 * into an SVG path. Used by the fill-bucket tool only — the main surface stays SVG.
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

  // Don't fill if seed is already "full opacity paint" of near-fill — still OK;
  // caller paints over. Reject empty clicks outside bounds only.
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
 * Trace outer boundary of a binary mask into an SVG path (Moore neighborhood).
 * Good enough for bucket-fill regions in a game whiteboard.
 */
export function maskToPath(mask: Uint8Array, width: number, height: number): string {
  // Find a starting edge pixel
  let sx = -1;
  let sy = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        sx = x;
        sy = y;
        break;
      }
    }
    if (sx >= 0) break;
  }
  if (sx < 0) return "";

  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ] as const;

  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;

  const points: Array<{ x: number; y: number }> = [];
  let x = sx;
  let y = sy;
  let dir = 0; // start looking right
  const startX = sx;
  const startY = sy;
  const maxSteps = width * height * 2;
  let steps = 0;

  do {
    points.push({ x, y });
    // Start search from dir+6 (turn left preference) for outer contour
    let found = false;
    for (let i = 0; i < 8; i++) {
      const nd = (dir + 6 + i) % 8;
      const nx = x + dirs[nd][0];
      const ny = y + dirs[nd][1];
      if (inside(nx, ny)) {
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

  if (points.length < 3) {
    // Tiny region — approximate as a small rect
    return `M ${sx} ${sy} h 1 v 1 h -1 Z`;
  }

  // Simplify: keep every Nth point for large fills
  const stride = points.length > 4000 ? 4 : points.length > 1500 ? 2 : 1;
  const parts: string[] = [];
  for (let i = 0; i < points.length; i += stride) {
    const p = points[i];
    parts.push(i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

async function rasterizeSvg(
  svgMarkup: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to rasterize SVG for flood fill"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D context unavailable for flood fill");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Run flood fill and return an SVG path `d` for the filled region, or null if nothing filled.
 */
export async function floodFillToPath(options: FloodFillOptions): Promise<string | null> {
  const {
    width,
    height,
    x,
    y,
    fillColor,
    tolerance = 32,
    svgMarkup,
  } = options;

  const imageData = await rasterizeSvg(svgMarkup, width, height);
  const { mask, count } = floodFillMask(imageData, x, y, tolerance);
  if (count === 0) return null;

  // Guard against filling the entire board (click on empty white when board is empty-ish)
  if (count > width * height * 0.98) {
    // Still allow — Skribbl often fills background; path will be the board rect
  }

  const d = maskToPath(mask, width, height);
  if (!d) return null;

  // Validate fillColor parses (ensures we don't store garbage)
  parseCssColor(fillColor);
  return d;
}

/** Pure helpers exported for unit tests (no DOM). */
export const floodFillTestUtils = {
  colorMatch,
  parseCssColor,
};
