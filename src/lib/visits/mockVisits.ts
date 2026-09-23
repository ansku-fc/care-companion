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
    notes: {
      subjective:
        "Reports feeling generally well but reduced energy and occasional exertional breathlessness climbing stairs over recent months. Busy, high-travel year with irregular meals and little regular exercise. Baseline visit — new to therapy.",
      objective:
        "Overweight with central adiposity. Heart sounds normal, no murmurs. Chest clear. No peripheral oedema. BP elevated on repeat measurement.",
      assessment:
        "New diagnoses of essential hypertension and type 2 diabetes; cardiometabolic risk is the priority. Commenced first-line pharmacotherapy alongside structured lifestyle change.",
    },
    diagnoses: [
      { id: "dx-a1", name: "Essential Hypertension", icd10: "I10", status: "active", dimensions: ["cardiovascular"] },
      { id: "dx-a2", name: "Type 2 Diabetes Mellitus", icd10: "E11", status: "active", dimensions: ["metabolic"] },
    ],
    medicationChanges: [
      { id: "mc-a1", medicationName: "Lisinopril", atc: "C09AA03", change: "started", detail: "New — 10mg once daily", dimensions: ["cardiovascular"] },
      { id: "mc-a2", medicationName: "Metformin", atc: "A10BA02", change: "started", detail: "New — 500mg twice daily", dimensions: ["metabolic"] },
    ],
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
    notes: {
      subjective:
        "5-day history of productive cough, wheeze and low-grade fever. No chest pain, no haemoptysis, no breathlessness at rest. Good adherence to antihypertensives and metformin.",
      objective:
        "Temperature 37.9°C, SpO2 96% on air. Scattered wheeze on auscultation, no focal crepitations. Not systemically unwell.",
      assessment: "Community-acquired lower respiratory tract infection. Safety-netted; antibiotics started.",
    },
    diagnoses: [
      { id: "dx-b1", name: "Acute bronchitis", icd10: "J20", status: "active", dimensions: ["respiratory_immune"] },
    ],
    medicationChanges: [
      { id: "mc-b1", medicationName: "Amoxicillin", atc: "J01CA04", change: "started", detail: "7-day course", dimensions: ["respiratory_immune"] },
    ],
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
    notes: {
      subjective: "No new symptoms. Chest infection fully resolved. Good adherence reported.",
      assessment: "Lipids still above target — statin started. Glucose control improving on metformin + lifestyle.",
    },
    diagnoses: [
      { id: "dx-c1", name: "Hyperlipidaemia", icd10: "E78.5", status: "active", dimensions: ["cardiovascular", "metabolic"] },
    ],
    medicationChanges: [
      { id: "mc-c1", medicationName: "Atorvastatin", atc: "C10AA05", change: "started", detail: "New — 10mg once daily", dimensions: ["cardiovascular"] },
    ],
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
    notes: {
      subjective:
        "Feeling well overall; no chest pain or palpitations. Started a new, more sedentary desk role. Good adherence reported.",
      assessment: "BP above target on current therapy; statin uptitrated. HbA1c trending up — reinforce lifestyle.",
    },
    diagnoses: [],
    medicationChanges: [
      { id: "mc-1", medicationName: "Atorvastatin", atc: "C10AA05", change: "dose_changed", detail: "10mg → 20mg", dimensions: ["cardiovascular"] },
    ],
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
    notes: {
      subjective:
        "Occasional heartburn after evening meals for ~6 weeks. No dysphagia, weight loss or alarm features; reflux manageable. Admits missing occasional evening statin doses.",
      objective: "Abdomen soft, non-tender. BP improved versus prior review. Otherwise unremarkable examination.",
      assessment:
        "New mild GERD — trial PPI with lifestyle advice. Cardiovascular risk improving; reinforce statin adherence (evening dosing).",
    },
    diagnoses: [
      { id: "dx-e1", name: "Gastroesophageal Reflux Disease", icd10: "K21.0", status: "active", dimensions: ["digestion"] },
    ],
    medicationChanges: [
      { id: "mc-2", medicationName: "Omeprazole", atc: "A02BC01", change: "continued", dimensions: ["digestion"] },
    ],
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
    notes: {
      subjective: "Feeling well, no new concerns. Returned to a regular gym routine. Reflux resolved. Excellent adherence.",
      objective: "BP at target. Weight down 4 kg since last review. Examination unremarkable.",
      assessment: "Best cardiometabolic profile to date. Continue current regimen; interim check in 6 months.",
      general: "Excellent engagement with the lifestyle plan this year.",
    },
    diagnoses: [],
    medicationChanges: [
      { id: "mc-d1", medicationName: "Atorvastatin", atc: "C10AA05", change: "continued", dimensions: ["cardiovascular"] },
    ],
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
