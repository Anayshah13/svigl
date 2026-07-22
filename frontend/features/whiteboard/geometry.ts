import type { Point, WhiteboardShape } from "./types";

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

/** Default cubic control points along the chord (1/3, 2/3). */
export function defaultBezierHandles(start: Point, end: Point): { cp1: Point; cp2: Point } {
  return {
    cp1: {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3,
    },
    cp2: {
      x: start.x + ((end.x - start.x) * 2) / 3,
      y: start.y + ((end.y - start.y) * 2) / 3,
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
  let x0 = g.x;
  let y0 = g.y;
  let x1 = g.x + g.width;
  let y1 = g.y + g.height;
  if (corner === "nw") {
    x0 = point.x;
    y0 = point.y;
  } else if (corner === "ne") {
    x1 = point.x;
    y0 = point.y;
  } else if (corner === "sw") {
    x0 = point.x;
    y1 = point.y;
  } else {
    x1 = point.x;
    y1 = point.y;
  }
  return normalizeRect(x0, y0, x1, y1, keepSquare);
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
  const newSel = resizeRectFromCorner(origSelBox, corner, point, keepAspect);
  const pad = SELECTION_PAD;
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
