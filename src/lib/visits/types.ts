// Data model for the clinical visit intake flow (mockup).
//
// Design rule: this file holds ONLY raw, entered data. Nothing computed lives
// here — score bands, trends, diffs and "latest visit" are all derived in
// derive.ts from these raw fields. Canonical enums are reused, never redefined:
//   - TaskPriority / TaskCategory  ← @/lib/tasks
//   - VisitType                    ← @/lib/episodes (+ VISIT_TYPE_META for labels)
//   - DimensionKey                 ← ./dimensionMapping (mirror of HEALTH_TAXONOMY)

import type { TaskPriority, TaskCategory } from "@/lib/tasks";
import type { VisitType } from "@/lib/episodes";
import type { DimensionKey } from "./dimensionMapping";

export type VisitStatus = "draft" | "in_review" | "completed";

/* ---------------- Interval history (delta since last visit) ---------------- */

export interface SymptomEntry {
  id: string;
  description: string;
  dimensions: DimensionKey[];
  onset?: string; // ISO date, optional
}

export type MedicationChangeKind = "started" | "stopped" | "dose_changed" | "continued";

export interface MedicationChange {
  id: string;
  medicationName: string;
  atc?: string;
  change: MedicationChangeKind;
  detail?: string; // e.g. "10mg → 20mg"
  dimensions: DimensionKey[]; // doctor-tagged; drives derived scoring
}

/* ---------------- Diagnoses recorded this visit ---------------- */

export type DiagnosisStatus = "active" | "resolved";

export interface VisitDiagnosis {
  id: string;
  name: string;
  icd10: string;
  status: DiagnosisStatus;
  dimensions: DimensionKey[]; // doctor-tagged (auto-suggested from ICD); drives scoring
}

export interface IntervalHistory {
  newSymptoms: SymptomEntry[];
  medicationChanges: MedicationChange[];
  lifeEvents: string[];
  adherenceNote?: string;
  freeText?: string;
}

/* ---------------- Measurements taken / reviewed today ---------------- */

export type MeasurementKind = "vital" | "lab";
export type MeasurementSource = "measured_today" | "reviewed";

export interface VisitMeasurement {
  id: string;
  kind: MeasurementKind;
  marker: string; // e.g. "Systolic BP", "LDL"
  value: number | string; // raw entered value
  unit: string;
  source: MeasurementSource;
  dimensions: DimensionKey[];
  // NO status / severity / trend — derived vs the prior visit in derive.ts
}

/**
 * Patient-level raw baseline: the standing 1–10 score per dimension the clinician
 * carries into a visit. Raw seed data — the starting point for derivation. The
 * per-visit scores are NOT stored; they are derived from this baseline plus the
 * visit's tagged inputs (see derive.ts::computeDimensionScores).
 */
export type PatientBaseline = Partial<Record<DimensionKey, number>>;

/* ---------------- Plan arising from the visit ---------------- */

export interface PlanTask {
  id: string;
  title: string;
  priority: TaskPriority;
  category: TaskCategory;
  assignee: string;
  dueDate: string; // ISO
}

export interface PlanReferral {
  id: string;
  specialty: string;
  referTo: string;
  assignee: string;
  dueDate: string; // ISO
  notes: string;
}

export interface PlanFollowUp {
  id: string;
  visitType: VisitType; // canonical — labels via VISIT_TYPE_META
  timeframe: string;
  with: string;
  notes: string;
}

export interface PlanPrescription {
  id: string;
  medicationName: string;
  dose: string;
  frequency: string;
  time: string;
}

export interface VisitPlan {
  tasks: PlanTask[];
  referrals: PlanReferral[];
  followUp: PlanFollowUp | null;
  prescriptions: PlanPrescription[];
}

/* ---------------- Top-level record ---------------- */

export interface ClinicalVisit {
  id: string;
  patientId: string;
  date: string; // ISO — raw
  clinician: string;
  reason: VisitType;
  reasonNote?: string;
  status: VisitStatus;
  intervalHistory: IntervalHistory;
  measurements: VisitMeasurement[];
  diagnoses: VisitDiagnosis[];
  plan: VisitPlan;
  previousVisitId: string | null; // raw link, NOT a computed "latest" flag
  // NOTE: dimension scores are NOT stored — always derived from the tagged
  // inputs above (diagnoses, medicationChanges, measurements) via derive.ts.
}

/** Factory for an empty interval history. */
export function emptyIntervalHistory(): IntervalHistory {
  return { newSymptoms: [], medicationChanges: [], lifeEvents: [] };
}

/** Factory for an empty plan. */
export function emptyVisitPlan(): VisitPlan {
  return { tasks: [], referrals: [], followUp: null, prescriptions: [] };
}
