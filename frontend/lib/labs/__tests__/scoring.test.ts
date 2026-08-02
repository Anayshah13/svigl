import { describe, expect, it } from "vitest";
import { evaluateLabStroke } from "../engine/evaluate";
import { scoreFromTotalError } from "../scoring/exponential";
import type { LabGameId } from "../types";
import { sampleFor } from "./fixtures";

const GAMES: LabGameId[] = [
  "perfect-circle",
  "perfect-square",
  "perfect-triangle",
  "infinity-loop",
];

describe("exponential scoring", () => {
  it("maps E=0 to 100 and floors below 30 to 0", () => {
    expect(scoreFromTotalError(0, 1.35)).toBe(100);
    expect(scoreFromTotalError(10, 1.35)).toBe(0);
  });
});

describe("evaluateLabStroke quality ladder", () => {
  for (const game of GAMES) {
    describe(game, () => {
      it("scores a perfect shape very highly", () => {
        const result = evaluateLabStroke(game, sampleFor(game, "perfect"));
        expect(result.status).toBe("VALID");
        expect(result.final_score).toBeGreaterThan(90);
        expect(result.metrics.length).toBeGreaterThan(0);
      });

      it("scores a good shape above average", () => {
        const result = evaluateLabStroke(game, sampleFor(game, "good"));
        expect(result.status).toBe("VALID");
        expect(result.final_score).toBeGreaterThan(55);
      });

      it("scores an average shape below a good one", () => {
        const perfect = evaluateLabStroke(game, sampleFor(game, "perfect"));
        const average = evaluateLabStroke(game, sampleFor(game, "average"));
        const poor = evaluateLabStroke(game, sampleFor(game, "poor"));
        expect(perfect.status).toBe("VALID");
        if (average.status === "VALID") {
          expect(perfect.final_score).toBeGreaterThanOrEqual(average.final_score - 2);
        }
        if (poor.status === "VALID") {
          expect(perfect.final_score).toBeGreaterThan(poor.final_score);
        } else {
          expect(poor.final_score).toBe(0);
        }
      });

      it("rejects or zeros an invalid scribble", () => {
        const result = evaluateLabStroke(game, sampleFor(game, "invalid"));
        if (result.status === "VALID") {
          expect(result.final_score).toBeLessThan(55);
        } else {
          expect(result.final_score).toBe(0);
        }
      });
    });
  }
});

describe("circle metric breakdown labels", () => {
  it("exposes UI-facing metric labels", () => {
    const result = evaluateLabStroke("perfect-circle", sampleFor("perfect-circle", "good"));
    expect(result.status).toBe("VALID");
    const labels = result.metrics.map((m) => m.label);
    expect(labels).toContain("Radius Consistency");
    expect(labels).toContain("Closure");
    expect(labels).toContain("Smoothness");
    expect(labels).toContain("Confidence");
  });
});

describe("fixed center rejection", () => {
  it("zeros a circle drawn away from the canvas center", () => {
    // Small circle in the corner — does not enclose the celestial axis.
    const pts = sampleFor("perfect-circle", "perfect").map((p) => ({
      ...p,
      x: p.x - 220,
      y: p.y - 140,
    }));
    const result = evaluateLabStroke("perfect-circle", pts);
    expect(result.final_score).toBe(0);
  });

  it("zeros a square that does not enclose the center", () => {
    const pts = sampleFor("perfect-square", "perfect").map((p) => ({
      ...p,
      x: p.x - 200,
      y: p.y - 120,
    }));
    const result = evaluateLabStroke("perfect-square", pts);
    expect(result.final_score).toBe(0);
  });

  it("zeros an infinity stroke with no origin crossing", () => {
    // A circle around the center has no lemniscate self-crossing at the origin.
    const result = evaluateLabStroke(
      "infinity-loop",
      sampleFor("perfect-circle", "perfect"),
    );
    expect(result.final_score).toBe(0);
  });
});
