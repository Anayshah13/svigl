/**
 * Serialize whiteboard shapes to standalone SVG markup.
 *
 * Extracted from `WhiteboardCanvas` so both the flood-fill rasterizer and
 * off-canvas snapshot consumers render from one source of truth.
 */

import {
  arrowHeadPoints,
  arrowHeadSize,
  arrowShaftEnd,
} from "./geometry";
import { WHITEBOARD_VIEWBOX, type WhiteboardShape } from "./types";

export function shapesToSvgMarkup(shapes: WhiteboardShape[]): string {
  const { width, height } = WHITEBOARD_VIEWBOX;
  const body = shapes
    .map((s) => {
      const t = s.transform ? ` transform="${s.transform}"` : "";
      switch (s.geometry.kind) {
        case "bezier": {
          const g = s.geometry;
          return `<path d="M ${g.start.x} ${g.start.y} C ${g.cp1.x} ${g.cp1.y} ${g.cp2.x} ${g.cp2.y} ${g.end.x} ${g.end.y}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round"${t}/>`;
        }
        case "rectangle": {
          const g = s.geometry;
          return `<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="${s.fill}"${t}/>`;
        }
        case "ellipse": {
          const g = s.geometry;
          return `<ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="${s.fill}"${t}/>`;
        }
        case "arrow": {
          const g = s.geometry;
          const headSize = arrowHeadSize(s.strokeWidth);
          const shaft = arrowShaftEnd(g.start, g.end, headSize);
          const head = arrowHeadPoints(g.start, g.end, headSize);
          return `<g${t}><line x1="${g.start.x}" y1="${g.start.y}" x2="${shaft.x}" y2="${shaft.y}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round"/><polyline points="${head}" fill="none" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
        }
        case "fill": {
          const d = s.geometry.d;
          if (typeof d !== "string" || !/^[Mm]/.test(d.trim())) return "";
          return `<path d="${d}" fill="${s.fill === "none" ? s.stroke : s.fill}" fill-rule="evenodd" stroke="none"${t}/>`;
        }
        case "pencil": {
          const d = s.geometry.d;
          if (typeof d !== "string" || !/^[Mm]/.test(d.trim())) return "";
          return `<path d="${d}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${t}/>`;
        }
        default:
          return "";
      }
    })
    .join("");

  // crispEdges hardens stroke barriers for flood-fill rasterization (less AA leak).
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}
