// Synthetic seed visits for the demo patient (Carter, Jay-Z).
//
// RAW DATA ONLY. Every field here is something a clinician typed or selected.
// No bands, tones, trends, diffs or "isLatest" flags — those are derived in
// derive.ts. The repository clones this array; the UI never imports it directly.

import { CARTER_PATIENT_ID } from "@/lib/patientClinicalData";
import type { ClinicalVisit } from "./types";

export const MOCK_VISITS: ClinicalVisit[] = [
  {
    id: "visit-carter-2026-03-10",
    patientId: CARTER_PATIENT_ID,
    date: "2026-03-10",
    clinician: "Dr. Laine",
    reason: "FOLLOWUP_CONSULTATION",
    reasonNote: "Routine cardiometabolic follow-up",
    status: "completed",
    previousVisitId: null,
    intervalHistory: {
      newSymptoms: [],
      medicationChanges: [
        {
          id: "mc-1",
          medicationName: "Atorvastatin",
          atc: "C10AA05",
          change: "dose_changed",
          detail: "10mg → 20mg",
        },
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
    dimensionUpdates: [
      { dimension: "cardiovascular", newScore: 7.2, finding: "BP above target on current therapy; statin uptitrated.", flaggedForReview: true },
      { dimension: "metabolic", newScore: 6.4, finding: "HbA1c trending up; reinforce lifestyle.", flaggedForReview: false },
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
    intervalHistory: {
      newSymptoms: [
        { id: "s-1", description: "Occasional heartburn after evening meals", dimensions: ["digestion"], onset: "2026-05-01" },
      ],
      medicationChanges: [
        { id: "mc-2", medicationName: "Omeprazole", atc: "A02BC01", change: "continued" },
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
    dimensionUpdates: [
      { dimension: "cardiovascular", newScore: 6.5, finding: "BP improving; LDL closer to target.", flaggedForReview: false },
      { dimension: "digestion", newScore: 4.2, finding: "New reflux symptoms; continue PPI, review in 3 months.", flaggedForReview: true },
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
];
