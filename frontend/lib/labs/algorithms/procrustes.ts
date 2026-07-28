import type { Vec2 } from "../types";
import { rmsFromOrigin } from "../utils/math";

/**
 * Ordinary Procrustes Analysis — labs.md §8.3.
 * Aligns centered, unit-RMS shape X to reference Y via optimal rotation
 * from the SVD of the 2×2 cross-covariance C = Yᵀ X.
 */
export function ordinaryProcrustes(
  X: Vec2[],
  Y: Vec2[],
): {
  rotated: Vec2[];
  /** Mean point-to-point Euclidean residual after alignment. */
  meanDistance: number;
  /** RMS of residuals (primary Procrustes error). */
  rmsDistance: number;
  rotation: [[number, number], [number, number]];
} {
  const n = Math.min(X.length, Y.length);
  if (n === 0) {
    return {
      rotated: [],
      meanDistance: Infinity,
      rmsDistance: Infinity,
      rotation: [
        [1, 0],
        [0, 1],
      ],
    };
  }

  // Cross-covariance C = Yᵀ X (2×2).
  let c00 = 0;
  let c01 = 0;
  let c10 = 0;
  let c11 = 0;
  for (let i = 0; i < n; i++) {
    const x = X[i]!;
    const y = Y[i]!;
    c00 += y.x * x.x;
    c01 += y.x * x.y;
    c10 += y.y * x.x;
    c11 += y.y * x.y;
  }

  const { U, V } = svd2x2([
    [c00, c01],
    [c10, c11],
  ]);

  // R = U Vᵀ; if det(R) < 0, flip to forbid reflection.
  let R = matMul2(U, transpose2(V));
  if (det2(R) < 0) {
    U[0]![1] *= -1;
    U[1]![1] *= -1;
    R = matMul2(U, transpose2(V));
  }

  // X' = X Rᵀ  (row vectors).
  const Rt = transpose2(R);
  const rotated: Vec2[] = new Array(n);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const x = X[i]!;
    const y = Y[i]!;
    const xr = x.x * Rt[0]![0]! + x.y * Rt[1]![0]!;
    const yr = x.x * Rt[0]![1]! + x.y * Rt[1]![1]!;
    rotated[i] = { x: xr, y: yr };
    const d = Math.hypot(y.x - xr, y.y - yr);
    sum += d;
    sumSq += d * d;
  }

  return {
    rotated,
    meanDistance: sum / n,
    rmsDistance: Math.sqrt(sumSq / n),
    rotation: R as [[number, number], [number, number]],
  };
}

/** Ensure a point set has RMS distance 1 from origin (already centered). */
export function scaleToUnitRms(points: Vec2[]): Vec2[] {
  const s = rmsFromOrigin(points);
  if (s < 1e-12) return points.map((p) => ({ ...p }));
  return points.map((p) => ({ x: p.x / s, y: p.y / s }));
}

function det2(m: number[][]): number {
  return m[0]![0]! * m[1]![1]! - m[0]![1]! * m[1]![0]!;
}

function transpose2(m: number[][]): number[][] {
  return [
    [m[0]![0]!, m[1]![0]!],
    [m[0]![1]!, m[1]![1]!],
  ];
}

function matMul2(a: number[][], b: number[][]): number[][] {
  return [
    [
      a[0]![0]! * b[0]![0]! + a[0]![1]! * b[1]![0]!,
      a[0]![0]! * b[0]![1]! + a[0]![1]! * b[1]![1]!,
    ],
    [
      a[1]![0]! * b[0]![0]! + a[1]![1]! * b[1]![0]!,
      a[1]![0]! * b[0]![1]! + a[1]![1]! * b[1]![1]!,
    ],
  ];
}

/**
 * Closed-form SVD for a real 2×2 matrix.
 * Returns U, Σ (as diagonal entries), V such that A = U Σ Vᵀ.
 */
function svd2x2(A: number[][]): { U: number[][]; S: [number, number]; V: number[][] } {
  const a = A[0]![0]!;
  const b = A[0]![1]!;
  const c = A[1]![0]!;
  const d = A[1]![1]!;

  // Eigen-decomposition of AᵀA for V.
  const ata00 = a * a + c * c;
  const ata01 = a * b + c * d;
  const ata11 = b * b + d * d;

  const { vectors: V, values } = eigenSym2(ata00, ata01, ata11);
  const s0 = Math.sqrt(Math.max(0, values[0]!));
  const s1 = Math.sqrt(Math.max(0, values[1]!));

  // U columns = A v_i / σ_i
  const U: number[][] = [
    [0, 0],
    [0, 0],
  ];
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? s0 : s1;
    const vx = V[0]![i]!;
    const vy = V[1]![i]!;
    let ux = a * vx + b * vy;
    let uy = c * vx + d * vy;
    if (s > 1e-12) {
      ux /= s;
      uy /= s;
    } else {
      // Orthonormal fallback.
      ux = i === 0 ? 1 : 0;
      uy = i === 0 ? 0 : 1;
    }
    U[0]![i] = ux;
    U[1]![i] = uy;
  }

  // Ensure U is a proper rotation/reflection basis (orthonormalize col1).
  const dot = U[0]![0]! * U[0]![1]! + U[1]![0]! * U[1]![1]!;
  U[0]![1]! -= dot * U[0]![0]!;
  U[1]![1]! -= dot * U[1]![0]!;
  const n1 = Math.hypot(U[0]![1]!, U[1]![1]!);
  if (n1 > 1e-12) {
    U[0]![1]! /= n1;
    U[1]![1]! /= n1;
  }

  return { U, S: [s0, s1], V };
}

function eigenSym2(
  a: number,
  b: number,
  c: number,
): { values: [number, number]; vectors: number[][] } {
  // [[a,b],[b,c]] symmetric eigen.
  const tr = a + c;
  const det = a * c - b * b;
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l0 = tr / 2 + disc;
  const l1 = tr / 2 - disc;

  const vecFor = (lambda: number): [number, number] => {
    // (a−λ)x + b y = 0
    if (Math.abs(b) > 1e-12 || Math.abs(a - lambda) > 1e-12) {
      let x = b;
      let y = lambda - a;
      if (Math.abs(x) + Math.abs(y) < 1e-12) {
        x = lambda - c;
        y = b;
      }
      const n = Math.hypot(x, y) || 1;
      return [x / n, y / n];
    }
    return [1, 0];
  };

  const v0 = vecFor(l0);
  let v1 = vecFor(l1);
  // Force orthonormal.
  const d = v0[0] * v1[0] + v0[1] * v1[1];
  v1 = [v1[0] - d * v0[0], v1[1] - d * v0[1]];
  const n1 = Math.hypot(v1[0], v1[1]) || 1;
  v1 = [v1[0] / n1, v1[1] / n1];

  return {
    values: [l0, l1],
    vectors: [
      [v0[0], v1[0]],
      [v0[1], v1[1]],
    ],
  };
}
