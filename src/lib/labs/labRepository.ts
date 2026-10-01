// Data-access seam for lab series — the single source every lab graph reads.
// Today it returns the in-memory dummy seed (Carter-gated); swapping to the
// patient_lab_results table later means changing only this function body — the
// async signature stays. The UI imports ONLY this module, never mockLabs.
// Mirrors visits/visitRepository.ts.
import { isCarter } from "@/lib/patientClinicalData";
import { CARTER_LABS } from "./mockLabs";
import type { LabSeries } from "./types";

const clone = <T,>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

/** All lab series (markers with ≥1 datapoint) for a patient, markers in seed order. */
export async function getLabSeries(patientId?: string | null, patientName?: string | null): Promise<LabSeries[]> {
  // Mock: only the demo patient (Carter) has seeded labs. Real patients get
  // none until this reads patient_lab_results.
  if (isCarter(patientId, patientName)) return clone(CARTER_LABS);
  return [];
}
