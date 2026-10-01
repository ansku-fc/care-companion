// All derived / computed values for visits live here — never stored on the
// ClinicalVisit record. Given the patient's raw baseline and a visit's raw
// tagged inputs (diagnoses, medication changes, measurements), these pure
// functions produce the 1–10 dimension scores, the "affected dimensions"
// movement + drivers, measurement trends, and latest-visit lookups.

import { scoreTone, formatScore, type ScoreTone } from "@/lib/scoreColor";
import { LAB_MARKERS } from "@/lib/labMarkerCatalog";
import { DIMENSION_KEYS, suggestDimensionsForIcd, type DimensionKey } from "./dimensionMapping";
import type {
  ClinicalVisit,
  MedicationChange,
  MedicationChangeKind,
  PatientBaseline,
  PlanPrescription,
  VisitDiagnosis,
  VisitMeasurement,
  VisitTreatment,
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
    diagnoses: scoringDiagnoses(visit),
    medicationChanges: visit.medicationChanges,
    measurements: visit.measurements,
  };
}

/**
 * Diagnoses that feed scoring: the diagnoses recorded this visit PLUS any
 * existing (baseline) diagnosis the clinician marked resolved this visit —
 * synthesized as a resolved diagnosis on its ICD-derived dimension(s). Active
 * existing diagnoses are NOT scored (already reflected in the patient baseline);
 * only the resolution event contributes (lifting the dimension's drag). Derived.
 */
export function scoringDiagnoses(visit: Pick<ClinicalVisit, "diagnoses" | "prescribingContexts">): VisitDiagnosis[] {
  const resolvedExisting: VisitDiagnosis[] = (visit.prescribingContexts ?? [])
    .filter((c) => c.resolved === true)
    .map((c) => ({
      id: c.id,
      name: c.name,
      icd10: c.icd10,
      status: "resolved" as const,
      dimensions: suggestDimensionsForIcd(c.icd10),
    }));
  return [...visit.diagnoses, ...resolvedExisting];
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

/* ---------------- Diagnosis-driven prescribing (derived) ---------------- */

/** One diagnosis prompt with its linked medications and resolution state. */
export interface DiagnosisRxGroup {
  id: string;
  name: string;
  icd10: string;
  source: "new" | "existing"; // new = diagnosed this visit; existing = baseline
  noMedication: boolean;
  prescriptions: PlanPrescription[]; // new prescriptions linked to this diagnosis
  changes: MedicationChange[]; // medication changes linked to this diagnosis
  treatments: VisitTreatment[]; // non-medication treatments linked to this diagnosis
  /** Resolved once ≥1 medication OR treatment is linked, OR "no treatment
   *  needed" is set (the noMedication flag, now broader than drugs). */
  resolved: boolean;
  /** Clinician marked this (existing) diagnosis clinically resolved this visit.
   *  Distinct from `resolved` (which is about the prescribing decision). */
  markedResolved: boolean;
}

export interface DiagnosisPrescribing {
  groups: DiagnosisRxGroup[];
  /** Count of unresolved prompts — drives the "needs attention" badge. */
  pendingCount: number;
  /** Medications not linked to any diagnosis (defensive; empty in the normal flow). */
  unlinkedPrescriptions: PlanPrescription[];
  unlinkedChanges: MedicationChange[];
}

/**
 * Group this visit's prescriptions + medication changes under the diagnosis each
 * was prescribed for (new VisitDiagnoses and pulled-in PrescribingContexts), and
 * derive each prompt's resolution + the pending count. Purely derived from the
 * raw links (linkedDiagnosisId) and resolution flags (noMedication).
 */
export function diagnosisPrescribing(visit: ClinicalVisit): DiagnosisPrescribing {
  const prescriptions = visit.plan.prescriptions ?? [];
  const changes = visit.medicationChanges ?? [];
  const treatments = visit.treatments ?? [];
  const rxFor = (id: string) => prescriptions.filter((p) => p.linkedDiagnosisId === id);
  const chFor = (id: string) => changes.filter((c) => c.linkedDiagnosisId === id);
  const txFor = (id: string) => treatments.filter((t) => t.linkedDiagnosisId === id);

  const fromNew: DiagnosisRxGroup[] = visit.diagnoses.map((d) => {
    const rx = rxFor(d.id);
    const ch = chFor(d.id);
    const tx = txFor(d.id);
    return {
      id: d.id,
      name: d.name,
      icd10: d.icd10,
      source: "new" as const,
      noMedication: d.noMedication === true,
      prescriptions: rx,
      changes: ch,
      treatments: tx,
      resolved: d.noMedication === true || rx.length + ch.length + tx.length > 0,
      markedResolved: d.status === "resolved",
    };
  });

  const fromExisting: DiagnosisRxGroup[] = (visit.prescribingContexts ?? []).map((c) => {
    const rx = rxFor(c.id);
    const ch = chFor(c.id);
    const tx = txFor(c.id);
    return {
      id: c.id,
      name: c.name,
      icd10: c.icd10,
      source: "existing" as const,
      noMedication: c.noMedication === true,
      prescriptions: rx,
      changes: ch,
      treatments: tx,
      resolved: c.noMedication === true || rx.length + ch.length + tx.length > 0,
      markedResolved: c.resolved === true,
    };
  });

  const groups = [...fromNew, ...fromExisting];
  const linkedIds = new Set(groups.map((g) => g.id));
  return {
    groups,
    pendingCount: groups.filter((g) => !g.resolved).length,
    unlinkedPrescriptions: prescriptions.filter((p) => !p.linkedDiagnosisId || !linkedIds.has(p.linkedDiagnosisId)),
    unlinkedChanges: changes.filter((c) => !c.linkedDiagnosisId || !linkedIds.has(c.linkedDiagnosisId)),
  };
}

/* ---------------- Dimension longitudinal trend (derived) ---------------- */

export interface DimensionTrendPoint {
  date: string; // ISO visit date
  score: number; // derived 1–10 score at that visit
}

/**
 * Longitudinal trend of one dimension's DERIVED score across the patient's visit
 * history: at each past visit, recompute the dimension score from that visit's
 * tagged inputs (diagnoses / medication changes / measurements) + the baseline.
 * Chronological ascending. Purely derived — never stored.
 */
export function dimensionTrend(
  dimension: DimensionKey,
  baseline: PatientBaseline,
  visits: ClinicalVisit[],
): DimensionTrendPoint[] {
  return [...visits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((v) => ({ date: v.date, score: computeDimensionScores(baseline, scoringInputsFromVisit(v))[dimension] }));
}

/* ---------------- Medication history for a diagnosis (derived) ---------------- */

export interface MedHistoryEntry {
  date: string; // visit date (ISO)
  medicationName: string; // medication OR treatment name
  change: MedicationChangeKind; // treatments only ever use started/stopped/continued
  detail?: string;
  discontinueReason?: string; // why it was stopped, if recorded
  isTreatment?: boolean; // true for non-medication treatment entries
}

export interface DiagnosisMedHistory {
  current: { name: string; dose: string; frequency: string }[];
  currentTreatments: { name: string; note?: string }[];
  timeline: MedHistoryEntry[]; // chronological ascending (meds + treatments intermixed)
}

/**
 * Medication history for a diagnosis (by ICD-10): the current regimen (current
 * meds linked to the diagnosis) plus every past medication change belonging to
 * it, ordered by visit date. Belonging is matched by linkedDiagnosisId where
 * present; older mock changes predate that link, so they fall back to
 * medication-name ↔ diagnosis-current-med correlation (gap: a historical change
 * for a med no longer in the current regimen won't be attributed). Derived only.
 */
export function medicationHistoryForDiagnosis(
  icd10: string,
  visits: ClinicalVisit[],
  currentMeds: { name: string; dose: string; frequency: string; diagnosisIcd10?: string }[],
  currentTreatments: { name: string; note?: string; diagnosisIcd10?: string }[] = [],
): DiagnosisMedHistory {
  const current = currentMeds
    .filter((m) => m.diagnosisIcd10 === icd10)
    .map((m) => ({ name: m.name, dose: m.dose, frequency: m.frequency }));
  const dxMedNames = new Set(current.map((m) => m.name.toLowerCase()));

  const currentTx = currentTreatments
    .filter((t) => t.diagnosisIcd10 === icd10)
    .map((t) => ({ name: t.name, note: t.note }));
  const dxTxNames = new Set(currentTx.map((t) => t.name.toLowerCase()));

  const timeline: MedHistoryEntry[] = [];
  for (const v of [...visits].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const c of v.medicationChanges) {
      const byLink = c.linkedDiagnosisId ? c.linkedDiagnosisId.includes(icd10) : false;
      const byName = dxMedNames.has(c.medicationName.toLowerCase());
      if (byLink || byName) {
        timeline.push({
          date: v.date,
          medicationName: c.medicationName,
          change: c.change,
          detail: c.detail,
          discontinueReason: c.discontinueReason,
        });
      }
    }
    // Non-medication treatments — same linkedDiagnosisId / name-fallback rules.
    for (const t of v.treatments ?? []) {
      const byLink = t.linkedDiagnosisId ? t.linkedDiagnosisId.includes(icd10) : false;
      const byName = dxTxNames.has(t.name.toLowerCase());
      if (byLink || byName) {
        timeline.push({
          date: v.date,
          medicationName: t.name,
          change: t.change,
          detail: t.note,
          discontinueReason: t.discontinueReason,
          isTreatment: true,
        });
      }
    }
  }
  return { current, currentTreatments: currentTx, timeline };
}
