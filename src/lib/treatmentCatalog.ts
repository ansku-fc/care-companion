// Catalog of non-medication treatments — devices, therapies and interventions a
// clinician can link to a diagnosis (distinct from drug prescriptions). Raw
// reference list; the UI renders it in an alphabetical searchable dropdown,
// consistent with the medication/marker combos.

export const TREATMENT_CATALOG: string[] = [
  "BiPAP therapy",
  "Cardiac rehabilitation",
  "Cognitive behavioural therapy (CBT)",
  "Compression stockings",
  "Continuous glucose monitor (CGM)",
  "CPAP therapy",
  "Dietitian referral",
  "Exercise program",
  "Low-carb diet",
  "Low-sodium diet",
  "Mandibular advancement device",
  "Occupational therapy",
  "Physiotherapy",
  "Positional therapy",
  "Pulmonary rehabilitation",
  "Smoking cessation program",
  "Weight-management program",
].sort((a, b) => a.localeCompare(b));
