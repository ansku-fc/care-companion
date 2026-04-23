// Lightweight in-memory store for "new / unreviewed" lab markers per patient.
// Mirrors the demo data shown in the TaskDetailPanel preview so the
// Laboratory Results tab can surface those same markers in an
// "AWAITING REVIEW" section, let the doctor verify them one by one,
// and auto-complete the matching "Review new lab results" task.

import { supabase } from "@/integrations/supabase/client";

export type NewMarker = {
  key: string;          // matches the row.key used in LabResultsView (e.g. "ldl_mmol_l")
  label: string;
  unit: string;
};

// Demo seed: which markers are flagged as NEW per patient.
// Keyed loosely by patient last-name so we don't depend on UUIDs in mock data.
const SEED: Record<string, NewMarker[]> = {
  korhonen: [
    { key: "ldl_mmol_l",     label: "LDL",   unit: "mmol/l" },
    { key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol" },
    { key: "alat_u_l",       label: "ALAT",  unit: "U/l" },
  ],
};

// patientId → Set of unreviewed marker keys
const state = new Map<string, Set<string>>();
const labels = new Map<string, NewMarker>(); // marker key → meta (for rendering)
const listeners = new Set<() => void>();
let initialized = new Set<string>();

function notify() { listeners.forEach((l) => l()); }

export function subscribeLabReview(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Seed the unreviewed set for a patient on first access. */
export function ensureSeeded(patientId: string, patientName?: string | null) {
  if (initialized.has(patientId)) return;
  initialized.add(patientId);
  const key = (patientName ?? "").toLowerCase();
  const match = Object.entries(SEED).find(([k]) => key.includes(k));
  if (match) {
    const set = new Set<string>();
    for (const m of match[1]) {
      set.add(m.key);
      labels.set(m.key, m);
    }
    state.set(patientId, set);
    notify();
  }
}

export function getNewMarkers(patientId: string): NewMarker[] {
  const set = state.get(patientId);
  if (!set) return [];
  return Array.from(set).map((k) => labels.get(k)!).filter(Boolean);
}

export function isMarkerNew(patientId: string, key: string): boolean {
  return state.get(patientId)?.has(key) ?? false;
}

export function hasUnreviewed(patientId: string): boolean {
  return (state.get(patientId)?.size ?? 0) > 0;
}

/**
 * Mark a single marker as verified.
 * Returns true when this verification cleared the last unreviewed marker.
 */
export function verifyMarker(patientId: string, key: string): boolean {
  const set = state.get(patientId);
  if (!set || !set.has(key)) return false;
  set.delete(key);
  notify();
  return set.size === 0;
}

/**
 * Find and complete the patient's open "Review new lab results" task.
 * Looks up by patient_id + clinical_review category + matching title, then
 * sets status = "done" so all task surfaces update automatically.
 */
export async function completeLabReviewTask(patientId: string): Promise<void> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, category")
    .eq("patient_id", patientId)
    .in("status", ["todo", "in_progress"]);

  const match = (tasks ?? []).find((t) =>
    /review.*lab|new lab/i.test(t.title)
  );
  if (!match) return;

  await supabase
    .from("tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", match.id);
}
