export const CORPUS_WORDS = [
  "cat",
  "dog",
  "fish",
  "bird",
  "house",
  "car",
  "tree",
  "apple",
  "cup",
  "hat",
  "star",
  "moon",
  "chair",
  "shoe",
  "flower",
  "pizza",
  "clock",
  "key",
  "boat",
  "sun",
  "guitar",
  "book",
  "ice cream",
  "bicycle",
] as const;

export const LIVE_WORDS = ["ice cream", "chair", "shoe", "moon", "bird", "key"] as const;

/** Quick, Draw! simplified stroke: [xs[], ys[]]. */
export type Stroke = [number[], number[]];

export type QuickDrawSample = {
  word: string;
  key_id: string;
  recognized: boolean;
  countrycode: string | null;
  drawing: Stroke[];
};

export const DATASET_REPO = "https://github.com/googlecreativelab/quickdraw-dataset";

export function strokesToPath(drawing: Stroke[]): string {
  return drawing
    .map(([xs, ys]) => {
      if (!xs.length) return "";
      return xs.map((x, i) => `${i === 0 ? "M" : "L"}${x} ${ys[i] ?? x}`).join(" ");
    })
    .filter(Boolean)
    .join(" ");
}

export function rasterizeStrokes(drawing: Stroke[], size = 256): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not rasterize Quick, Draw! strokes.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const scale = size / 256;
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = Math.max(2, 2.6 * scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [xs, ys] of drawing) {
    if (!xs.length) continue;
    ctx.beginPath();
    xs.forEach((x, i) => {
      const px = x * scale;
      const py = (ys[i] ?? x) * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}
