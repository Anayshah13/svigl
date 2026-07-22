import { WHITEBOARD_VIEWBOX } from "./types";

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.15;

export interface ViewportState {
  /** Board-space origin of the current viewBox. */
  panX: number;
  panY: number;
  /** Scale relative to fit-all (1 = full 800×800). */
  zoom: number;
}

export const FIT_VIEWPORT: ViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function viewBoxSize(zoom: number): { w: number; h: number } {
  const z = clampZoom(zoom);
  return {
    w: WHITEBOARD_VIEWBOX.width / z,
    h: WHITEBOARD_VIEWBOX.height / z,
  };
}

/**
 * Keep the visible viewBox inside the 800×800 board.
 * When zoomed in (view < board): pan stays in [0, board − view].
 * When zoomed out (view ≥ board): pan is centered so the board stays framed.
 */
export function clampViewport(v: ViewportState): ViewportState {
  const zoom = clampZoom(v.zoom);
  const { w, h } = viewBoxSize(zoom);
  const boardW = WHITEBOARD_VIEWBOX.width;
  const boardH = WHITEBOARD_VIEWBOX.height;

  let panX: number;
  let panY: number;
  if (w >= boardW) {
    panX = (boardW - w) / 2;
  } else {
    panX = Math.min(Math.max(v.panX, 0), boardW - w);
  }
  if (h >= boardH) {
    panY = (boardH - h) / 2;
  } else {
    panY = Math.min(Math.max(v.panY, 0), boardH - h);
  }

  return { zoom, panX, panY };
}

/** Zoom toward a fractional position inside the SVG element (0–1). */
export function zoomToward(
  current: ViewportState,
  nextZoom: number,
  fx: number,
  fy: number,
): ViewportState {
  const zoom = clampZoom(nextZoom);
  const cur = viewBoxSize(current.zoom);
  const next = viewBoxSize(zoom);
  const boardX = current.panX + fx * cur.w;
  const boardY = current.panY + fy * cur.h;
  return clampViewport({
    zoom,
    panX: boardX - fx * next.w,
    panY: boardY - fy * next.h,
  });
}

export function panBy(
  current: ViewportState,
  dxBoard: number,
  dyBoard: number,
): ViewportState {
  return clampViewport({
    ...current,
    panX: current.panX - dxBoard,
    panY: current.panY - dyBoard,
  });
}

export function viewBoxString(v: ViewportState): string {
  const clamped = clampViewport(v);
  const { w, h } = viewBoxSize(clamped.zoom);
  return `${clamped.panX} ${clamped.panY} ${w} ${h}`;
}
