// All derived / computed values for visits live here — never stored on the
// ClinicalVisit record. Given raw visits, these pure functions produce score
// bands, measurement trends, dimension diffs and latest-visit lookups.

import { scoreTone, formatScore, type ScoreTone } from "@/lib/scoreColor";
import type { ClinicalVisit, DimensionUpdate, VisitMeasurement } from "./types";
import type { DimensionKey } from "./dimensionMapping";

/* ---------------- Score bands (via scoreColor.ts) ---------------- */

export type ScoreBand = "Low" | "Medium" | "High" | "—";

const TONE_TO_BAND: Record<ScoreTone, ScoreBand> = {
  green: "Low",
  amber: "Medium",
  red: "High",
  muted: "—",
};

/** Band label for a raw 1–10 score (null → "—"). */
export function scoreBand(score: number | null | undefined): ScoreBand {
  return TONE_TO_BAND[scoreTone(score)];
}

/** Re-export for callers that want the tone/format directly. */
export { scoreTone, formatScore };

/* ---------------- Latest / ordering ---------------- */

/** Visits sorted newest-first by raw date. */
export function sortByDateDesc(visits: ClinicalVisit[]): ClinicalVisit[] {
  return [...visits].sort((a, b) => b.date.localeCompare(a.date));
}

/** The most recent visit for a patient (by date), or null. */
export function latestVisit(visits: ClinicalVisit[]): ClinicalVisit | null {
  return sortByDateDesc(visits)[0] ?? null;
}

/* ---------------- Measurement trend vs prior visit ---------------- */

export type Trend = "up" | "down" | "flat";

export interface MeasurementTrend {
  trend: Trend;
  delta: number | null; // numeric delta when both values are numeric
}

const toNumber = (v: number | string): number | null => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Compare a measurement to the same-marker measurement in the prior visit.
 * Returns null when there's no comparable prior value.
 */
export function measurementTrend(
  measurement: VisitMeasurement,
  priorVisit: ClinicalVisit | null,
): MeasurementTrend | null {
  if (!priorVisit) return null;
  const prior = priorVisit.measurements.find((m) => m.marker === measurement.marker);
  if (!prior) return null;
  const now = toNumber(measurement.value);
  const then = toNumber(prior.value);
  if (now == null || then == null) return null;
  const delta = Math.round((now - then) * 100) / 100;
  return { trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat", delta };
}

/* ---------------- Dimension score diff vs prior ---------------- */

export interface DimensionDiff {
  fromScore: number | null;
  toScore: number | null;
  fromBand: ScoreBand;
  toBand: ScoreBand;
  direction: "up" | "down" | "flat";
  changed: boolean; // band changed
}

/** Most recent prior score for a dimension across a patient's earlier visits. */
export function priorDimensionScore(
  dimension: DimensionKey,
  priorVisits: ClinicalVisit[],
): number | null {
  for (const v of sortByDateDesc(priorVisits)) {
    const u = v.dimensionUpdates.find((d) => d.dimension === dimension);
    if (u) return u.newScore;
  }
  return null;
}

/** Diff between a dimension update and the patient's prior score for it. */
export function dimensionDiff(
  update: DimensionUpdate,
  priorVisits: ClinicalVisit[],
): DimensionDiff {
  const fromScore = priorDimensionScore(update.dimension, priorVisits);
  const toScore = update.newScore;
  const fromBand = scoreBand(fromScore);
  const toBand = scoreBand(toScore);
  const a = fromScore ?? null;
  const b = toScore ?? null;
  const direction =
    a == null || b == null ? "flat" : b > a ? "up" : b < a ? "down" : "flat";
  return { fromScore, toScore, fromBand, toBand, direction, changed: fromBand !== toBand };
}
