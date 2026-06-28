// Path geometry helpers — node smoothing and SVG `d` generation (docs/drawing_model.md).

import type { PathNode, PathShape, Style } from "@/types/drawing";

export function pathDFromNodes(nodes: PathNode[]): string {
  if (nodes.length === 0) return "";
  const parts: string[] = [`M ${nodes[0].position.x} ${nodes[0].position.y}`];
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const c1 = prev.outgoingHandle;
    const c2 = curr.incomingHandle;
    if (c1 && c2) {
      parts.push(
        `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${curr.position.x} ${curr.position.y}`,
      );
    } else if (c1 || c2) {
      const h = (c1 ?? c2) as { x: number; y: number };
      parts.push(`Q ${h.x} ${h.y} ${curr.position.x} ${curr.position.y}`);
    } else {
      parts.push(`L ${curr.position.x} ${curr.position.y}`);
    }
  }
  return parts.join(" ");
}

export function makePathNode(x: number, y: number): PathNode {
  return {
    id: `n-${Math.random().toString(36).slice(2, 8)}`,
    position: { x, y },
    incomingHandle: null,
    outgoingHandle: null,
  };
}

/** Assign Bézier handles so freehand strokes render as smooth curves. */
export function smoothPathNodes(nodes: PathNode[]): PathNode[] {
  if (nodes.length <= 2) {
    return nodes.map((n) => ({ ...n, incomingHandle: null, outgoingHandle: null }));
  }
  const tension = 1 / 6;
  return nodes.map((node, i) => {
    if (i === 0) {
      const next = nodes[i + 1].position;
      return {
        ...node,
        incomingHandle: null,
        outgoingHandle: {
          x: node.position.x + (next.x - node.position.x) * tension * 2,
          y: node.position.y + (next.y - node.position.y) * tension * 2,
        },
      };
    }
    if (i === nodes.length - 1) {
      const prev = nodes[i - 1].position;
      return {
        ...node,
        incomingHandle: {
          x: node.position.x + (prev.x - node.position.x) * tension * 2,
          y: node.position.y + (prev.y - node.position.y) * tension * 2,
        },
        outgoingHandle: null,
      };
    }
    const prev = nodes[i - 1].position;
    const next = nodes[i + 1].position;
    return {
      ...node,
      incomingHandle: {
        x: node.position.x - (next.x - prev.x) * tension,
        y: node.position.y - (next.y - prev.y) * tension,
      },
      outgoingHandle: {
        x: node.position.x + (next.x - prev.x) * tension,
        y: node.position.y + (next.y - prev.y) * tension,
      },
    };
  });
}

export function pathLength(nodes: PathNode[]): number {
  let len = 0;
  for (let i = 1; i < nodes.length; i++) {
    len += Math.hypot(
      nodes[i].position.x - nodes[i - 1].position.x,
      nodes[i].position.y - nodes[i - 1].position.y,
    );
  }
  return len;
}

export function buildPathShape(
  id: string,
  nodes: PathNode[],
  createdBy: string,
  style: Style,
): PathShape {
  const now = Date.now();
  return {
    id,
    type: "path",
    geometry: { nodes: smoothPathNodes(nodes) },
    style,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}
