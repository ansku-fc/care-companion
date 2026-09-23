import { describe, it, expect } from "vitest";
import {
  computeDimensionScores,
  affectedDimensions,
  measurementRangeStatus,
  type ScoringInputs,
} from "./derive";
import type { PatientBaseline } from "./types";

const baseline: PatientBaseline = { cardiovascular: 5.0, metabolic: 5.0 };

const empty: ScoringInputs = { diagnoses: [], medicationChanges: [], measurements: [] };

describe("mockup dimension scoring", () => {
  it("untouched dimensions keep their baseline", () => {
    const scores = computeDimensionScores(baseline, empty);
    expect(scores.cardiovascular).toBe(5.0);
    expect(scores.metabolic).toBe(5.0);
    // A dimension with no baseline falls back to the default (3.0).
    expect(scores.digestion).toBe(3.0);
  });

  it("an active diagnosis pushes the dimension worse", () => {
    const scores = computeDimensionScores(baseline, {
      ...empty,
      diagnoses: [{ id: "d1", name: "Hypertension", icd10: "I10", status: "active", dimensions: ["cardiovascular"] }],
    });
    expect(scores.cardiovascular).toBeGreaterThan(5.0);
  });

  it("a managing medication pulls the dimension better", () => {
    const scores = computeDimensionScores(baseline, {
      ...empty,
      medicationChanges: [{ id: "m1", medicationName: "Ramipril", change: "started", dimensions: ["cardiovascular"] }],
    });
    expect(scores.cardiovascular).toBeLessThan(5.0);
  });

  it("out-of-range measurement worsens, in-range improves", () => {
    const worse = computeDimensionScores(baseline, {
      ...empty,
      measurements: [{ id: "x1", kind: "vital", marker: "Systolic BP", value: 160, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] }],
    });
    const better = computeDimensionScores(baseline, {
      ...empty,
      measurements: [{ id: "x2", kind: "vital", marker: "Systolic BP", value: 118, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] }],
    });
    expect(worse.cardiovascular).toBeGreaterThan(5.0);
    expect(better.cardiovascular).toBeLessThan(5.0);
  });

  it("stays clamped to 1–10", () => {
    const scores = computeDimensionScores({ cardiovascular: 9.8 }, {
      ...empty,
      diagnoses: [
        { id: "d1", name: "A", icd10: "I10", status: "active", dimensions: ["cardiovascular"] },
        { id: "d2", name: "B", icd10: "I11", status: "active", dimensions: ["cardiovascular"] },
      ],
    });
    expect(scores.cardiovascular).toBeLessThanOrEqual(10);
    expect(scores.cardiovascular).toBeGreaterThanOrEqual(1);
  });

  it("affectedDimensions reports movement + drivers only for touched dims", () => {
    const affected = affectedDimensions(baseline, {
      ...empty,
      diagnoses: [{ id: "d1", name: "Hypertension", icd10: "I10", status: "active", dimensions: ["cardiovascular"] }],
    });
    expect(affected).toHaveLength(1);
    expect(affected[0].dimension).toBe("cardiovascular");
    expect(affected[0].to).toBeGreaterThan(affected[0].from);
    expect(affected[0].drivers[0].label).toContain("Hypertension");
    expect(affected[0].drivers[0].direction).toBe("up");
  });

  it("measurementRangeStatus parses catalog + fallback ranges", () => {
    expect(measurementRangeStatus("LDL", 2.0)).toBe("in"); // < 3.0
    expect(measurementRangeStatus("LDL", 4.0)).toBe("out");
    expect(measurementRangeStatus("HbA1c", 55)).toBe("out"); // 20 – 42
    expect(measurementRangeStatus("Temperature", 37.0)).toBe("in"); // fallback 36 – 37.5
    expect(measurementRangeStatus("Unknown marker", 1)).toBe("unknown");
  });
});
