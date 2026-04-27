/**
 * Single source of truth for the lab marker categories shown on:
 *   • The main "Laboratory Results" page (table + graphs)
 *   • Every health-dimension drill-down → "Lab Results" tab
 *
 * Both views read from this list so markers, units, ordering, and grouping
 * stay perfectly in sync.
 */

export type LabMarkerRow = {
  label: string;
  unit: string;
  /** DB column key on patient_lab_results, or "_bp" for the synthetic systolic/diastolic combo. */
  key: string;
  refLow?: number;
  refHigh?: number;
  /** Optional sub-dimension key (from healthDimensions taxonomy) for sub-dim drill-downs. */
  subDimension?: string;
};

export type LabMarkerCategory = {
  /** Display title — identical to what the main lab table shows. */
  title: string;
  /** Main-dimension key from healthDimensions.HEALTH_TAXONOMY. Used to filter for dimension views. */
  mainDimension: string;
  rows: LabMarkerRow[];
};

/**
 * Master list. ORDER MATTERS — both views render in this exact sequence.
 */
export const LAB_MARKER_CATEGORIES: LabMarkerCategory[] = [
  {
    title: "Cardiovascular & Metabolic Health",
    mainDimension: "cardiovascular",
    rows: [
      { label: "LDL", unit: "mmol/l", key: "ldl_mmol_l", refHigh: 3.0 },
      { label: "HbA1c", unit: "mmol/mol", key: "hba1c_mmol_mol", refHigh: 42 },
    ],
  },
  {
    title: "Liver Function",
    mainDimension: "digestion",
    rows: [
      { label: "ALAT", unit: "U/l", key: "alat_u_l", refHigh: 50, subDimension: "liver" },
      { label: "AFOS / ALP", unit: "U/l", key: "afos_alp_u_l", refLow: 35, refHigh: 105, subDimension: "liver" },
      { label: "GT", unit: "U/l", key: "gt_u_l", refHigh: 60, subDimension: "liver" },
      { label: "ALAT / ASAT ratio", unit: "", key: "alat_asat_ratio", refHigh: 1.0, subDimension: "liver" },
    ],
  },
  {
    title: "Kidney Function",
    mainDimension: "metabolic",
    rows: [
      { label: "eGFR", unit: "ml/min/1.73 m²", key: "egfr", refLow: 60, subDimension: "kidneys" },
      { label: "Cystatin C", unit: "mg/l", key: "cystatin_c", refHigh: 1.03, subDimension: "kidneys" },
      { label: "U-Alb/Krea, abnormal", unit: "0/1", key: "u_alb_krea_abnormal", subDimension: "kidneys" },
    ],
  },
  {
    title: "Endocrine & Hormonal Health",
    mainDimension: "metabolic",
    rows: [
      { label: "TSH", unit: "mU/l", key: "tsh_mu_l", refLow: 0.4, refHigh: 4.0, subDimension: "endocrine" },
      { label: "Testosterone / Estrogen, abnormal", unit: "0/1", key: "testosterone_estrogen_abnormal", subDimension: "endocrine" },
    ],
  },
  {
    title: "Genetics & Risk Markers",
    mainDimension: "brain_mental",
    rows: [
      { label: "APOE ε4", unit: "0/1", key: "apoe_e4" },
    ],
  },
  {
    title: "Spirometry",
    mainDimension: "respiratory_immune",
    rows: [
      { label: "PEF", unit: "%", key: "pef_percent", refLow: 80, subDimension: "respiratory" },
      { label: "FEV1", unit: "%", key: "fev1_percent", refLow: 80, subDimension: "respiratory" },
      { label: "FVC", unit: "%", key: "fvc_percent", refLow: 80, subDimension: "respiratory" },
    ],
  },
];

/** Categories belonging to the given main dimension, preserving order. */
export function getLabCategoriesForMainDimension(mainKey: string): LabMarkerCategory[] {
  return LAB_MARKER_CATEGORIES.filter((c) => c.mainDimension === mainKey);
}

/** Categories belonging to the given sub-dimension, preserving order. */
export function getLabCategoriesForSubDimension(subKey: string): LabMarkerCategory[] {
  return LAB_MARKER_CATEGORIES
    .map((c) => ({ ...c, rows: c.rows.filter((r) => r.subDimension === subKey) }))
    .filter((c) => c.rows.length > 0);
}

/** Flat row list (in registry order) for a main dimension. */
export function getLabRowsForMainDimension(mainKey: string): LabMarkerRow[] {
  return getLabCategoriesForMainDimension(mainKey).flatMap((c) => c.rows);
}

/** Flat row list (in registry order) for a sub-dimension. */
export function getLabRowsForSubDimension(subKey: string): LabMarkerRow[] {
  return getLabCategoriesForSubDimension(subKey).flatMap((c) => c.rows);
}
