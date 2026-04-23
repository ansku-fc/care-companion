// Single source of truth for Carter, Jay-Z's clinical data (diagnoses,
// medications, drug interactions). Used by overview, medications page,
// dimension pages, and health-data page so updates stay consistent.

export type ClinicalDimensionKey =
  | "Cardiovascular Health"
  | "Metabolic Health"
  | "Brain & Mental Health"
  | "Digestion"
  | "Respiratory & Immune Health"
  | "Exercise & Functional Health"
  | "Other";

// Map dimension label -> health-taxonomy main key (for navigation)
export const DIMENSION_LABEL_TO_KEY: Record<ClinicalDimensionKey, string> = {
  "Cardiovascular Health": "cardiovascular",
  "Metabolic Health": "metabolic",
  "Brain & Mental Health": "brain_mental",
  "Digestion": "digestion",
  "Respiratory & Immune Health": "respiratory_immune",
  "Exercise & Functional Health": "exercise_functional",
  "Other": "cardiovascular",
};

export type Diagnosis = {
  id: string;
  name: string;
  icd10: string;
  dimension: ClinicalDimensionKey;
  diagnosedDate: string; // ISO yyyy-mm-dd
  status: "active" | "resolved";
  resolvedDate?: string;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  indication: string;
  dimension: ClinicalDimensionKey;
  startDate: string; // ISO yyyy-mm-dd
  endDate?: string;
  remainingPills: number;
  totalPills: number;
  renewalDate?: string;
  status: "active" | "past";
  prn?: boolean;
};

export type DrugInteraction = {
  drugs: [string, string];
  severity: "severe" | "moderate" | "mild";
  description: string;
};

// ── Carter, Jay-Z — Active diagnoses ───────────────────────────────
export const CARTER_DIAGNOSES: Diagnosis[] = [
  { id: "d1", name: "Essential Hypertension",            icd10: "I10",   dimension: "Cardiovascular Health", diagnosedDate: "2022-03-14", status: "active" },
  { id: "d2", name: "Type 2 Diabetes Mellitus",          icd10: "E11",   dimension: "Metabolic Health",      diagnosedDate: "2021-06-08", status: "active" },
  { id: "d3", name: "Hyperlipidaemia",                   icd10: "E78.5", dimension: "Cardiovascular Health", diagnosedDate: "2022-03-14", status: "active" },
  { id: "d4", name: "Obstructive Sleep Apnoea",          icd10: "G47.3", dimension: "Brain & Mental Health", diagnosedDate: "2023-09-22", status: "active" },
  { id: "d5", name: "Gastroesophageal Reflux Disease",   icd10: "K21.0", dimension: "Digestion",             diagnosedDate: "2020-02-05", status: "active" },
  // Past
  { id: "d-past-1", name: "Acute pericarditis", icd10: "I30.9", dimension: "Cardiovascular Health", diagnosedDate: "2021-06-04", resolvedDate: "2021-09-12", status: "resolved" },
];

// ── Carter, Jay-Z — Active medications ─────────────────────────────
export const CARTER_MEDICATIONS: Medication[] = [
  { id: "m1", name: "Lisinopril",   dose: "10 mg",  frequency: "Once daily (morning)",   indication: "Hypertension",        dimension: "Cardiovascular Health", startDate: "2022-03-20", remainingPills: 42, totalPills: 90,  renewalDate: "2026-06-02", status: "active" },
  { id: "m2", name: "Metformin",    dose: "500 mg", frequency: "Twice daily with meals", indication: "Type 2 Diabetes",     dimension: "Metabolic Health",      startDate: "2021-06-15", remainingPills: 6,  totalPills: 180, renewalDate: "2026-04-29", status: "active" },
  { id: "m3", name: "Atorvastatin", dose: "20 mg",  frequency: "Once daily (evening)",   indication: "Hyperlipidaemia",     dimension: "Cardiovascular Health", startDate: "2022-03-20", remainingPills: 18, totalPills: 90,  renewalDate: "2026-05-08", status: "active" },
  { id: "m4", name: "Warfarin",     dose: "5 mg",   frequency: "Once daily",             indication: "Cardiovascular risk", dimension: "Cardiovascular Health", startDate: "2023-01-01", remainingPills: 55, totalPills: 90,  renewalDate: "2026-06-15", status: "active" },
  { id: "m5", name: "Sertraline",   dose: "50 mg",  frequency: "Once daily (morning)",   indication: "Sleep & mood support", dimension: "Brain & Mental Health", startDate: "2023-10-10", remainingPills: 30, totalPills: 90,  renewalDate: "2026-05-20", status: "active" },
  { id: "m6", name: "Ibuprofen",    dose: "400 mg", frequency: "As needed (PRN)",        indication: "Pain relief",         dimension: "Digestion",             startDate: "2020-01-01", remainingPills: 12, totalPills: 60,  renewalDate: "2026-05-15", status: "active", prn: true },
  { id: "m7", name: "Omeprazole",   dose: "20 mg",  frequency: "Once daily (fasting)",   indication: "GERD",                dimension: "Digestion",             startDate: "2020-02-10", remainingPills: 28, totalPills: 90,  renewalDate: "2026-05-28", status: "active" },
];

// ── Carter, Jay-Z — Drug interactions ───────────────────────────────
export const CARTER_INTERACTIONS: DrugInteraction[] = [
  { drugs: ["Warfarin", "Ibuprofen"],    severity: "severe",   description: "NSAIDs significantly increase bleeding risk when combined with anticoagulants. Avoid concurrent use." },
  { drugs: ["Warfarin", "Sertraline"],   severity: "moderate", description: "SSRIs may potentiate anticoagulant effect — monitor INR closely." },
  { drugs: ["Lisinopril", "Ibuprofen"],  severity: "moderate", description: "NSAIDs reduce ACE inhibitor efficacy and raise renal injury risk." },
  { drugs: ["Atorvastatin", "Warfarin"], severity: "mild",     description: "May modestly increase INR — periodic monitoring advised." },
];

// Carter's patient ID — single demo patient
export const CARTER_PATIENT_ID = "1614799a-55ca-495a-b41a-f510d4cefa11";

export function isCarter(patientId?: string | null, patientName?: string | null): boolean {
  if (patientId && patientId === CARTER_PATIENT_ID) return true;
  if (patientName && /carter/i.test(patientName) && /jay-?z/i.test(patientName)) return true;
  return false;
}

// Helpers --------------------------------------------------------------
export function getDiagnosesForDimension(label: ClinicalDimensionKey): Diagnosis[] {
  return CARTER_DIAGNOSES.filter((d) => d.dimension === label && d.status === "active");
}

export function getMedicationsForDimension(label: ClinicalDimensionKey): Medication[] {
  return CARTER_MEDICATIONS.filter((m) => m.dimension === label && m.status === "active");
}

export function getInteractionsForDimension(label: ClinicalDimensionKey): DrugInteraction[] {
  const names = new Set(getMedicationsForDimension(label).map((m) => m.name));
  return CARTER_INTERACTIONS.filter(
    (i) => names.has(i.drugs[0]) || names.has(i.drugs[1]),
  );
}

// Format date as "DD MMM YYYY" (e.g. "14 Mar 2022")
export function fmtClinicalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
