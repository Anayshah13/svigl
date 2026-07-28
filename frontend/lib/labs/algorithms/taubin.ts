import type { Vec2 } from "../types";
import { circleRmse } from "../metrics/circle";

export type CircleFit = {
  center: Vec2;
  radius: number;
};

/**
 * Taubin circle fit — labs.md §8.1 / Chernov Newton form.
 *
 * Characteristic cubic is solved from several Newton seeds; the root that
 * yields the lowest geometric RMSE is kept (avoids the spurious Mz/2 basin
 * that collapses radius on near-perfect circles).
 */
export function fitCircleTaubin(points: ArrayLike<Vec2>): CircleFit | null {
  const n = points.length;
  if (n < 3) return null;

  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < n; i++) {
    meanX += points[i]!.x;
    meanY += points[i]!.y;
  }
  meanX /= n;
  meanY /= n;

  let Mxx = 0;
  let Myy = 0;
  let Mxy = 0;
  let Mxz = 0;
  let Myz = 0;
  let Mzz = 0;
  for (let i = 0; i < n; i++) {
    const Xi = points[i]!.x - meanX;
    const Yi = points[i]!.y - meanY;
    const Zi = Xi * Xi + Yi * Yi;
    Mxy += Xi * Yi;
    Mxx += Xi * Xi;
    Myy += Yi * Yi;
    Mxz += Xi * Zi;
    Myz += Yi * Zi;
    Mzz += Zi * Zi;
  }
  Mxx /= n;
  Myy /= n;
  Mxy /= n;
  Mxz /= n;
  Myz /= n;
  Mzz /= n;

  const Mz = Mxx + Myy;
  const Cov_xy = Mxx * Myy - Mxy * Mxy;
  const Var_z = Mzz - Mz * Mz;
  const A3 = 4 * Mz;
  const A2 = -3 * Mz * Mz - Mzz;
  const A1 = Var_z * Mz + 4 * Cov_xy * Mz - Mxz * Mxz - Myz * Myz;
  const A0 = Mxz * (Mxz * Myy - Myz * Mxy) + Myz * (Myz * Mxx - Mxz * Mxy) - Var_z * Cov_xy;

  const seeds = [0, Mz / 2, Mz, Mz * 0.25, Mz * 0.75];
  let best: CircleFit | null = null;
  let bestRmse = Infinity;

  for (const seed of seeds) {
    const x = newtonCubic(A0, A1, A2, A3, seed);
    const cand = circleFromRoot(x, Mxx, Myy, Mxy, Mxz, Myz, Mz, Cov_xy, meanX, meanY);
    if (!cand) continue;
    const err = circleRmse(points, cand.center, cand.radius);
    if (err < bestRmse) {
      bestRmse = err;
      best = cand;
    }
  }

  return best;
}

function newtonCubic(
  A0: number,
  A1: number,
  A2: number,
  A3: number,
  seed: number,
): number {
  let x = seed;
  let y = A0 + x * (A1 + x * (A2 + x * A3));
  for (let iter = 0; iter < 99; iter++) {
    const Dy = A1 + x * (2 * A2 + 3 * A3 * x);
    if (Math.abs(Dy) < 1e-18) break;
    const xnew = x - y / Dy;
    if (!Number.isFinite(xnew)) break;
    const ynew = A0 + xnew * (A1 + xnew * (A2 + xnew * A3));
    if (Math.abs(ynew) >= Math.abs(y) || Math.abs(xnew - x) < 1e-14) {
      x = xnew;
      break;
    }
    x = xnew;
    y = ynew;
  }
  return x;
}

function circleFromRoot(
  x: number,
  Mxx: number,
  Myy: number,
  Mxy: number,
  Mxz: number,
  Myz: number,
  Mz: number,
  Cov_xy: number,
  meanX: number,
  meanY: number,
): CircleFit | null {
  const DET = x * x - x * Mz + Cov_xy;
  if (Math.abs(DET) < 1e-14) return null;

  const Xcenter = (Mxz * (Myy - x) - Myz * Mxy) / DET / 2;
  const Ycenter = (Myz * (Mxx - x) - Mxz * Mxy) / DET / 2;
  const r2 = Xcenter * Xcenter + Ycenter * Ycenter + Mz - 2 * x;
  if (!(r2 > 1e-14)) return null;
  const radius = Math.sqrt(r2);
  if (!Number.isFinite(radius)) return null;

  return {
    center: { x: Xcenter + meanX, y: Ycenter + meanY },
    radius,
  };
}
