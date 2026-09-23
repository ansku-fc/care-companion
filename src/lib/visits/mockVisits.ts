// Synthetic seed visits for the demo patient (Carter, Jay-Z).
//
// RAW DATA ONLY. Every field here is something a clinician typed, selected, or
// tagged. Dimension SCORES are never stored — they are derived from the tagged
// inputs (diagnoses, medicationChanges, measurements) plus the patient baseline
// below, via derive.ts. The repository clones this data; the UI never imports it.

import { CARTER_PATIENT_ID } from "@/lib/patientClinicalData";
import type { ClinicalVisit, PatientBaseline } from "./types";

/** Raw standing dimension scores the clinician carries into a visit (per patient). */
export const PATIENT_BASELINES: Record<string, PatientBaseline> = {
  [CARTER_PATIENT_ID]: {
    cardiovascular: 6.5,
    metabolic: 6.2,
    digestion: 4.0,
    brain_mental: 3.0,
    respiratory_immune: 2.5,
    exercise_functional: 4.5,
    cancer_risk: 3.5,
    skin_oral_mucosal: 2.5,
    reproductive_sexual: 2.5,
  },
};

export const MOCK_VISITS: ClinicalVisit[] = [
  {
    id: "visit-carter-2025-06-20",
    patientId: CARTER_PATIENT_ID,
    date: "2025-06-20",
    clinician: "Dr. Laine",
    reason: "ANNUAL_CHECKUP",
    reasonNote: "Comprehensive annual check-up (baseline)",
    status: "completed",
    previousVisitId: null,
    diagnoses: [
      { id: "dx-a1", name: "Essential Hypertension", icd10: "I10", status: "active", dimensions: ["cardiovascular"] },
      { id: "dx-a2", name: "Type 2 Diabetes Mellitus", icd10: "E11", status: "active", dimensions: ["metabolic"] },
    ],
    intervalHistory: {
      newSymptoms: [
        { id: "s-a1", description: "Occasional exertional breathlessness climbing stairs", dimensions: ["cardiovascular"], onset: "2025-04-01" },
      ],
      medicationChanges: [
        { id: "mc-a1", medicationName: "Lisinopril", atc: "C09AA03", change: "started", detail: "New — 10mg once daily", dimensions: ["cardiovascular"] },
        { id: "mc-a2", medicationName: "Metformin", atc: "A10BA02", change: "started", detail: "New — 500mg twice daily", dimensions: ["metabolic"] },
      ],
      lifeEvents: ["High-travel year with irregular meals"],
      adherenceNote: "N/A — new to therapy.",
      freeText: "Baseline visit. Hypertension and impaired glucose confirmed on labs.",
    },
    measurements: [
      { id: "m-a1", kind: "vital", marker: "Systolic BP", value: 150, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-a2", kind: "vital", marker: "Diastolic BP", value: 95, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-a3", kind: "lab", marker: "LDL", value: 3.6, unit: "mmol/L", source: "reviewed", dimensions: ["cardiovascular", "metabolic"] },
      { id: "m-a4", kind: "lab", marker: "HbA1c", value: 55, unit: "mmol/mol", source: "reviewed", dimensions: ["metabolic"] },
    ],
    plan: {
      tasks: [
        { id: "t-a1", title: "Baseline renal function + electrolytes", priority: "high", category: "clinical", assignee: "Nurse Mäkinen", dueDate: "2025-07-04" },
      ],
      referrals: [
        { id: "r-a1", specialty: "Dietetics", referTo: "", assignee: "Nurse Mäkinen", dueDate: "2025-07-11", notes: "Structured lifestyle & nutrition programme." },
      ],
      followUp: { id: "f-a1", visitType: "ACUTE_CONSULTATION", timeframe: "3 months", with: "Dr. Laine", notes: "Reassess BP and glucose control." },
      prescriptions: [
        { id: "p-a1", medicationName: "Lisinopril", dose: "10mg", frequency: "Once daily", time: "Morning" },
        { id: "p-a2", medicationName: "Metformin", dose: "500mg", frequency: "Twice daily", time: "With meals" },
      ],
    },
  },
  {
    id: "visit-carter-2025-10-08",
    patientId: CARTER_PATIENT_ID,
    date: "2025-10-08",
    clinician: "Dr. Laine",
    reason: "ACUTE_CONSULTATION",
    reasonNote: "Acute lower respiratory tract infection",
    status: "completed",
    previousVisitId: "visit-carter-2025-06-20",
    diagnoses: [
      { id: "dx-b1", name: "Acute bronchitis", icd10: "J20", status: "active", dimensions: ["respiratory_immune"] },
    ],
    intervalHistory: {
      newSymptoms: [
        { id: "s-b1", description: "Productive cough, wheeze and low-grade fever for 5 days", dimensions: ["respiratory_immune"], onset: "2025-10-03" },
      ],
      medicationChanges: [
        { id: "mc-b1", medicationName: "Amoxicillin", atc: "J01CA04", change: "started", detail: "7-day course", dimensions: ["respiratory_immune"] },
      ],
      lifeEvents: [],
      adherenceNote: "Good adherence to antihypertensives and metformin.",
      freeText: "No red-flag features; managed as community-acquired LRTI.",
    },
    measurements: [
      { id: "m-b1", kind: "vital", marker: "Temperature", value: 37.9, unit: "°C", source: "measured_today", dimensions: ["respiratory_immune"] },
      { id: "m-b2", kind: "vital", marker: "SpO2", value: 96, unit: "%", source: "measured_today", dimensions: ["respiratory_immune"] },
      { id: "m-b3", kind: "vital", marker: "Systolic BP", value: 144, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
    ],
    plan: {
      tasks: [
        { id: "t-b1", title: "Safety-net call if not improving in 72h", priority: "medium", category: "care_coordination", assignee: "Nurse Mäkinen", dueDate: "2025-10-11" },
      ],
      referrals: [],
      followUp: null,
      prescriptions: [
        { id: "p-b1", medicationName: "Amoxicillin", dose: "500mg", frequency: "Three times daily", time: "7 days" },
      ],
    },
  },
  {
    id: "visit-carter-2025-12-15",
    patientId: CARTER_PATIENT_ID,
    date: "2025-12-15",
    clinician: "Dr. Laine",
    reason: "RESULTS_REVIEW_CALL",
    reasonNote: "Lipid & glucose results review",
    status: "completed",
    previousVisitId: "visit-carter-2025-10-08",
    diagnoses: [
      { id: "dx-c1", name: "Hyperlipidaemia", icd10: "E78.5", status: "active", dimensions: ["cardiovascular", "metabolic"] },
    ],
    intervalHistory: {
      newSymptoms: [],
      medicationChanges: [
        { id: "mc-c1", medicationName: "Atorvastatin", atc: "C10AA05", change: "started", detail: "New — 10mg once daily", dimensions: ["cardiovascular"] },
      ],
      lifeEvents: [],
      adherenceNote: "Good adherence reported.",
      freeText: "Chest infection fully resolved. Lipids still above target — statin started.",
    },
    measurements: [
      { id: "m-c1", kind: "lab", marker: "LDL", value: 3.4, unit: "mmol/L", source: "reviewed", dimensions: ["cardiovascular", "metabolic"] },
      { id: "m-c2", kind: "lab", marker: "HbA1c", value: 53, unit: "mmol/mol", source: "reviewed", dimensions: ["metabolic"] },
    ],
    plan: {
      tasks: [],
      referrals: [],
      followUp: { id: "f-c1", visitType: "FOLLOWUP_CONSULTATION", timeframe: "3 months", with: "Dr. Laine", notes: "Cardiometabolic follow-up." },
      prescriptions: [
        { id: "p-c1", medicationName: "Atorvastatin", dose: "10mg", frequency: "Once daily", time: "Evening" },
      ],
    },
  },
  {
    id: "visit-carter-2026-03-10",
    patientId: CARTER_PATIENT_ID,
    date: "2026-03-10",
    clinician: "Dr. Laine",
    reason: "FOLLOWUP_CONSULTATION",
    reasonNote: "Routine cardiometabolic follow-up",
    status: "completed",
    previousVisitId: "visit-carter-2025-12-15",
    diagnoses: [],
    intervalHistory: {
      newSymptoms: [],
      medicationChanges: [
        { id: "mc-1", medicationName: "Atorvastatin", atc: "C10AA05", change: "dose_changed", detail: "10mg → 20mg", dimensions: ["cardiovascular"] },
      ],
      lifeEvents: ["Started a new, more sedentary desk role"],
      adherenceNote: "Good adherence reported.",
      freeText: "Feeling well overall; no chest pain or palpitations.",
    },
    measurements: [
      { id: "m-1", kind: "vital", marker: "Systolic BP", value: 142, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-2", kind: "vital", marker: "Diastolic BP", value: 88, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-3", kind: "lab", marker: "LDL", value: 3.1, unit: "mmol/L", source: "reviewed", dimensions: ["cardiovascular", "metabolic"] },
      { id: "m-4", kind: "lab", marker: "HbA1c", value: 51, unit: "mmol/mol", source: "reviewed", dimensions: ["metabolic"] },
    ],
    plan: {
      tasks: [
        { id: "t-1", title: "Recheck lipid panel in 12 weeks", priority: "medium", category: "clinical", assignee: "Nurse Mäkinen", dueDate: "2026-06-02" },
      ],
      referrals: [],
      followUp: { id: "f-1", visitType: "FOLLOWUP_CONSULTATION", timeframe: "3 months", with: "Dr. Laine", notes: "Review BP and repeat lipids." },
      prescriptions: [
        { id: "p-1", medicationName: "Atorvastatin", dose: "20mg", frequency: "Once daily", time: "Evening" },
      ],
    },
  },
  {
    id: "visit-carter-2026-06-16",
    patientId: CARTER_PATIENT_ID,
    date: "2026-06-16",
    clinician: "Dr. Laine",
    reason: "FOLLOWUP_CONSULTATION",
    reasonNote: "Cardiovascular & liver review",
    status: "completed",
    previousVisitId: "visit-carter-2026-03-10",
    diagnoses: [
      { id: "dx-e1", name: "Gastroesophageal Reflux Disease", icd10: "K21.0", status: "active", dimensions: ["digestion"] },
    ],
    intervalHistory: {
      newSymptoms: [
        { id: "s-1", description: "Occasional heartburn after evening meals", dimensions: ["digestion"], onset: "2026-05-01" },
      ],
      medicationChanges: [
        { id: "mc-2", medicationName: "Omeprazole", atc: "A02BC01", change: "continued", dimensions: ["digestion"] },
      ],
      lifeEvents: [],
      adherenceNote: "Missed occasional evening statin doses.",
      freeText: "Reflux symptoms manageable; no alarm features.",
    },
    measurements: [
      { id: "m-5", kind: "vital", marker: "Systolic BP", value: 136, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-6", kind: "vital", marker: "Diastolic BP", value: 84, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-7", kind: "lab", marker: "LDL", value: 2.7, unit: "mmol/L", source: "reviewed", dimensions: ["cardiovascular", "metabolic"] },
      { id: "m-8", kind: "lab", marker: "ALAT", value: 42, unit: "U/L", source: "reviewed", dimensions: ["digestion"] },
    ],
    plan: {
      tasks: [
        { id: "t-2", title: "Reinforce statin adherence — evening dosing", priority: "low", category: "clinical", assignee: "Dr. Laine", dueDate: "2026-06-23" },
      ],
      referrals: [],
      followUp: { id: "f-2", visitType: "FOLLOWUP_CONSULTATION", timeframe: "3 months", with: "Dr. Laine", notes: "Reassess reflux and BP." },
      prescriptions: [],
    },
  },
  {
    id: "visit-carter-2026-09-08",
    patientId: CARTER_PATIENT_ID,
    date: "2026-09-08",
    clinician: "Dr. Laine",
    reason: "ANNUAL_CHECKUP",
    reasonNote: "Annual check-up",
    status: "completed",
    previousVisitId: "visit-carter-2026-06-16",
    diagnoses: [],
    intervalHistory: {
      newSymptoms: [],
      medicationChanges: [
        { id: "mc-d1", medicationName: "Atorvastatin", atc: "C10AA05", change: "continued", dimensions: ["cardiovascular"] },
      ],
      lifeEvents: ["Returned to regular gym routine"],
      adherenceNote: "Excellent adherence; reflux resolved.",
      freeText: "Best cardiometabolic profile to date. Continue current regimen.",
    },
    measurements: [
      { id: "m-d1", kind: "vital", marker: "Systolic BP", value: 128, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-d2", kind: "vital", marker: "Diastolic BP", value: 80, unit: "mmHg", source: "measured_today", dimensions: ["cardiovascular"] },
      { id: "m-d3", kind: "lab", marker: "LDL", value: 2.4, unit: "mmol/L", source: "reviewed", dimensions: ["cardiovascular", "metabolic"] },
      { id: "m-d4", kind: "lab", marker: "HbA1c", value: 48, unit: "mmol/mol", source: "reviewed", dimensions: ["metabolic"] },
    ],
    plan: {
      tasks: [
        { id: "t-d1", title: "Annual bloods in 12 months", priority: "low", category: "clinical", assignee: "Nurse Mäkinen", dueDate: "2027-09-08" },
      ],
      referrals: [],
      followUp: { id: "f-d1", visitType: "ANNUAL_CHECKUP", timeframe: "6 months", with: "Dr. Laine", notes: "Interim cardiometabolic check." },
      prescriptions: [],
    },
  },
];
