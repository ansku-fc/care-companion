// All derived / computed values for visits live here — never stored on the
// ClinicalVisit record. Given the patient's raw baseline and a visit's raw
// tagged inputs (diagnoses, medication changes, measurements), these pure
// functions produce the 1–10 dimension scores, the "affected dimensions"
// movement + drivers, measurement trends, and latest-visit lookups.

import { scoreTone, formatScore, type ScoreTone } from "@/lib/scoreColor";
import { LAB_MARKERS } from "@/lib/labMarkerCatalog";
import { DIMENSION_KEYS, type DimensionKey } from "./dimensionMapping";
import type {
  ClinicalVisit,
  MedicationChange,
  PatientBaseline,
  VisitDiagnosis,
  VisitMeasurement,
} from "./types";

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

export { scoreTone, formatScore };

/* ---------------- Latest / ordering ---------------- */

export function sortByDateDesc(visits: ClinicalVisit[]): ClinicalVisit[] {
  return [...visits].sort((a, b) => b.date.localeCompare(a.date));
}

export function latestVisit(visits: ClinicalVisit[]): ClinicalVisit | null {
  return sortByDateDesc(visits)[0] ?? null;
}

/* ---------------- Measurement helpers ---------------- */

const toNumber = (v: number | string): number | null => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Reference-range resolution reuses labMarkerCatalog `reference` strings, with a
// small alias map (visit markers use short names) and a fallback for vitals the
// catalog doesn't list (BP by short name, temperature, SpO2).
const MARKER_ALIASES: Record<string, string> = {
  ldl: "ldl cholesterol",
  "systolic bp": "blood pressure (systolic)",
  "diastolic bp": "blood pressure (diastolic)",
};
const FALLBACK_REFERENCES: Record<string, string> = {
  temperature: "36 – 37.5",
  spo2: "> 94",
};

function referenceFor(marker: string): string | undefined {
  const norm = marker.trim().toLowerCase();
  const catalogLabel = MARKER_ALIASES[norm] ?? norm;
  const m = LAB_MARKERS.find((x) => x.label.toLowerCase() === catalogLabel);
  return m?.reference ?? FALLBACK_REFERENCES[norm];
}

export type RangeStatus = "in" | "out" | "unknown";

/** In/out of reference range for a measurement (mockup — parses catalog ranges). */
export function measurementRangeStatus(marker: string, value: number | string): RangeStatus {
  const ref = referenceFor(marker);
  const n = toNumber(value);
  if (!ref || n == null) return "unknown";
  let m: RegExpMatchArray | null;
  if ((m = ref.match(/^<\s*([\d.]+)/))) return n < Number(m[1]) ? "in" : "out";
  if ((m = ref.match(/^>\s*([\d.]+)/))) return n > Number(m[1]) ? "in" : "out";
  if ((m = ref.match(/([\d.]+)\s*[–-]\s*([\d.]+)/))) return n >= Number(m[1]) && n <= Number(m[2]) ? "in" : "out";
  return "unknown";
}

export type Trend = "up" | "down" | "flat";
export interface MeasurementTrend {
  trend: Trend;
  delta: number | null;
}

export function measurementTrend(measurement: VisitMeasurement, priorVisit: ClinicalVisit | null): MeasurementTrend | null {
  if (!priorVisit) return null;
  const prior = priorVisit.measurements.find((m) => m.marker === measurement.marker);
  if (!prior) return null;
  const now = toNumber(measurement.value);
  const then = toNumber(prior.value);
  if (now == null || then == null) return null;
  const delta = Math.round((now - then) * 100) / 100;
  return { trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat", delta };
}

/* ────────────────────────────────────────────────────────────────────
 * MOCKUP DIMENSION SCORING — NOT CLINICALLY VALIDATED
 *
 * Higher = worse (matches scoreColor: 1–3.9 green, 4–6.9 amber, 7–10 red).
 * Each dimension starts from the patient's raw baseline (default 3.0 if none),
 * then each tagged input nudges it:
 *   - active diagnosis on the dimension        → +1.6  (worse)
 *   - resolved diagnosis on the dimension      → −0.4  (better)
 *   - medication started/continued (managing)  → −1.0  (better)
 *   - medication dose changed (adjusting)      → −0.6
 *   - medication stopped                       → +0.4
 *   - measurement out of range                 → +0.9  (worse)
 *   - measurement in range                     → −0.5  (better)
 *   - measurement range unknown                →  0
 * Result is clamped to 1–10 and rounded to 1 dp. Nothing is stored.
 * ──────────────────────────────────────────────────────────────────── */

const DEFAULT_BASELINE = 3.0;
const W = {
  dxActive: 1.6,
  dxResolved: -0.4,
  medManaging: -1.0,
  medAdjust: -0.6,
  medStopped: 0.4,
  measOut: 0.9,
  measIn: -0.5,
};

const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));

export interface ScoringInputs {
  diagnoses: VisitDiagnosis[];
  medicationChanges: MedicationChange[];
  measurements: VisitMeasurement[];
}

export function scoringInputsFromVisit(visit: ClinicalVisit): ScoringInputs {
  return {
    diagnoses: visit.diagnoses,
    medicationChanges: visit.intervalHistory.medicationChanges,
    measurements: visit.measurements,
  };
}

function medDelta(change: MedicationChange["change"]): number {
  if (change === "stopped") return W.medStopped;
  if (change === "dose_changed") return W.medAdjust;
  return W.medManaging; // started | continued → managing the condition
}

/** Derived 1–10 score for every canonical dimension (baseline + tagged nudges). */
export function computeDimensionScores(
  baseline: PatientBaseline,
  inputs: ScoringInputs,
): Record<DimensionKey, number> {
  const out = {} as Record<DimensionKey, number>;
  for (const key of DIMENSION_KEYS) {
    let s = baseline[key] ?? DEFAULT_BASELINE;
    for (const d of inputs.diagnoses) {
      if (d.dimensions.includes(key)) s += d.status === "resolved" ? W.dxResolved : W.dxActive;
    }
    for (const m of inputs.medicationChanges) {
      if (m.dimensions.includes(key)) s += medDelta(m.change);
    }
    for (const meas of inputs.measurements) {
      if (!meas.dimensions.includes(key)) continue;
      const status = measurementRangeStatus(meas.marker, meas.value);
      if (status === "out") s += W.measOut;
      else if (status === "in") s += W.measIn;
    }
    out[key] = clamp(s);
  }
  return out;
}

/* ---------------- Affected dimensions + drivers (derived) ---------------- */

export interface DimensionDriver {
  label: string;
  direction: "up" | "down"; // up = worse, down = better
}

export interface AffectedDimension {
  dimension: DimensionKey;
  from: number;
  to: number;
  delta: number; // to - from
  drivers: DimensionDriver[];
}

/** Which dimensions this visit's inputs touched, and how the score moved + why. */
export function affectedDimensions(baseline: PatientBaseline, inputs: ScoringInputs): AffectedDimension[] {
  const scores = computeDimensionScores(baseline, inputs);
  const result: AffectedDimension[] = [];
  for (const key of DIMENSION_KEYS) {
    const drivers: DimensionDriver[] = [];
    for (const d of inputs.diagnoses) {
      if (!d.dimensions.includes(key)) continue;
      drivers.push(
        d.status === "resolved"
          ? { label: `resolved ${d.name}`, direction: "down" }
          : { label: `new ${d.name} diagnosis`, direction: "up" },
      );
    }
    for (const m of inputs.medicationChanges) {
      if (!m.dimensions.includes(key)) continue;
      if (m.change === "stopped") drivers.push({ label: `stopped ${m.medicationName}`, direction: "up" });
      else drivers.push({ label: `${m.medicationName} (${m.change.replace("_", " ")})`, direction: "down" });
    }
    for (const meas of inputs.measurements) {
      if (!meas.dimensions.includes(key)) continue;
      const status = measurementRangeStatus(meas.marker, meas.value);
      if (status === "out") drivers.push({ label: `abnormal ${meas.marker} (${meas.value}${meas.unit})`, direction: "up" });
      else if (status === "in") drivers.push({ label: `${meas.marker} in range`, direction: "down" });
    }
    if (drivers.length === 0) continue;
    const from = baseline[key] ?? DEFAULT_BASELINE;
    const to = scores[key];
    result.push({ dimension: key, from: clamp(from), to, delta: Math.round((to - from) * 10) / 10, drivers });
  }
  // Biggest movers first.
  return result.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Convenience: derived scores for a whole visit against a baseline. */
export function deriveVisitScores(baseline: PatientBaseline, visit: ClinicalVisit): Record<DimensionKey, number> {
  return computeDimensionScores(baseline, scoringInputsFromVisit(visit));
}
