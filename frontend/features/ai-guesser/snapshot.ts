/**
 * Render the whiteboard to a small PNG for the model.
 *
 * Reuses `shapesToSvgMarkup` (the same serializer the flood-fill bucket uses)
 * so the snapshot is always the drawing itself — never a screenshot of the
 * page, and never any surrounding UI.
 */

import { shapesToSvgMarkup } from "@/features/whiteboard/svgMarkup";
import type { WhiteboardShape } from "@/features/whiteboard/types";
import type { DrawingSnapshot } from "./types";

const MIME_TYPE = "image/png";

async function loadSvgImage(svgMarkup: string): Promise<HTMLImageElement> {
  // Data URLs first — Safari is stricter about blob: SVG -> canvas.
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
        image.onerror = () =>
          reject(new Error("Failed to rasterize drawing snapshot"));
        image.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/**
 * Board is a square 800x800 viewBox, so a square target preserves proportions
 * with no letterboxing.
 */
export async function renderDrawingSnapshot(
  shapes: WhiteboardShape[],
  size: number,
): Promise<DrawingSnapshot | null> {
  if (shapes.length === 0) return null;
  if (typeof document === "undefined") return null;

  const markup = shapesToSvgMarkup(shapes);
  const image = await loadSvgImage(markup);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable for drawing snapshot");

  // Explicit light background: the model should never receive transparency.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, 0, 0, size, size);

  const dataUrl = canvas.toDataURL(MIME_TYPE);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!base64) throw new Error("Failed to encode drawing snapshot");

  return { base64, mimeType: MIME_TYPE, width: size, height: size };
}
