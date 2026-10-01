// Raw synthetic lab seed — the single dummy source all care-companion lab
// graphs read through labRepository. The UI imports ONLY labRepository, never
// this file directly (same seam convention as visits/mockVisits.ts).
//
// Carter's cardiometabolic markers reuse the EXACT values/dates already present
// in visits/mockVisits.ts so the labs mirror stays consistent with the visit
// flow, plus additional markers over the same timepoints with realistic
// movement. Reference bands match the dashboard's REFERENCE_VALUES (see the
// `refLow/refHigh` notes) so the enlarged MarkerDetailChart draws identical
// reference lines.
//
// Timepoints (Carter's visit dates): 2025-06-20, 2025-10-08, 2025-12-15,
// 2026-03-10, 2026-06-16, 2026-09-08. Labs are taken at a realistic subset of
// visits, not all of them.
import type { LabSeries } from "./types";

export const CARTER_LABS: LabSeries[] = [
  {
    // dashboard REFERENCE_VALUES uses high 2.6 (registry says 3.0 — see report)
    key: "ldl_mmol_l",
    label: "LDL cholesterol",
    unit: "mmol/L",
    refHigh: 2.6,
    points: [
      { date: "2025-06-20", value: 3.6 },
      { date: "2025-12-15", value: 3.4 },
      { date: "2026-03-10", value: 3.1 },
      { date: "2026-06-16", value: 2.7 },
      { date: "2026-09-08", value: 2.4 },
    ],
  },
  {
    key: "hba1c_mmol_mol",
    label: "HbA1c",
    unit: "mmol/mol",
    refHigh: 42,
    points: [
      { date: "2025-06-20", value: 55 },
      { date: "2025-12-15", value: 53 },
      { date: "2026-03-10", value: 51 },
      { date: "2026-09-08", value: 48 },
    ],
  },
  {
    key: "blood_pressure_systolic",
    label: "Systolic BP",
    unit: "mmHg",
    refHigh: 140,
    points: [
      { date: "2025-06-20", value: 150 },
      { date: "2025-10-08", value: 144 },
      { date: "2026-03-10", value: 142 },
      { date: "2026-06-16", value: 136 },
      { date: "2026-09-08", value: 128 },
    ],
  },
  {
    key: "blood_pressure_diastolic",
    label: "Diastolic BP",
    unit: "mmHg",
    refHigh: 90,
    points: [
      { date: "2025-06-20", value: 95 },
      { date: "2026-03-10", value: 88 },
      { date: "2026-06-16", value: 84 },
      { date: "2026-09-08", value: 80 },
    ],
  },
  {
    // No dashboard/registry numeric ref — clinical default low 1.0 (see report)
    key: "hdl_mmol_l",
    label: "HDL cholesterol",
    unit: "mmol/L",
    refLow: 1.0,
    points: [
      { date: "2025-06-20", value: 0.95 },
      { date: "2025-12-15", value: 1.0 },
      { date: "2026-03-10", value: 1.05 },
      { date: "2026-06-16", value: 1.12 },
      { date: "2026-09-08", value: 1.2 },
    ],
  },
  {
    // No dashboard/registry numeric ref — clinical default high 1.7 (see report)
    key: "triglycerides_mmol_l",
    label: "Triglycerides",
    unit: "mmol/L",
    refHigh: 1.7,
    points: [
      { date: "2025-06-20", value: 2.3 },
      { date: "2025-12-15", value: 2.1 },
      { date: "2026-03-10", value: 1.9 },
      { date: "2026-06-16", value: 1.7 },
      { date: "2026-09-08", value: 1.5 },
    ],
  },
  {
    key: "tsh_mu_l",
    label: "TSH",
    unit: "mIU/L",
    refLow: 0.4,
    refHigh: 4.0,
    points: [
      { date: "2025-06-20", value: 2.1 },
      { date: "2025-12-15", value: 2.4 },
      { date: "2026-03-10", value: 2.2 },
      { date: "2026-09-08", value: 2.3 },
    ],
  },
  {
    key: "alat_u_l",
    label: "ALAT",
    unit: "U/L",
    refHigh: 50,
    points: [
      { date: "2025-06-20", value: 58 },
      { date: "2025-12-15", value: 52 },
      { date: "2026-03-10", value: 47 },
      { date: "2026-06-16", value: 42 },
      { date: "2026-09-08", value: 38 },
    ],
  },
  {
    key: "egfr",
    label: "eGFR",
    unit: "mL/min/1.73m²",
    refLow: 60,
    points: [
      { date: "2025-06-20", value: 88 },
      { date: "2026-03-10", value: 90 },
      { date: "2026-06-16", value: 89 },
      { date: "2026-09-08", value: 92 },
    ],
  },
  {
    // No dashboard/registry numeric ref — clinical default low 50 (see report)
    key: "vitamin_d_25oh_nmol_l",
    label: "Vitamin D (25-OH)",
    unit: "nmol/L",
    refLow: 50,
    points: [
      { date: "2025-06-20", value: 38 },
      { date: "2025-12-15", value: 46 },
      { date: "2026-03-10", value: 58 },
      { date: "2026-09-08", value: 72 },
    ],
  },
];
