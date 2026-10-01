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

/* ---------------- Medication changes this visit ---------------- */

export type MedicationChangeKind = "started" | "stopped" | "dose_changed" | "continued";

export interface MedicationChange {
  id: string;
  medicationName: string;
  atc?: string;
  change: MedicationChangeKind;
  detail?: string; // e.g. "10mg → 20mg"
  dimensions: DimensionKey[]; // doctor-tagged; drives derived scoring
  /** Diagnosis this change was prescribed for (VisitDiagnosis.id or a
   *  PrescribingContext.id). Raw link; groupings are derived. */
  linkedDiagnosisId?: string;
  /** Free-text reason a medication was discontinued (only on `stopped`). Raw. */
  discontinueReason?: string;
}

/* ---------------- Non-medication treatments this visit ---------------- */

export type TreatmentChangeKind = "started" | "stopped" | "continued";

/**
 * A non-medication treatment linked to a diagnosis — devices, therapies and
 * interventions (CPAP, compression stockings, physiotherapy, low-carb diet…).
 * Mirrors MedicationChange but for non-drug management: same `linkedDiagnosisId`
 * link, same raw `discontinueReason` on a stop. Raw data; grouping/history derived.
 */
export interface VisitTreatment {
  id: string;
  name: string; // e.g. "CPAP therapy"
  change: TreatmentChangeKind;
  note?: string; // optional free-text detail the doctor adds
  date?: string; // ISO — when started/applied (raw). Optional.
  linkedDiagnosisId?: string;
  discontinueReason?: string; // why it was stopped (only on `stopped`)
}

/* ---------------- Diagnoses recorded this visit ---------------- */

export type DiagnosisStatus = "active" | "resolved";

export interface VisitDiagnosis {
  id: string;
  name: string;
  icd10: string;
  status: DiagnosisStatus;
  dimensions: DimensionKey[]; // doctor-tagged (auto-suggested from ICD); drives scoring
  /** Explicit "no medication needed" decision for this diagnosis (raw). A
   *  prompt resolves when this is true OR ≥1 medication is linked to it. */
  noMedication?: boolean;
}

/**
 * An EXISTING (baseline) diagnosis pulled into this visit solely to prescribe
 * against it — NOT re-recorded as a new diagnosis, so it does not feed derived
 * dimension scoring (it's an established condition, not newly diagnosed).
 */
export interface PrescribingContext {
  id: string; // synthesized, e.g. "dxctx-<icd10>"
  name: string;
  icd10: string;
  noMedication?: boolean;
  /** Clinician marked this existing condition resolved THIS visit (raw). Feeds
   *  derived scoring as a resolved diagnosis (lifts the dimension's drag). */
  resolved?: boolean;
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
  atc?: string;
  dose: string;
  frequency: string;
  time: string;
  /** Diagnosis this was prescribed for (VisitDiagnosis.id or PrescribingContext.id). */
  linkedDiagnosisId?: string;
}

export type VaccinationStatus = "given" | "ordered";

export interface PlanVaccination {
  id: string;
  vaccine: string;
  status: VaccinationStatus;
  date?: string; // ISO — when given/ordered
  note?: string;
}

/** A lab panel ordered this visit. Markers are chosen from the full lab catalog
 *  (any test may be ordered, not just ones the patient already has). Raw data. */
export interface PlanLabOrder {
  id: string;
  /** Ordered markers — field is the patient_lab_results column key. */
  markers: { field: string; label: string }[];
  fasting: boolean;
  note?: string;
}

export interface VisitPlan {
  tasks: PlanTask[];
  referrals: PlanReferral[];
  followUp: PlanFollowUp | null;
  prescriptions: PlanPrescription[];
  // Optional so existing mock plan literals remain valid; new drafts seed [].
  vaccinations?: PlanVaccination[];
  labOrders?: PlanLabOrder[];
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
  medicationChanges: MedicationChange[];
  /** Non-medication treatments linked to diagnoses this visit. Optional so
   *  existing/legacy visit literals stay valid; new drafts seed []. */
  treatments?: VisitTreatment[];
  measurements: VisitMeasurement[];
  diagnoses: VisitDiagnosis[];
  /** Existing (baseline) diagnoses pulled in this visit to prescribe against,
   *  without re-recording them as new diagnoses. Optional so mock/legacy visit
   *  literals stay valid; new drafts seed []. */
  prescribingContexts?: PrescribingContext[];
  plan: VisitPlan;
  /**
   * Free-text clinical narrative (SOAP-style). Subjective captures what the
   * patient reports — symptoms, concerns, changes and events since last visit
   * (this replaces the former structured interval-history fields). All optional,
   * raw stored prose the doctor writes alongside the structured data.
   */
  notes: VisitNotes;
  previousVisitId: string | null; // raw link, NOT a computed "latest" flag
  // NOTE: dimension scores are NOT stored — always derived from the tagged
  // inputs above (diagnoses, medicationChanges, measurements) via derive.ts.
}

/**
 * Visit-level free-text notes. Maps to SOAP: Subjective (reported symptoms),
 * Objective (clinical observations), Assessment (overall summary). Plan prose is
 * covered by the structured plan; `general` is a catch-all.
 */
export interface VisitNotes {
  subjective?: string; // what the patient reports
  objective?: string; // physical findings / examination notes
  assessment?: string; // doctor's overall assessment / summary
  general?: string; // catch-all
}

/** Factory for empty visit notes. */
export function emptyVisitNotes(): VisitNotes {
  return {};
}

/** Factory for an empty plan. */
export function emptyVisitPlan(): VisitPlan {
  return { tasks: [], referrals: [], followUp: null, prescriptions: [], vaccinations: [], labOrders: [] };
}
