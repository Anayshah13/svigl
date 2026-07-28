/**
 * Imperative SVG rendering for replay.
 *
 * Mirrors ShapeRenderer / ShapeNode geometry but writes directly into a
 * `<g>` so large timelines never thrash React.
 */

import {
  arrowHeadPoints,
  arrowHeadSize,
  arrowShaftEnd,
  bezierPathD,
} from "@/features/whiteboard/geometry";
import type { WhiteboardShape } from "@/features/whiteboard/types";

const SVG_NS = "http://www.w3.org/2000/svg";

function setStrokeAttrs(
  el: SVGElement,
  shape: WhiteboardShape,
  fillOverride?: string,
): void {
  el.setAttribute("stroke", shape.stroke);
  el.setAttribute("stroke-width", String(shape.strokeWidth));
  el.setAttribute("fill", fillOverride ?? shape.fill);
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  if (shape.transform) el.setAttribute("transform", shape.transform);
  else el.removeAttribute("transform");
}

function createShapeElement(shape: WhiteboardShape): SVGElement | null {
  const g = shape.geometry;

  switch (g.kind) {
    case "bezier": {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", bezierPathD(g.start, g.cp1, g.cp2, g.end));
      setStrokeAttrs(path, shape, "none");
      return path;
    }
    case "rectangle": {
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(g.x));
      rect.setAttribute("y", String(g.y));
      rect.setAttribute("width", String(g.width));
      rect.setAttribute("height", String(g.height));
      setStrokeAttrs(rect, shape);
      return rect;
    }
    case "ellipse": {
      const ellipse = document.createElementNS(SVG_NS, "ellipse");
      ellipse.setAttribute("cx", String(g.cx));
      ellipse.setAttribute("cy", String(g.cy));
      ellipse.setAttribute("rx", String(g.rx));
      ellipse.setAttribute("ry", String(g.ry));
      setStrokeAttrs(ellipse, shape);
      return ellipse;
    }
    case "arrow": {
      const group = document.createElementNS(SVG_NS, "g");
      if (shape.transform) group.setAttribute("transform", shape.transform);
      const headSize = arrowHeadSize(shape.strokeWidth);
      const shaft = arrowShaftEnd(g.start, g.end, headSize);
      const head = arrowHeadPoints(g.start, g.end, headSize);

      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(g.start.x));
      line.setAttribute("y1", String(g.start.y));
      line.setAttribute("x2", String(shaft.x));
      line.setAttribute("y2", String(shaft.y));
      line.setAttribute("stroke", shape.stroke);
      line.setAttribute("stroke-width", String(shape.strokeWidth));
      line.setAttribute("stroke-linecap", "round");

      const poly = document.createElementNS(SVG_NS, "polyline");
      poly.setAttribute("points", head);
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", shape.stroke);
      poly.setAttribute("stroke-width", String(shape.strokeWidth));
      poly.setAttribute("stroke-linecap", "round");
      poly.setAttribute("stroke-linejoin", "round");

      group.appendChild(line);
      group.appendChild(poly);
      return group;
    }
    case "fill": {
      if (typeof g.d !== "string" || !/^[Mm]/.test(g.d.trim())) return null;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", g.d);
      path.setAttribute(
        "fill",
        shape.fill === "none" ? shape.stroke : shape.fill,
      );
      path.setAttribute("fill-rule", "evenodd");
      path.setAttribute("stroke", "none");
      if (shape.transform) path.setAttribute("transform", shape.transform);
      return path;
    }
    case "pencil": {
      if (typeof g.d !== "string" || !/^[Mm]/.test(g.d.trim())) return null;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", g.d);
      path.setAttribute("stroke", shape.stroke);
      path.setAttribute("stroke-width", String(shape.strokeWidth));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      if (shape.transform) path.setAttribute("transform", shape.transform);
      return path;
    }
    default:
      return null;
  }
}

/** Replace children of `layer` with SVG nodes for `shapes` (z-order preserved). */
export function renderShapesToLayer(
  layer: SVGGElement,
  shapes: readonly WhiteboardShape[],
): void {
  while (layer.firstChild) layer.removeChild(layer.firstChild);
  for (const shape of shapes) {
    const el = createShapeElement(shape);
    if (el) {
      el.setAttribute("data-shape-id", shape.id);
      layer.appendChild(el);
    }
  }
}
