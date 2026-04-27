// Lab order shared logic — package definitions and helpers.
// Used by the New Visit dialog, the visit detail view, and the nurse task panel.

export type LabPackageKey = "basic" | "cardiovascular" | "metabolic" | "comprehensive" | "custom";

export const LAB_PACKAGES: { key: LabPackageKey; label: string; markers: string[] }[] = [
  {
    key: "basic",
    label: "Basic",
    markers: ["CBC", "Glucose", "CRP"],
  },
  {
    key: "cardiovascular",
    label: "Cardiovascular",
    markers: ["LDL", "HDL", "Total cholesterol", "Triglycerides", "Glucose", "HbA1c"],
  },
  {
    key: "metabolic",
    label: "Metabolic",
    markers: ["HbA1c", "Fasting glucose", "Insulin", "ALAT", "ASAT", "TSH", "T4"],
  },
  {
    key: "comprehensive",
    label: "Comprehensive",
    markers: [
      "CBC", "Glucose", "CRP",
      "LDL", "HDL", "Total cholesterol", "Triglycerides", "HbA1c",
      "Fasting glucose", "Insulin", "ALAT", "ASAT", "TSH", "T4",
      "Vitamin D", "Vitamin B12", "Ferritin", "Iron", "Folate",
      "Testosterone/Estradiol", "Cortisol", "Magnesium", "Zinc",
    ],
  },
];

// All known individual markers (for the Custom search box).
export const ALL_MARKERS: string[] = Array.from(
  new Set(LAB_PACKAGES.flatMap((p) => p.markers).concat([
    "ASAT", "GT", "ALP", "Creatinine", "eGFR", "Cystatin C",
    "Sodium", "Potassium", "Calcium", "Phosphate", "Albumin",
    "PSA", "FSH", "LH", "Prolactin",
  ]))
).sort();

export function dedupeMarkers(markers: string[]): string[] {
  return Array.from(new Set(markers.map((m) => m.trim()).filter(Boolean)));
}

export function markersForPackages(keys: LabPackageKey[]): string[] {
  const all = keys.flatMap((k) => LAB_PACKAGES.find((p) => p.key === k)?.markers ?? []);
  return dedupeMarkers(all);
}

export const LAB_DESTINATIONS = ["HUSLAB", "Synlab", "Terveystalo Lab", "Mehiläinen Lab", "Other"] as const;
export type LabDestination = typeof LAB_DESTINATIONS[number];

export const VISIT_TYPES = [
  { key: "onboarding",     label: "Onboarding" },
  { key: "annual_checkup", label: "Annual Check-up" },
  { key: "acute",          label: "Acute Visit" },
  { key: "laboratory",     label: "Laboratory" },
] as const;
export type VisitType = typeof VISIT_TYPES[number]["key"];

export const VISIT_MODES = [
  { key: "in_person", label: "In-person consultation" },
  { key: "remote",    label: "Phone / Remote" },
  { key: "home",      label: "Home Visit" },
] as const;
export type VisitMode = typeof VISIT_MODES[number]["key"];

export function visitTypeLabel(t?: string | null): string {
  return VISIT_TYPES.find((v) => v.key === t)?.label ?? (t ?? "");
}
export function visitModeLabel(m?: string | null): string {
  return VISIT_MODES.find((v) => v.key === m)?.label ?? (m ?? "");
}

export function defaultLabOrderToggle(visitType: VisitType): boolean {
  return visitType === "onboarding" || visitType === "annual_checkup" || visitType === "laboratory";
}
export function isLabOrderRequired(visitType: VisitType): boolean {
  return visitType === "laboratory";
}

export type LabOrderStatus = "pending" | "sent" | "results_received";
export function labOrderStatusLabel(s: LabOrderStatus): string {
  return s === "pending" ? "Pending" : s === "sent" ? "Sent" : "Results Received";
}
