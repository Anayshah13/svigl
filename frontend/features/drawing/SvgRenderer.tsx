// The renderer is the ONLY component that converts shapes into SVG markup
// (docs/drawing_model.md). The rest of the app deals exclusively with the
// document model.
//
// forwardRef + children allow DrawingCanvas to inject pointer handlers and
// ephemeral preview elements without duplicating the SVG layout logic.

import * as React from "react";
import {
  CANVAS_VIEWBOX,
  type DrawingDocument,
  type PathGeometry,
  type Shape,
  type Style,
} from "@/types/drawing";
import { pathDFromNodes } from "./pathUtils";

function strokeProps(style: Style): React.SVGAttributes<SVGElement> {
  return {
    stroke: style.strokeColor,
    strokeWidth: style.strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: style.fillColor,
    opacity: style.opacity,
  };
}

function ShapeNode({ shape }: { shape: Shape }) {
  const s = strokeProps(shape.style);
  switch (shape.type) {
    case "rectangle":
      return (
        <rect
          x={shape.geometry.x}
          y={shape.geometry.y}
          width={shape.geometry.width}
          height={shape.geometry.height}
          {...s}
        />
      );
    case "circle":
      return (
        <circle
          cx={shape.geometry.cx}
          cy={shape.geometry.cy}
          r={shape.geometry.radius}
          {...s}
        />
      );
    case "path":
      return (
        <path d={pathDFromNodes((shape.geometry as PathGeometry).nodes)} {...s} />
      );
  }
}

export interface SvgRendererProps {
  document: DrawingDocument | null;
  className?: string;
  style?: React.CSSProperties;
  /** Preview shapes / overlay elements injected by DrawingCanvas. */
  children?: React.ReactNode;
  onPointerDown?: React.PointerEventHandler<SVGSVGElement>;
  onPointerMove?: React.PointerEventHandler<SVGSVGElement>;
  onPointerUp?: React.PointerEventHandler<SVGSVGElement>;
  onPointerLeave?: React.PointerEventHandler<SVGSVGElement>;
  onPointerCancel?: React.PointerEventHandler<SVGSVGElement>;
}

export const SvgRenderer = React.forwardRef<SVGSVGElement, SvgRendererProps>(
  function SvgRenderer(
    {
      document,
      className,
      style,
      children,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
    ref,
  ) {
    const { width, height } = CANVAS_VIEWBOX;
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        style={style}
        role="img"
        aria-label="Drawing canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
      >
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
        {document?.shapes.map((shape) => (
          <ShapeNode key={shape.id} shape={shape} />
        ))}
        {/* Preview / overlay layer — rendered on top of committed shapes */}
        {children}
      </svg>
    );
  },
);
