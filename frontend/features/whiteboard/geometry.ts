import {
  GRID_SIZE,
  WHITEBOARD_VIEWBOX,
  type Point,
  type WhiteboardShape,
} from "./types";

export function createId(prefix = "wb"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Default cubic control points along the chord (1/3, 2/3) — elevated straight quadratic. */
export function defaultBezierHandles(start: Point, end: Point): { cp1: Point; cp2: Point } {
  return cubicFromCurveControl(start, end, mid(start, end));
}

/**
 * Single UI control point for a cubic stored as an elevated quadratic.
 * Reconstructs Q from both sides and averages for robustness.
 */
export function bezierCurveControl(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
): Point {
  const q1 = {
    x: 1.5 * cp1.x - 0.5 * start.x,
    y: 1.5 * cp1.y - 0.5 * start.y,
  };
  const q2 = {
    x: 1.5 * cp2.x - 0.5 * end.x,
    y: 1.5 * cp2.y - 0.5 * end.y,
  };
  return mid(q1, q2);
}

/** Elevate a quadratic (start, control, end) into cubic control points. */
export function cubicFromCurveControl(
  start: Point,
  end: Point,
  control: Point,
): { cp1: Point; cp2: Point } {
  return {
    cp1: {
      x: start.x + (2 / 3) * (control.x - start.x),
      y: start.y + (2 / 3) * (control.y - start.y),
    },
    cp2: {
      x: end.x + (2 / 3) * (control.x - end.x),
      y: end.y + (2 / 3) * (control.y - end.y),
    },
  };
}

export function bezierPathD(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
): string {
  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
}

export function boundsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/** Shapes whose axis-aligned bounds intersect the marquee (document order). */
export function shapesInMarquee(
  shapes: WhiteboardShape[],
  marquee: { x: number; y: number; width: number; height: number },
): WhiteboardShape[] {
  if (marquee.width <= 0 || marquee.height <= 0) return [];
  return shapes.filter((s) => boundsOverlap(shapeBounds(s), marquee));
}

export function normalizeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  square: boolean,
): { x: number; y: number; width: number; height: number } {
  let w = x1 - x0;
  let h = y1 - y0;
  if (square) {
    const side = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * side;
    h = Math.sign(h || 1) * side;
  }
  const x = w < 0 ? x0 + w : x0;
  const y = h < 0 ? y0 + h : y0;
  return { x, y, width: Math.abs(w), height: Math.abs(h) };
}

export function rectToEllipse(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  circle: boolean,
): { cx: number; cy: number; rx: number; ry: number } {
  const box = normalizeRect(x0, y0, x1, y1, circle);
  return {
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    rx: box.width / 2,
    ry: box.height / 2,
  };
}

/** Build SVG transform for rotation around a center. */
export function rotateTransform(cx: number, cy: number, degrees: number): string {
  if (!degrees) return "";
  return `rotate(${degrees} ${cx} ${cy})`;
}

/** Skew a rectangle into a parallelogram-like appearance. */
export function skewTransform(skewXDeg: number, originX: number, originY: number): string {
  if (!skewXDeg) return "";
  return `translate(${originX} ${originY}) skewX(${skewXDeg}) translate(${-originX} ${-originY})`;
}

export function composeTransforms(...parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Shift rotate/skew origin points embedded in an SVG transform string. */
export function offsetTransform(transform: string, dx: number, dy: number): string {
  if (!transform || (!dx && !dy)) return transform;
  let next = transform;
  next = next.replace(
    /rotate\(([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\)/g,
    (_m, deg: string, cx: string, cy: string) =>
      `rotate(${deg} ${Number(cx) + dx} ${Number(cy) + dy})`,
  );
  next = next.replace(
    /translate\(([-\d.]+)[,\s]+([-\d.]+)\)\s*skewX\(([-\d.]+)\)\s*translate\(([-\d.]+)[,\s]+([-\d.]+)\)/g,
    (
      _m,
      ox: string,
      oy: string,
      skew: string,
      nx: string,
      ny: string,
    ) =>
      `translate(${Number(ox) + dx} ${Number(oy) + dy}) skewX(${skew}) translate(${Number(nx) - dx} ${Number(ny) - dy})`,
  );
  return next;
}

export function parseRotate(
  transform: string,
): { deg: number; cx: number; cy: number } | null {
  const m = /rotate\(([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\)/.exec(transform);
  if (!m) return null;
  return { deg: Number(m[1]), cx: Number(m[2]), cy: Number(m[3]) };
}

/** Inverse-rotate a point around a center (degrees). */
export function unrotatePoint(
  p: Point,
  cx: number,
  cy: number,
  degrees: number,
): Point {
  if (!degrees) return p;
  const rad = (-degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

function cubicAt(
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Distance from point to line segment a→b. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function distToCubic(
  p: Point,
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point,
  samples = 24,
): number {
  let min = Infinity;
  let prev = start;
  for (let i = 1; i <= samples; i++) {
    const pt = cubicAt(i / samples, start, cp1, cp2, end);
    min = Math.min(min, distToSegment(p, prev, pt));
    prev = pt;
  }
  return min;
}

export function pointInRect(
  p: Point,
  x: number,
  y: number,
  w: number,
  h: number,
  pad = 0,
): boolean {
  return (
    p.x >= x - pad &&
    p.x <= x + w + pad &&
    p.y >= y - pad &&
    p.y <= y + h + pad
  );
}

export function pointInEllipse(
  p: Point,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  pad = 0,
): boolean {
  const erx = rx + pad;
  const ery = ry + pad;
  if (erx <= 0 || ery <= 0) return false;
  const nx = (p.x - cx) / erx;
  const ny = (p.y - cy) / ery;
  return nx * nx + ny * ny <= 1;
}

/** Rough AABB for a fill path from its d attribute (M/L/C numbers). */
export function fillPathBounds(
  d: string,
): { x: number; y: number; width: number; height: number } | null {
  const nums = d.match(/-?\d*\.?\d+/g);
  if (!nums || nums.length < 4) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Geometric hit-test for a single shape (local SVG coords).
 * Stroke shapes use distance threshold; closed shapes use fill or stroke ring.
 */
export function hitTestShape(
  shape: WhiteboardShape,
  point: Point,
  threshold = 10,
): boolean {
  const pad = Math.max(threshold, shape.strokeWidth / 2 + 4);
  let p = point;

  // Undo leading translate (used by fill moves)
  const tm = /^translate\(([-\d.]+)[,\s]+([-\d.]+)\)/.exec((shape.transform || "").trim());
  if (tm) {
    p = { x: p.x - Number(tm[1]), y: p.y - Number(tm[2]) };
  }

  const rot = parseRotate(shape.transform);
  if (rot) {
    p = unrotatePoint(p, rot.cx, rot.cy, rot.deg);
  }

  switch (shape.geometry.kind) {
    case "bezier": {
      const g = shape.geometry;
      return distToCubic(p, g.start, g.cp1, g.cp2, g.end) <= pad;
    }
    case "rectangle": {
      const g = shape.geometry;
      return pointInRect(p, g.x, g.y, g.width, g.height, pad);
    }
    case "ellipse": {
      const g = shape.geometry;
      return pointInEllipse(p, g.cx, g.cy, g.rx, g.ry, pad);
    }
    case "arrow": {
      const g = shape.geometry;
      return distToSegment(p, g.start, g.end) <= pad;
    }
    case "fill": {
      const b = fillPathBounds(shape.geometry.d);
      if (!b) return false;
      return pointInRect(p, b.x, b.y, b.width, b.height, pad);
    }
    default:
      return false;
  }
}

/** Top-most shape under the point (last in list wins). */
export function hitTestShapes(
  shapes: WhiteboardShape[],
  point: Point,
  threshold = 10,
): WhiteboardShape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (hitTestShape(s, point, threshold)) return s;
  }
  return null;
}

export type RectCorner = "nw" | "ne" | "sw" | "se";
/** Corner + edge midpoints for selection / group resize handles. */
export type RectHandle = RectCorner | "n" | "e" | "s" | "w";

export function rectCorners(g: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Record<RectCorner, Point> {
  return {
    nw: { x: g.x, y: g.y },
    ne: { x: g.x + g.width, y: g.y },
    sw: { x: g.x, y: g.y + g.height },
    se: { x: g.x + g.width, y: g.y + g.height },
  };
}

/** Corner + edge handles on an axis-aligned box. */
export function rectHandles(g: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Record<RectHandle, Point> {
  const midX = g.x + g.width / 2;
  const midY = g.y + g.height / 2;
  return {
    ...rectCorners(g),
    n: { x: midX, y: g.y },
    e: { x: g.x + g.width, y: midY },
    s: { x: midX, y: g.y + g.height },
    w: { x: g.x, y: midY },
  };
}

export function ellipseHandles(g: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}): Record<RectCorner, Point> {
  return {
    nw: { x: g.cx - g.rx, y: g.cy - g.ry },
    ne: { x: g.cx + g.rx, y: g.cy - g.ry },
    sw: { x: g.cx - g.rx, y: g.cy + g.ry },
    se: { x: g.cx + g.rx, y: g.cy + g.ry },
  };
}

export function hitCorner(
  p: Point,
  corners: Record<RectCorner, Point>,
  radius = 12,
): RectCorner | null {
  for (const key of ["nw", "ne", "sw", "se"] as RectCorner[]) {
    if (dist(p, corners[key]) <= radius) return key;
  }
  return null;
}

const RECT_HANDLE_ORDER: RectHandle[] = [
  "nw",
  "ne",
  "sw",
  "se",
  "n",
  "e",
  "s",
  "w",
];

export function hitRectHandle(
  p: Point,
  handles: Record<RectHandle, Point>,
  radius = 12,
): RectHandle | null {
  for (const key of RECT_HANDLE_ORDER) {
    if (dist(p, handles[key]) <= radius) return key;
  }
  return null;
}

/** Translate a shape's geometry (and transform origins) by dx/dy. */
export function translateShape(
  shape: WhiteboardShape,
  dx: number,
  dy: number,
): WhiteboardShape {
  if (!dx && !dy) return shape;
  const transform = offsetTransform(shape.transform, dx, dy);
  const g = shape.geometry;
  switch (g.kind) {
    case "bezier":
      return {
        ...shape,
        transform,
        geometry: {
          ...g,
          start: { x: g.start.x + dx, y: g.start.y + dy },
          end: { x: g.end.x + dx, y: g.end.y + dy },
          cp1: { x: g.cp1.x + dx, y: g.cp1.y + dy },
          cp2: { x: g.cp2.x + dx, y: g.cp2.y + dy },
        },
      };
    case "rectangle":
      return {
        ...shape,
        transform,
        geometry: { ...g, x: g.x + dx, y: g.y + dy },
      };
    case "ellipse":
      return {
        ...shape,
        transform,
        geometry: { ...g, cx: g.cx + dx, cy: g.cy + dy },
      };
    case "arrow":
      return {
        ...shape,
        transform,
        geometry: {
          ...g,
          start: { x: g.start.x + dx, y: g.start.y + dy },
          end: { x: g.end.x + dx, y: g.end.y + dy },
        },
      };
    case "fill": {
      const existing = shape.transform || "";
      const m = /^translate\(([-\d.]+)[,\s]+([-\d.]+)\)\s*(.*)$/.exec(existing.trim());
      if (m) {
        const tx = Number(m[1]) + dx;
        const ty = Number(m[2]) + dy;
        const rest = m[3] ?? "";
        return {
          ...shape,
          transform: composeTransforms(`translate(${tx} ${ty})`, rest),
        };
      }
      return {
        ...shape,
        transform: composeTransforms(`translate(${dx} ${dy})`, existing),
      };
    }
    default:
      return shape;
  }
}

export function resizeRectFromCorner(
  g: { x: number; y: number; width: number; height: number },
  corner: RectCorner,
  point: Point,
  keepSquare: boolean,
): { x: number; y: number; width: number; height: number } {
  return resizeRectFromHandle(g, corner, point, keepSquare);
}

/** Resize a box from a corner or edge; opposite side/corner stays fixed. */
export function resizeRectFromHandle(
  g: { x: number; y: number; width: number; height: number },
  handle: RectHandle,
  point: Point,
  keepAspect: boolean,
): { x: number; y: number; width: number; height: number } {
  let x0 = g.x;
  let y0 = g.y;
  let x1 = g.x + g.width;
  let y1 = g.y + g.height;
  if (handle === "nw") {
    x0 = point.x;
    y0 = point.y;
  } else if (handle === "ne") {
    x1 = point.x;
    y0 = point.y;
  } else if (handle === "sw") {
    x0 = point.x;
    y1 = point.y;
  } else if (handle === "se") {
    x1 = point.x;
    y1 = point.y;
  } else if (handle === "n") {
    y0 = point.y;
  } else if (handle === "s") {
    y1 = point.y;
  } else if (handle === "e") {
    x1 = point.x;
  } else {
    x0 = point.x;
  }
  const isCorner =
    handle === "nw" || handle === "ne" || handle === "sw" || handle === "se";
  return normalizeRect(x0, y0, x1, y1, keepAspect && isCorner);
}

export function resizeEllipseFromCorner(
  g: { cx: number; cy: number; rx: number; ry: number },
  corner: RectCorner,
  point: Point,
  keepCircle: boolean,
): { cx: number; cy: number; rx: number; ry: number } {
  const box = {
    x: g.cx - g.rx,
    y: g.cy - g.ry,
    width: g.rx * 2,
    height: g.ry * 2,
  };
  const next = resizeRectFromCorner(box, corner, point, keepCircle);
  return {
    cx: next.x + next.width / 2,
    cy: next.y + next.height / 2,
    rx: Math.max(0.5, next.width / 2),
    ry: Math.max(0.5, next.height / 2),
  };
}

/** Padding around the shape AABB for selection chrome. */
export const SELECTION_PAD = 6;

/** Distance from the selection box top edge to the rotate handle center. */
export const ROTATE_HANDLE_OFFSET = 22;

/** Arrowhead size from stroke width — larger open chevron. */
export function arrowHeadSize(strokeWidth: number): number {
  return Math.max(20, strokeWidth * 4);
}

/** Arrowhead open chevron points at `end`, pointing along start→end. */
export function arrowHeadPoints(
  start: Point,
  end: Point,
  size = 20,
): string {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const spread = Math.PI / 5;
  const a1 = angle + Math.PI - spread;
  const a2 = angle + Math.PI + spread;
  const p1 = { x: end.x + Math.cos(a1) * size, y: end.y + Math.sin(a1) * size };
  const p2 = { x: end.x + Math.cos(a2) * size, y: end.y + Math.sin(a2) * size };
  return `${p1.x},${p1.y} ${end.x},${end.y} ${p2.x},${p2.y}`;
}

/** Shorten line so the shaft doesn't cover the arrowhead tip. */
export function arrowShaftEnd(start: Point, end: Point, headSize = 12): Point {
  const len = dist(start, end);
  if (len < 1) return end;
  const t = Math.max(0, (len - headSize * 0.55) / len);
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

export type Bounds = { x: number; y: number; width: number; height: number };

type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };

const IDENTITY_MATRIX: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function transformMatrix(transform: string): Matrix {
  let matrix = IDENTITY_MATRIX;
  const re = /(translate|scale|rotate|skewX)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(transform)) !== null) {
    const values = match[2]!
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    let part = IDENTITY_MATRIX;
    if (match[1] === "translate") {
      part = { ...IDENTITY_MATRIX, e: values[0] ?? 0, f: values[1] ?? 0 };
    } else if (match[1] === "scale") {
      const sx = values[0] ?? 1;
      part = { ...IDENTITY_MATRIX, a: sx, d: values[1] ?? sx };
    } else if (match[1] === "rotate") {
      const radians = ((values[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const rotation = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      const cx = values[1] ?? 0;
      const cy = values[2] ?? 0;
      part = multiplyMatrix(
        multiplyMatrix(
          { ...IDENTITY_MATRIX, e: cx, f: cy },
          rotation,
        ),
        { ...IDENTITY_MATRIX, e: -cx, f: -cy },
      );
    } else if (match[1] === "skewX") {
      part = {
        ...IDENTITY_MATRIX,
        c: Math.tan(((values[0] ?? 0) * Math.PI) / 180),
      };
    }
    matrix = multiplyMatrix(matrix, part);
  }
  return matrix;
}

function applyMatrix(point: Point, matrix: Matrix): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

function boundsFromPoints(points: Point[]): Bounds {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

/** Compute the axis-aligned bounding box of any shape (ignores transform rotation). */
export function shapeBounds(shape: WhiteboardShape): Bounds {
  const g = shape.geometry;
  switch (g.kind) {
    case "rectangle":
      return { x: g.x, y: g.y, width: g.width, height: g.height };
    case "ellipse":
      return {
        x: g.cx - g.rx,
        y: g.cy - g.ry,
        width: g.rx * 2,
        height: g.ry * 2,
      };
    case "bezier": {
      const xs = [g.start.x, g.cp1.x, g.cp2.x, g.end.x];
      const ys = [g.start.y, g.cp1.y, g.cp2.y, g.end.y];
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    }
    case "arrow": {
      const minX = Math.min(g.start.x, g.end.x);
      const minY = Math.min(g.start.y, g.end.y);
      return {
        x: minX,
        y: minY,
        width: Math.max(g.start.x, g.end.x) - minX,
        height: Math.max(g.start.y, g.end.y) - minY,
      };
    }
    case "fill": {
      const b = fillPathBounds(g.d);
      return b ?? { x: 0, y: 0, width: 0, height: 0 };
    }
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Visual AABB after SVG transforms. Stroke width and arrowhead geometry are
 * included so a stored shape that passes this check renders fully on-board.
 */
export function shapeVisualBounds(shape: WhiteboardShape): Bounds {
  const matrix = transformMatrix(shape.transform);
  const g = shape.geometry;
  let bounds: Bounds;

  if (g.kind === "ellipse") {
    const center = applyMatrix({ x: g.cx, y: g.cy }, matrix);
    const radiusX = Math.hypot(matrix.a * g.rx, matrix.c * g.ry);
    const radiusY = Math.hypot(matrix.b * g.rx, matrix.d * g.ry);
    bounds = {
      x: center.x - radiusX,
      y: center.y - radiusY,
      width: radiusX * 2,
      height: radiusY * 2,
    };
  } else {
    let points: Point[];
    if (g.kind === "rectangle" || g.kind === "fill") {
      const b = shapeBounds(shape);
      points = [
        { x: b.x, y: b.y },
        { x: b.x + b.width, y: b.y },
        { x: b.x, y: b.y + b.height },
        { x: b.x + b.width, y: b.y + b.height },
      ];
    } else if (g.kind === "bezier") {
      // A cubic lies inside the convex hull of its endpoints/control points.
      points = [g.start, g.cp1, g.cp2, g.end];
    } else {
      const size = arrowHeadSize(shape.strokeWidth);
      const angle = Math.atan2(g.end.y - g.start.y, g.end.x - g.start.x);
      const spread = Math.PI / 5;
      points = [
        g.start,
        g.end,
        {
          x: g.end.x + Math.cos(angle + Math.PI - spread) * size,
          y: g.end.y + Math.sin(angle + Math.PI - spread) * size,
        },
        {
          x: g.end.x + Math.cos(angle + Math.PI + spread) * size,
          y: g.end.y + Math.sin(angle + Math.PI + spread) * size,
        },
      ];
    }
    bounds = boundsFromPoints(points.map((point) => applyMatrix(point, matrix)));
  }

  const strokeScale = Math.max(
    Math.hypot(matrix.a, matrix.b),
    Math.hypot(matrix.c, matrix.d),
  );
  const strokePad = g.kind === "fill" ? 0 : (shape.strokeWidth * strokeScale) / 2;
  return {
    x: bounds.x - strokePad,
    y: bounds.y - strokePad,
    width: bounds.width + strokePad * 2,
    height: bounds.height + strokePad * 2,
  };
}

/** Clamp a single point into the logical board square. */
export function clampPointToBoard(
  point: Point,
  board: { width: number; height: number } = WHITEBOARD_VIEWBOX,
  padding = 0,
): Point {
  return {
    x: clamp(point.x, padding, board.width - padding),
    y: clamp(point.y, padding, board.height - padding),
  };
}

/**
 * Clamp each geometry control/endpoint into [0,board]² independently.
 * Does not scale or translate the shape as a whole — safe for handle drags.
 */
export function clampGeometryPointsToBoard(
  shape: WhiteboardShape,
  board: { width: number; height: number } = WHITEBOARD_VIEWBOX,
  padding = 0,
): WhiteboardShape {
  const g = shape.geometry;
  switch (g.kind) {
    case "bezier":
      return {
        ...shape,
        geometry: {
          ...g,
          start: clampPointToBoard(g.start, board, padding),
          end: clampPointToBoard(g.end, board, padding),
          cp1: clampPointToBoard(g.cp1, board, padding),
          cp2: clampPointToBoard(g.cp2, board, padding),
        },
      };
    case "arrow":
      return {
        ...shape,
        geometry: {
          ...g,
          start: clampPointToBoard(g.start, board, padding),
          end: clampPointToBoard(g.end, board, padding),
        },
      };
    case "rectangle": {
      const x = clamp(g.x, padding, board.width - padding);
      const y = clamp(g.y, padding, board.height - padding);
      const width = clamp(g.width, 0.5, board.width - padding - x);
      const height = clamp(g.height, 0.5, board.height - padding - y);
      return { ...shape, geometry: { ...g, x, y, width, height } };
    }
    case "ellipse": {
      const rx = Math.min(g.rx, (board.width - 2 * padding) / 2);
      const ry = Math.min(g.ry, (board.height - 2 * padding) / 2);
      return {
        ...shape,
        geometry: {
          ...g,
          rx: Math.max(0.5, rx),
          ry: Math.max(0.5, ry),
          cx: clamp(g.cx, padding + rx, board.width - padding - rx),
          cy: clamp(g.cy, padding + ry, board.height - padding - ry),
        },
      };
    }
    default:
      return shape;
  }
}

export type ConstrainMode = "fit" | "points";

/**
 * Keep a shape on the logical board without changing paint order.
 *
 * - `points`: clamp geometry coordinates into the square (no whole-shape scale /
 *   translate). Use while dragging endpoints/handles so proportions stay natural.
 * - `fit` (default): translate to stay in-bounds; only uniform-scale when the
 *   visual AABB is larger than the board (e.g. oversized rotated rect). Skips
 *   scale for thin/line-like local boxes so stroke clamping cannot warp curves.
 */
export function constrainShapeToBoard(
  shape: WhiteboardShape,
  board: { width: number; height: number } = WHITEBOARD_VIEWBOX,
  options?: { mode?: ConstrainMode },
): WhiteboardShape {
  const mode = options?.mode ?? "fit";
  if (mode === "points") {
    return clampGeometryPointsToBoard(shape, board);
  }

  let next = shape;

  // Oversized transformed AABBs: uniform shrink only when the local box has
  // meaningful width AND height (skip near-degenerate line/curve AABBs).
  for (let i = 0; i < 6; i++) {
    const visual = shapeVisualBounds(next);
    if (visual.width <= board.width && visual.height <= board.height) break;
    const local = shapeBounds(next);
    if (local.width < 1 || local.height < 1) break;
    const ratio = Math.min(
      board.width / Math.max(visual.width, 1),
      board.height / Math.max(visual.height, 1),
    );
    if (!(ratio < 1)) break;
    const newWidth = local.width * ratio * 0.999;
    const newHeight = local.height * ratio * 0.999;
    next = scaleShapeToBox(next, local, {
      x: local.x + (local.width - newWidth) / 2,
      y: local.y + (local.height - newHeight) / 2,
      width: newWidth,
      height: newHeight,
    });
  }

  // Prefer whole-shape translation so relative control points stay intact.
  const visual = shapeVisualBounds(next);
  let dx = 0;
  let dy = 0;
  if (visual.x < 0) dx = -visual.x;
  else if (visual.x + visual.width > board.width) {
    dx = board.width - (visual.x + visual.width);
  }
  if (visual.y < 0) dy = -visual.y;
  else if (visual.y + visual.height > board.height) {
    dy = board.height - (visual.y + visual.height);
  }
  return translateShape(next, dx, dy);
}

/** Extra pad so the multi-select chrome reads larger than single-shape boxes. */
export const GROUP_SELECTION_PAD = SELECTION_PAD + 4;

/** Union of axis-aligned boxes; empty input → null. */
export function unionBounds(boxes: Bounds[]): Bounds | null {
  if (!boxes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Document-space AABB covering every shape's local geometry bounds. */
export function groupShapeBounds(shapes: WhiteboardShape[]): Bounds | null {
  return unionBounds(shapes.map(shapeBounds));
}

/** Padded group selection box (larger chrome than single-shape selection). */
export function groupSelectionBounds(
  shapes: WhiteboardShape[],
  pad = GROUP_SELECTION_PAD,
): Bounds | null {
  const b = groupShapeBounds(shapes);
  if (!b) return null;
  return {
    x: b.x - pad,
    y: b.y - pad,
    width: b.width + pad * 2,
    height: b.height + pad * 2,
  };
}

/** Corner + edge handles on a padded group selection box. */
export function groupSelectionHandles(
  shapes: WhiteboardShape[],
): Record<RectHandle, Point> | null {
  const b = groupSelectionBounds(shapes);
  return b ? rectHandles(b) : null;
}

/** Map a shape box through a group scale (relative positions preserved). */
export function mapBoxThroughGroup(
  shapeBox: Bounds,
  oldGroup: Bounds,
  newGroup: Bounds,
): Bounds {
  const ow = oldGroup.width || 1;
  const oh = oldGroup.height || 1;
  const sx = newGroup.width / ow;
  const sy = newGroup.height / oh;
  return {
    x: newGroup.x + (shapeBox.x - oldGroup.x) * sx,
    y: newGroup.y + (shapeBox.y - oldGroup.y) * sy,
    width: Math.max(1, shapeBox.width * sx),
    height: Math.max(1, shapeBox.height * sy),
  };
}

/**
 * Scale every shape so the group's AABB moves from `oldGroup` → `newGroup`.
 * Geometry stays SVG-ready; callers should still board-clamp as needed.
 */
export function scaleShapesToGroupBox(
  shapes: WhiteboardShape[],
  oldGroup: Bounds,
  newGroup: Bounds,
): WhiteboardShape[] {
  if (oldGroup.width <= 0 || oldGroup.height <= 0) return shapes;
  return shapes.map((shape) => {
    const oldBox = shapeBounds(shape);
    const mapped = mapBoxThroughGroup(oldBox, oldGroup, newGroup);
    let next = scaleShapeToBox(shape, oldBox, mapped);
    const rot = parseRotate(shape.transform);
    if (rot) {
      const nb = shapeBounds(next);
      next = setShapeRotation(
        next,
        { x: nb.x + nb.width / 2, y: nb.y + nb.height / 2 },
        rot.deg,
      );
    }
    return next;
  });
}

/** Padded AABB used for selection overlay and handle hit-testing. */
export function selectionBounds(shape: WhiteboardShape, pad = SELECTION_PAD): Bounds {
  const b = shapeBounds(shape);
  return {
    x: b.x - pad,
    y: b.y - pad,
    width: b.width + pad * 2,
    height: b.height + pad * 2,
  };
}

/** Corner handles on the padded selection box. */
export function selectionCorners(shape: WhiteboardShape): Record<RectCorner, Point> {
  return rectCorners(selectionBounds(shape));
}

/** Rotate handle position (local coords, above selection box). */
export function selectionRotateHandle(shape: WhiteboardShape): Point {
  const b = selectionBounds(shape);
  return { x: b.x + b.width / 2, y: b.y - ROTATE_HANDLE_OFFSET };
}

/** Map a dragged selection-box corner to the corresponding shape AABB. */
export function shapeBoxFromSelectionCorner(
  origShapeBox: Bounds,
  origSelBox: Bounds,
  corner: RectCorner,
  point: Point,
  keepAspect: boolean,
): Bounds {
  return shapeBoxFromSelectionHandle(
    origShapeBox,
    origSelBox,
    corner,
    point,
    keepAspect,
    SELECTION_PAD,
  );
}

/** Map a dragged selection/group handle to the unpadded content AABB. */
export function shapeBoxFromSelectionHandle(
  origShapeBox: Bounds,
  origSelBox: Bounds,
  handle: RectHandle,
  point: Point,
  keepAspect: boolean,
  pad = SELECTION_PAD,
): Bounds {
  const newSel = resizeRectFromHandle(origSelBox, handle, point, keepAspect);
  return {
    x: newSel.x + pad,
    y: newSel.y + pad,
    width: Math.max(1, newSel.width - pad * 2),
    height: Math.max(1, newSel.height - pad * 2),
  };
}

/** Apply rotation around a center, preserving leading translate on fill shapes. */
export function setShapeRotation(
  shape: WhiteboardShape,
  center: Point,
  degrees: number,
): WhiteboardShape {
  const rot = rotateTransform(center.x, center.y, degrees);
  if (shape.geometry.kind === "fill") {
    const tm = /^translate\(([-\d.]+)[,\s]+([-\d.]+)\)\s*(.*)$/.exec(
      (shape.transform || "").trim(),
    );
    if (tm) {
      const rest = tm[3]?.trim() ?? "";
      return {
        ...shape,
        transform: composeTransforms(`translate(${tm[1]} ${tm[2]})`, rot, rest),
      };
    }
  }
  return { ...shape, transform: rot };
}

/** Scale a shape's geometry to fit a new bounding box (used for bbox-corner resize on bezier/arrow/fill). */
export function scaleShapeToBox(
  shape: WhiteboardShape,
  oldBox: Bounds,
  newBox: Bounds,
): WhiteboardShape {
  const ow = oldBox.width || 1;
  const oh = oldBox.height || 1;
  const sx = newBox.width / ow;
  const sy = newBox.height / oh;

  function mapPt(p: Point): Point {
    return {
      x: newBox.x + (p.x - oldBox.x) * sx,
      y: newBox.y + (p.y - oldBox.y) * sy,
    };
  }

  const g = shape.geometry;
  switch (g.kind) {
    case "bezier":
      return {
        ...shape,
        geometry: {
          ...g,
          start: mapPt(g.start),
          end: mapPt(g.end),
          cp1: mapPt(g.cp1),
          cp2: mapPt(g.cp2),
        },
      };
    case "arrow":
      return {
        ...shape,
        geometry: { ...g, start: mapPt(g.start), end: mapPt(g.end) },
      };
    case "rectangle":
      return {
        ...shape,
        geometry: {
          kind: "rectangle",
          x: newBox.x,
          y: newBox.y,
          width: newBox.width,
          height: newBox.height,
        },
      };
    case "ellipse":
      return {
        ...shape,
        geometry: {
          kind: "ellipse",
          cx: newBox.x + newBox.width / 2,
          cy: newBox.y + newBox.height / 2,
          rx: Math.max(0.5, newBox.width / 2),
          ry: Math.max(0.5, newBox.height / 2),
        },
      };
    case "fill": {
      const sx = newBox.width / ow;
      const sy = newBox.height / oh;
      const scalePart = composeTransforms(
        `translate(${newBox.x} ${newBox.y})`,
        `scale(${sx} ${sy})`,
        `translate(${-oldBox.x} ${-oldBox.y})`,
      );
      const tm = /^translate\(([-\d.]+)[,\s]+([-\d.]+)\)\s*(.*)$/.exec(
        (shape.transform || "").trim(),
      );
      if (tm) {
        const rest = tm[3]?.trim() ?? "";
        return {
          ...shape,
          transform: composeTransforms(`translate(${tm[1]} ${tm[2]})`, scalePart, rest),
        };
      }
      return { ...shape, transform: scalePart };
    }
    default:
      return shape;
  }
}

export function cloneShape(shape: WhiteboardShape): WhiteboardShape {
  return structuredClone(shape);
}

export function cloneShapes(shapes: WhiteboardShape[]): WhiteboardShape[] {
  return shapes.map(cloneShape);
}

/** Snap a scalar to the nearest grid intersection. */
export function snapCoord(n: number, grid: number = GRID_SIZE): number {
  if (grid <= 0) return n;
  return Math.round(n / grid) * grid;
}

/** Snap a point to the grid. */
export function snapPoint(p: Point, grid: number = GRID_SIZE): Point {
  return { x: snapCoord(p.x, grid), y: snapCoord(p.y, grid) };
}

/**
 * Snap a coordinate when within `threshold` of a grid line; otherwise leave it.
 * Default threshold is half the grid step (magnetic snap).
 */
export function maybeSnapCoord(
  n: number,
  enabled: boolean,
  grid: number = GRID_SIZE,
  threshold?: number,
): number {
  if (!enabled || grid <= 0) return n;
  const snapped = snapCoord(n, grid);
  const thr = threshold ?? grid / 2;
  return Math.abs(snapped - n) <= thr ? snapped : n;
}

/**
 * Snap a point when enabled and near the grid; otherwise return the original.
 * Uses per-axis magnetic snap within half a grid cell by default.
 */
export function maybeSnapPoint(
  p: Point,
  enabled: boolean,
  grid: number = GRID_SIZE,
  threshold?: number,
): Point {
  if (!enabled) return p;
  return {
    x: maybeSnapCoord(p.x, true, grid, threshold),
    y: maybeSnapCoord(p.y, true, grid, threshold),
  };
}
