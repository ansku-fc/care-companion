// Data-access seam for clinical visits. Today it reads/writes an in-memory
// clone of the mock seed; swapping to Supabase later means changing only these
// function bodies — the async signatures stay the same. The UI imports ONLY
// this module, never mockVisits directly.

import { MOCK_VISITS } from "./mockVisits";
import { latestVisit as latestOf } from "./derive";
import { emptyIntervalHistory, emptyVisitPlan, type ClinicalVisit } from "./types";
import type { VisitType } from "@/lib/episodes";

// Deep clone so callers can't mutate the seed by reference.
const clone = <T>(value: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

// In-memory store, seeded once from the mock data.
let store: ClinicalVisit[] = clone(MOCK_VISITS);

const genId = () =>
  `visit-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`;

function warnNotPersisted(action: string): void {
  console.warn(
    `[visitRepository] ${action} — mock only, NOT persisted. ` +
      `Data lives in memory and resets on reload.`,
  );
}

/** All visits for a patient, newest-first. */
export async function getVisits(patientId: string): Promise<ClinicalVisit[]> {
  return clone(store.filter((v) => v.patientId === patientId)).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

/** A single visit by id, or null. */
export async function getVisit(visitId: string): Promise<ClinicalVisit | null> {
  const found = store.find((v) => v.id === visitId);
  return found ? clone(found) : null;
}

/** The most recent visit for a patient, or null. */
export async function getLatestVisit(patientId: string): Promise<ClinicalVisit | null> {
  const found = latestOf(store.filter((v) => v.patientId === patientId));
  return found ? clone(found) : null;
}

/** Upsert a visit (insert if new id, replace otherwise). */
export async function saveVisit(visit: ClinicalVisit): Promise<ClinicalVisit> {
  warnNotPersisted(`saveVisit(${visit.id})`);
  const next = clone(visit);
  const idx = store.findIndex((v) => v.id === next.id);
  if (idx >= 0) store[idx] = next;
  else store = [...store, next];
  return clone(next);
}

/** Build (but do not save) a fresh draft visit for a patient. */
export async function createDraftVisit(input: {
  patientId: string;
  clinician: string;
  reason: VisitType;
}): Promise<ClinicalVisit> {
  warnNotPersisted("createDraftVisit");
  const prior = await getLatestVisit(input.patientId);
  const draft: ClinicalVisit = {
    id: genId(),
    patientId: input.patientId,
    date: new Date().toISOString().slice(0, 10),
    clinician: input.clinician,
    reason: input.reason,
    reasonNote: "",
    status: "draft",
    intervalHistory: emptyIntervalHistory(),
    measurements: [],
    dimensionUpdates: [],
    plan: emptyVisitPlan(),
    previousVisitId: prior?.id ?? null,
  };
  return draft;
}

/** Test-only: reset the in-memory store to the seed. */
export function __resetVisitStore(): void {
  store = clone(MOCK_VISITS);
}
