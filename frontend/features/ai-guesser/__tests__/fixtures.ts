import type { WhiteboardShape } from "@/features/whiteboard/types";

/** Build a pencil shape from a polyline, matching the real `d` convention. */
export function pencil(
  id: string,
  points: readonly (readonly [number, number])[],
): WhiteboardShape {
  const d = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  return {
    id,
    tool: "pencil",
    stroke: "#000000",
    fill: "none",
    strokeWidth: 5,
    transform: "",
    geometry: { kind: "pencil", d },
    createdBy: "test",
    createdAt: 0,
  };
}

/** A long L-shaped stroke: length ~600, bbox 100..400 on both axes. */
export const BASE_STROKE = pencil("a", [
  [100, 100],
  [400, 100],
  [400, 400],
]);

/** Same stroke nudged 10 units further — a deliberately tiny change. */
export const TINY_EXTENSION = pencil("a", [
  [100, 100],
  [400, 100],
  [400, 410],
]);

/**
 * A stroke that fits entirely inside BASE_STROKE's bounding box, so it adds a
 * shape without any bbox growth — a moderate change rather than a dramatic one.
 */
export const INNER_STROKE = pencil("inner", [
  [150, 150],
  [250, 200],
]);

export const SECOND_STROKE = pencil("b", [
  [120, 500],
  [300, 520],
  [320, 600],
]);

export const THIRD_STROKE = pencil("c", [
  [500, 120],
  [640, 260],
  [520, 300],
]);

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let queued microtasks and the renderSnapshot promise settle. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
