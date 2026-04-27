/**
 * Unified registry mapping biomarkers to sub-dimensions, and providing
 * helpers for the new top-level overview / focused sub-dimension pages.
 */

export type BiomarkerDef = {
  key: string;
  label: string;
  sidebarLabel?: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  /** Sub-dimension key this biomarker belongs to */
  subDimension: string;
};

/**
 * Biomarker → sub-dimension mapping. Sub-dimension keys come from
 * HEALTH_TAXONOMY in src/lib/healthDimensions.ts.
 */
export const ALL_BIOMARKERS: BiomarkerDef[] = [
  // ── Cardiovascular (no subs, parent key) ─────────────────────
  { key: "ldl_mmol_l", label: "LDL", unit: "mmol/L", refHigh: 3.0, subDimension: "cardiovascular" },
  { key: "total_cholesterol_mmol_l", label: "Total cholesterol", unit: "mmol/L", refHigh: 5.0, subDimension: "cardiovascular" },
  { key: "hdl_mmol_l", label: "HDL", unit: "mmol/L", refLow: 1.0, subDimension: "cardiovascular" },
  { key: "triglycerides_mmol_l", label: "Triglycerides", unit: "mmol/L", refHigh: 1.7, subDimension: "cardiovascular" },
  { key: "blood_pressure_systolic", label: "Blood Pressure", sidebarLabel: "Blood Pressure (Systolic / Diastolic)", unit: "mmHg", refLow: 60, refHigh: 140, subDimension: "cardiovascular" },
  { key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refHigh: 42, subDimension: "cardiovascular" },

  // ── Metabolic ─────────────────────────────────────────────────
  // Kidneys
  { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refLow: 60, subDimension: "kidneys" },
  { key: "creatinine_umol_l", label: "Creatinine", unit: "µmol/L", refLow: 45, refHigh: 110, subDimension: "kidneys" },
  // Metabolism
  { key: "fasting_glucose_mmol_l", label: "Fasting Glucose", unit: "mmol/L", refLow: 3.9, refHigh: 5.6, subDimension: "metabolism" },
  { key: "hba1c_metabolic", label: "HbA1c", unit: "mmol/mol", refHigh: 42, subDimension: "metabolism" },
  // Endocrine
  { key: "tsh_mu_l", label: "TSH", unit: "mIU/L", refLow: 0.4, refHigh: 4.0, subDimension: "endocrine" },
  { key: "free_t4_pmol_l", label: "Free T4", unit: "pmol/L", refLow: 12, refHigh: 22, subDimension: "endocrine" },
  // Nutrition
  { key: "vitamin_d_25oh_nmol_l", label: "Vitamin D (25-OH)", unit: "nmol/L", refLow: 75, subDimension: "nutrition" },
  { key: "vitamin_b12_total_ng_l", label: "Vitamin B12", unit: "ng/L", refLow: 200, refHigh: 900, subDimension: "nutrition" },
  { key: "ferritin_ug_l", label: "Ferritin", unit: "µg/L", refLow: 30, refHigh: 300, subDimension: "nutrition" },
  { key: "folate_ug_l", label: "Folate", unit: "µg/L", refLow: 5.9, subDimension: "nutrition" },
  // Body composition / electrolytes (mapped to body composition for now)
  { key: "potassium_mmol_l", label: "Potassium", unit: "mmol/L", refLow: 3.5, refHigh: 5.0, subDimension: "body_composition" },
  { key: "sodium_mmol_l", label: "Sodium", unit: "mmol/L", refLow: 136, refHigh: 145, subDimension: "body_composition" },
  { key: "calcium_mmol_l", label: "Calcium", unit: "mmol/L", refLow: 2.15, refHigh: 2.55, subDimension: "body_composition" },

  // ── Digestion ─────────────────────────────────────────────────
  // Liver
  { key: "alat_u_l", label: "ALAT", unit: "U/L", refHigh: 50, subDimension: "liver" },
  { key: "afos_alp_u_l", label: "AFOS/ALP", unit: "U/L", refLow: 35, refHigh: 105, subDimension: "liver" },
  { key: "gt_u_l", label: "GT", unit: "U/L", refHigh: 60, subDimension: "liver" },
  { key: "alat_asat_ratio", label: "ALAT/ASAT Ratio", unit: "", refHigh: 1.0, subDimension: "liver" },
];

/** All biomarkers belonging to the given main-dimension key (incl. sub-dims). */
export function getBiomarkersForMainDimension(
  mainKey: string,
  subKeys: string[],
): BiomarkerDef[] {
  return ALL_BIOMARKERS.filter(
    (b) => b.subDimension === mainKey || subKeys.includes(b.subDimension),
  );
}

/** Biomarkers for a single sub-dimension. */
export function getBiomarkersForSubDimension(subKey: string): BiomarkerDef[] {
  return ALL_BIOMARKERS.filter((b) => b.subDimension === subKey);
}
