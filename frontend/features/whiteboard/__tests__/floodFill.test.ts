import { describe, expect, it } from "vitest";
import { floodFillMask, maskToPath } from "../floodFill";

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
    expect(d.endsWith("Z")).toBe(true);
  });

  it("returns empty for empty mask", () => {
    expect(maskToPath(new Uint8Array(4), 2, 2)).toBe("");
  });
});
