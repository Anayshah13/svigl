import { describe, expect, it } from "vitest";
import {
  clampViewport,
  clampZoom,
  FIT_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  viewBoxString,
  zoomToward,
} from "../viewport";

describe("viewport", () => {
  it("clamps zoom to configured bounds", () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(1)).toBe(1);
  });

  it("zooms toward a fractional focal point", () => {
    const next = zoomToward(FIT_VIEWPORT, 2, 0.5, 0.5);
    expect(next.zoom).toBe(2);
    // Center stays centered → pan shifts by quarter board.
    expect(next.panX).toBeCloseTo(200);
    expect(next.panY).toBeCloseTo(200);
    expect(viewBoxString(next)).toBe("200 200 400 400");
  });

  it("does not pan past board edges at fit zoom", () => {
    const next = panBy(FIT_VIEWPORT, 40, -10);
    expect(next.panX).toBe(0);
    expect(next.panY).toBe(0);
  });

  it("clamps pan so the view stays inside the board when zoomed in", () => {
    const zoomed = zoomToward(FIT_VIEWPORT, 2, 0.5, 0.5);
    // View is 400×400; max pan is 400.
    const pastRight = panBy(zoomed, -999, 0);
    expect(pastRight.panX).toBeCloseTo(400);
    expect(pastRight.panY).toBeCloseTo(200);

    const pastTopLeft = panBy(zoomed, 999, 999);
    expect(pastTopLeft.panX).toBe(0);
    expect(pastTopLeft.panY).toBe(0);
  });

  it("centers pan when zoomed out past fit", () => {
    const out = clampViewport({ panX: -200, panY: 50, zoom: 0.5 });
    // View is 1600×1600; center offset is (800-1600)/2 = -400.
    expect(out.panX).toBeCloseTo(-400);
    expect(out.panY).toBeCloseTo(-400);
  });

  it("clamps zoom-to-cursor result into board bounds", () => {
    // Zoom toward top-left corner would otherwise push pan negative.
    const next = zoomToward(FIT_VIEWPORT, 2, 0, 0);
    expect(next.zoom).toBe(2);
    expect(next.panX).toBe(0);
    expect(next.panY).toBe(0);
  });
});
