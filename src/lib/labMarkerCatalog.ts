/**
 * Authoritative catalog of every lab marker column in patient_lab_results,
 * grouped by dimension category and with display metadata for the
 * lab ingestion flow.
 *
 * The order of dimensions here drives both the verify panel and the
 * manual-entry search dropdown grouping.
 */

export type LabMarkerType = "number" | "boolean";

export type LabMarker = {
  /** DB column name in patient_lab_results */
  field: string;
  label: string;
  unit?: string;
  type: LabMarkerType;
  step?: number;
  /** Reference range hint for the verify panel */
  reference?: string;
  dimension: string;
};

export const LAB_DIMENSIONS = [
  "Cardiovascular Health",
  "Metabolic Health",
  "Endocrine & Hormonal Health",
  "Kidney Function",
  "Liver Function",
  "Nutrition & Vitamins",
  "Iron & Blood",
  "Electrolytes & Minerals",
  "Respiratory Function",
  "Genetics & Risk Markers",
  "Other",
] as const;

export type LabDimension = (typeof LAB_DIMENSIONS)[number];

export const LAB_MARKERS: LabMarker[] = [
  // Cardiovascular
  { field: "ldl_mmol_l", label: "LDL cholesterol", unit: "mmol/L", type: "number", step: 0.01, reference: "< 3.0", dimension: "Cardiovascular Health" },
  { field: "blood_pressure_systolic", label: "Blood pressure (systolic)", unit: "mmHg", type: "number", reference: "< 130", dimension: "Cardiovascular Health" },
  { field: "blood_pressure_diastolic", label: "Blood pressure (diastolic)", unit: "mmHg", type: "number", reference: "< 85", dimension: "Cardiovascular Health" },

  // Metabolic
  { field: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", type: "number", step: 0.1, reference: "20 – 42", dimension: "Metabolic Health" },

  // Endocrine
  { field: "tsh_mu_l", label: "TSH", unit: "mIU/L", type: "number", step: 0.01, reference: "0.4 – 4.0", dimension: "Endocrine & Hormonal Health" },
  { field: "free_t4_pmol_l", label: "Free T4", unit: "pmol/L", type: "number", step: 0.1, reference: "12 – 22", dimension: "Endocrine & Hormonal Health" },
  { field: "testosterone_estrogen_abnormal", label: "Testosterone / Estrogen abnormal", type: "boolean", dimension: "Endocrine & Hormonal Health" },

  // Kidney
  { field: "egfr", label: "eGFR", unit: "mL/min/1.73m²", type: "number", reference: "> 60", dimension: "Kidney Function" },
  { field: "creatinine_umol_l", label: "Creatinine", unit: "µmol/L", type: "number", reference: "45 – 110", dimension: "Kidney Function" },
  { field: "cystatin_c", label: "Cystatin C", unit: "mg/L", type: "number", step: 0.01, reference: "0.6 – 1.0", dimension: "Kidney Function" },
  { field: "urine_acr_mg_mmol", label: "Urine ACR", unit: "mg/mmol", type: "number", step: 0.1, dimension: "Kidney Function" },
  { field: "u_alb_krea_abnormal", label: "U-Alb/Krea abnormal", type: "boolean", dimension: "Kidney Function" },

  // Liver
  { field: "alat_u_l", label: "ALAT", unit: "U/L", type: "number", reference: "10 – 45", dimension: "Liver Function" },
  { field: "afos_alp_u_l", label: "AFOS / ALP", unit: "U/L", type: "number", reference: "35 – 105", dimension: "Liver Function" },
  { field: "gt_u_l", label: "GT", unit: "U/L", type: "number", reference: "10 – 65", dimension: "Liver Function" },
  { field: "alat_asat_ratio", label: "ALAT / ASAT ratio", type: "number", step: 0.01, reference: "0.8 – 1.5", dimension: "Liver Function" },

  // Nutrition & Vitamins
  { field: "vitamin_d_25oh_nmol_l", label: "Vitamin D (25-OH)", unit: "nmol/L", type: "number", reference: "> 75", dimension: "Nutrition & Vitamins" },
  { field: "vitamin_b12_total_ng_l", label: "Vitamin B12 (total)", unit: "ng/L", type: "number", reference: "200 – 900", dimension: "Nutrition & Vitamins" },
  { field: "holotranscobalamin_pmol_l", label: "Holotranscobalamin", unit: "pmol/L", type: "number", step: 0.1, dimension: "Nutrition & Vitamins" },
  { field: "folate_ug_l", label: "Folate", unit: "µg/L", type: "number", step: 0.1, reference: "> 5.9", dimension: "Nutrition & Vitamins" },
  { field: "total_protein_g_l", label: "Total protein", unit: "g/L", type: "number", step: 0.1, dimension: "Nutrition & Vitamins" },
  { field: "prealbumin_g_l", label: "Prealbumin", unit: "g/L", type: "number", step: 0.01, dimension: "Nutrition & Vitamins" },

  // Iron & Blood
  { field: "ferritin_ug_l", label: "Ferritin", unit: "µg/L", type: "number", reference: "30 – 300", dimension: "Iron & Blood" },
  { field: "iron_serum_umol_l", label: "Serum iron", unit: "µmol/L", type: "number", step: 0.1, dimension: "Iron & Blood" },
  { field: "transferrin_g_l", label: "Transferrin", unit: "g/L", type: "number", step: 0.01, dimension: "Iron & Blood" },
  { field: "transferrin_receptor_mg_l", label: "Transferrin receptor", unit: "mg/L", type: "number", step: 0.01, dimension: "Iron & Blood" },
  { field: "transferrin_saturation_pct", label: "Transferrin saturation", unit: "%", type: "number", step: 0.1, dimension: "Iron & Blood" },

  // Electrolytes & Minerals
  { field: "sodium_mmol_l", label: "Sodium", unit: "mmol/L", type: "number", reference: "136 – 145", dimension: "Electrolytes & Minerals" },
  { field: "potassium_mmol_l", label: "Potassium", unit: "mmol/L", type: "number", step: 0.1, reference: "3.5 – 5.0", dimension: "Electrolytes & Minerals" },
  { field: "calcium_mmol_l", label: "Calcium (total)", unit: "mmol/L", type: "number", step: 0.01, reference: "2.15 – 2.55", dimension: "Electrolytes & Minerals" },
  { field: "calcium_adjusted_mmol_l", label: "Calcium (adjusted)", unit: "mmol/L", type: "number", step: 0.01, dimension: "Electrolytes & Minerals" },
  { field: "calcium_ionised_mmol_l", label: "Calcium (ionised)", unit: "mmol/L", type: "number", step: 0.01, dimension: "Electrolytes & Minerals" },
  { field: "magnesium_mmol_l", label: "Magnesium", unit: "mmol/L", type: "number", step: 0.01, dimension: "Electrolytes & Minerals" },
  { field: "phosphate_mmol_l", label: "Phosphate", unit: "mmol/L", type: "number", step: 0.01, dimension: "Electrolytes & Minerals" },

  // Respiratory
  { field: "pef_percent", label: "PEF", unit: "%", type: "number", step: 0.1, reference: "> 80", dimension: "Respiratory Function" },
  { field: "fev1_percent", label: "FEV1", unit: "%", type: "number", step: 0.1, reference: "> 80", dimension: "Respiratory Function" },
  { field: "fvc_percent", label: "FVC", unit: "%", type: "number", step: 0.1, reference: "> 80", dimension: "Respiratory Function" },

  // Genetics
  { field: "apoe_e4", label: "APOE ε4", type: "boolean", dimension: "Genetics & Risk Markers" },
];

/** Lab packages — bulk add presets */
export const LAB_PACKAGES: { key: string; label: string; description: string; markers: string[] }[] = [
  {
    key: "comprehensive",
    label: "Comprehensive",
    description: "Full annual panel — all key markers across dimensions",
    markers: LAB_MARKERS.map((m) => m.field),
  },
  {
    key: "basic_metabolic",
    label: "Basic Metabolic",
    description: "Glucose, electrolytes, kidney function",
    markers: [
      "hba1c_mmol_mol", "egfr", "creatinine_umol_l",
      "sodium_mmol_l", "potassium_mmol_l", "calcium_mmol_l",
    ],
  },
  {
    key: "lipid_cardio",
    label: "Lipid & Cardiovascular",
    description: "LDL and blood pressure",
    markers: ["ldl_mmol_l", "blood_pressure_systolic", "blood_pressure_diastolic"],
  },
  {
    key: "hormones",
    label: "Hormones",
    description: "Thyroid and sex hormone screening",
    markers: ["tsh_mu_l", "free_t4_pmol_l", "testosterone_estrogen_abnormal"],
  },
  {
    key: "liver",
    label: "Liver Function",
    description: "ALAT, ALP, GT, ratios",
    markers: ["alat_u_l", "afos_alp_u_l", "gt_u_l", "alat_asat_ratio"],
  },
  {
    key: "vitamins_iron",
    label: "Vitamins & Iron",
    description: "D, B12, folate, ferritin",
    markers: ["vitamin_d_25oh_nmol_l", "vitamin_b12_total_ng_l", "folate_ug_l", "ferritin_ug_l"],
  },
];

export function getMarkerByField(field: string): LabMarker | undefined {
  return LAB_MARKERS.find((m) => m.field === field);
}

export function groupMarkersByDimension(fields: string[]): Record<string, LabMarker[]> {
  const grouped: Record<string, LabMarker[]> = {};
  for (const dim of LAB_DIMENSIONS) grouped[dim] = [];
  for (const f of fields) {
    const m = getMarkerByField(f);
    if (m) grouped[m.dimension].push(m);
  }
  return grouped;
}
