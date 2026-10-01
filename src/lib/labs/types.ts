// Shared lab data types. A LabSeries is one marker's longitudinal values for a
// patient, with its reference band — the single shape every lab graph in
// care-companion reads (sidebar mini-trend + enlarged chart today; dashboard
// later). Mirrors the {date, value} point shape MarkerDetailChart consumes.

export type LabPoint = { date: string; value: number };

export interface LabSeries {
  /** patient_lab_results column key, e.g. "ldl_mmol_l". */
  key: string;
  label: string;
  unit?: string;
  /** Reference band. Sourced to match the dashboard's reference lines. */
  refLow?: number;
  refHigh?: number;
  /** Chronological ascending. */
  points: LabPoint[];
}
