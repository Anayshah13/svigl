import { describe, expect, it } from "vitest";
import {
  floodFillMask,
  markExterior,
  maskToPath,
  growMaskIntoFringe,
} from "../floodFill";

function solidImage(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return { width, height, data, colorSpace: "srgb" } as ImageData;
}

function withBarrier(): ImageData {
  // 8x8 white with a vertical black wall at x=4
  const img = solidImage(8, 8, [255, 255, 255, 255]);
  for (let y = 0; y < 8; y++) {
    const i = (y * 8 + 4) * 4;
    img.data[i] = 0;
    img.data[i + 1] = 0;
    img.data[i + 2] = 0;
    img.data[i + 3] = 255;
  }
  return img;
}

/** White board with a filled ring (outer rect frame + inner hollow). */
function annulusMask(width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  const inset = 2;
  const holeInset = 5;
  for (let y = inset; y < height - inset; y++) {
    for (let x = inset; x < width - inset; x++) {
      const inHole =
        x >= holeInset &&
        x < width - holeInset &&
        y >= holeInset &&
        y < height - holeInset;
      if (!inHole) mask[y * width + x] = 1;
    }
  }
  return mask;
}

describe("floodFillMask", () => {
  it("fills a uniform region", () => {
    const img = solidImage(4, 4, [255, 255, 255, 255]);
    const { count, mask } = floodFillMask(img, 1, 1, 0);
    expect(count).toBe(16);
    expect(mask.every((v) => v === 1)).toBe(true);
  });

  it("stops at color barrier within tolerance", () => {
    const img = withBarrier();
    const { count, mask } = floodFillMask(img, 1, 1, 10);
    expect(count).toBe(32); // left half 4 cols? wall at x=4 → cols 0-3 = 32
    expect(mask[4]).toBe(0); // wall pixel
    expect(mask[5]).toBe(0); // right side unfilled
  });

  it("returns empty for out-of-bounds seed", () => {
    const img = solidImage(2, 2, [0, 0, 0, 255]);
    expect(floodFillMask(img, -1, 0, 0).count).toBe(0);
  });
});

describe("markExterior", () => {
  it("does not mark enclosed holes as exterior", () => {
    const width = 16;
    const height = 16;
    const mask = annulusMask(width, height);
    const exterior = markExterior(mask, width, height);

    // Corner of the board is exterior
    expect(exterior[0]).toBe(1);
    // Center of the hole is not exterior
    const cx = 8;
    const cy = 8;
    expect(mask[cy * width + cx]).toBe(0);
    expect(exterior[cy * width + cx]).toBe(0);
  });
});

describe("maskToPath", () => {
  it("traces a filled blob into a closed path", () => {
    const mask = new Uint8Array(16);
    // 2x2 block in corner of 4x4
    mask[0] = 1;
    mask[1] = 1;
    mask[4] = 1;
    mask[5] = 1;
    const d = maskToPath(mask, 4, 4);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.includes("Z")).toBe(true);
  });

  it("returns empty for empty mask", () => {
    expect(maskToPath(new Uint8Array(4), 2, 2)).toBe("");
  });

  it("emits a hole subpath for an annulus so evenodd leaves the center empty", () => {
    const width = 16;
    const height = 16;
    const mask = annulusMask(width, height);
    const d = maskToPath(mask, width, height);

    // Compound path: outer close + hole close
    const closes = d.match(/Z/g) ?? [];
    expect(closes.length).toBeGreaterThanOrEqual(2);
    expect((d.match(/M /g) ?? []).length).toBeGreaterThanOrEqual(2);

    // Hole contour should sit near the inner inset (around 5–6)
    expect(d).toMatch(/M (5\.5|6\.5)/);
  });
});

describe("growMaskIntoFringe", () => {
  it("expands into near-seed fringe but not across hard barriers", () => {
    const img = solidImage(5, 5, [255, 255, 255, 255]);
    // gray fringe at (2,2), black barrier at (3,2)
    const fringe = (2 * 5 + 2) * 4;
    img.data[fringe] = 200;
    img.data[fringe + 1] = 200;
    img.data[fringe + 2] = 200;
    const barrier = (2 * 5 + 3) * 4;
    img.data[barrier] = 0;
    img.data[barrier + 1] = 0;
    img.data[barrier + 2] = 0;

    const mask = new Uint8Array(25);
    mask[2 * 5 + 1] = 1; // filled left of fringe

    const grown = growMaskIntoFringe(mask, img, [255, 255, 255, 255], 80);
    expect(grown).toBeGreaterThan(0);
    expect(mask[2 * 5 + 2]).toBe(1); // fringe absorbed
    expect(mask[2 * 5 + 3]).toBe(0); // barrier untouched
  });
});
