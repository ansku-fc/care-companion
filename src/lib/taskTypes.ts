// Event-driven task taxonomy.
// Every new task in the app should belong to one of these types and follow the
// canonical naming pattern: `[Type label] — [Detail] — [Last, First]`.
//
// See README in chat — Tasks v2 spec.

import type { Database } from "@/integrations/supabase/types";
import { formatLastFirst } from "@/lib/patientName";

export type TaskType = Database["public"]["Enums"]["task_type"];

export const TASK_TYPES: TaskType[] = [
  "LAB_DIAGNOSTICS",
  "REFERRAL",
  "PRESCRIPTION",
  "APPOINTMENT_CLINIC",
  "APPOINTMENT_EXTERNAL",
  "ONBOARDING_ADMIN",
  "MONITORING",
];

interface TypeMeta {
  label: string;        // pill label
  prefix: string;       // naming-pattern prefix (no em-dash)
  pillKey: TaskTypePillKey;
  autoCloseEvent: string;
}

export const TASK_TYPE_META: Record<TaskType, TypeMeta> = {
  LAB_DIAGNOSTICS: {
    label: "Lab & Diagnostics",
    prefix: "Review lab results",
    pillKey: "labs",
    autoCloseEvent: "Doctor marks lab results as reviewed",
  },
  REFERRAL: {
    label: "Referrals",
    prefix: "Send referral",
    pillKey: "referrals",
    autoCloseEvent: "Referral marked as sent",
  },
  PRESCRIPTION: {
    label: "Prescriptions",
    prefix: "Renew prescription",
    pillKey: "prescriptions",
    autoCloseEvent: "Prescription action resolved",
  },
  APPOINTMENT_CLINIC: {
    label: "Appointments",
    prefix: "Book appointment",
    pillKey: "appointments",
    autoCloseEvent: "Clinic appointment booked in calendar",
  },
  APPOINTMENT_EXTERNAL: {
    label: "Appointments",
    prefix: "Book external appointment",
    pillKey: "appointments",
    autoCloseEvent: "Nurse marks external appointment booked + patient notified",
  },
  PATIENT_COMMUNICATION: {
    label: "Communication",
    prefix: "Send results",
    pillKey: "communication",
    autoCloseEvent: "Results message marked as sent",
  },
  ONBOARDING_ADMIN: {
    label: "Onboarding",
    prefix: "Complete onboarding",
    pillKey: "onboarding",
    autoCloseEvent: "All onboarding steps completed",
  },
  MONITORING: {
    label: "Monitoring",
    prefix: "Monitor",
    pillKey: "monitoring",
    autoCloseEvent: "Monitoring window closed",
  },
};

// Filter pill categories (subset; appointments collapses both APPOINTMENT_*).
export type TaskTypePillKey =
  | "all"
  | "labs"
  | "referrals"
  | "prescriptions"
  | "appointments"
  | "communication"
  | "onboarding"
  | "monitoring";

export const TASK_TYPE_PILLS: { key: TaskTypePillKey; label: string }[] = [
  { key: "all",            label: "All" },
  { key: "labs",           label: "Lab & Diagnostics" },
  { key: "referrals",      label: "Referrals" },
  { key: "prescriptions",  label: "Prescriptions" },
  { key: "appointments",   label: "Appointments" },
  { key: "communication",  label: "Communication" },
  { key: "onboarding",     label: "Onboarding" },
  { key: "monitoring",     label: "Monitoring" },
];

export function pillForTaskType(t: TaskType | null | undefined): TaskTypePillKey | null {
  if (!t) return null;
  return TASK_TYPE_META[t]?.pillKey ?? null;
}

// Build a canonical task title following: `[Prefix] — [Detail] — [Last, First]`.
// Detail/patient parts are omitted gracefully when missing.
export function buildTaskTitle(opts: {
  type: TaskType;
  detail?: string | null;
  patientName?: string | null;
  /** Override the auto-derived prefix (e.g. "Drug interaction review"). */
  prefixOverride?: string;
}): string {
  const prefix = opts.prefixOverride ?? TASK_TYPE_META[opts.type].prefix;
  const parts: string[] = [prefix];
  if (opts.detail && opts.detail.trim()) parts.push(opts.detail.trim());
  const patient = opts.patientName ? formatLastFirst(opts.patientName) : null;
  if (patient) parts.push(patient);
  return parts.join(" — ");
}

// ----------------------------------------------------------------------------
// Naming-pattern overrides used in the spec
// ----------------------------------------------------------------------------

// Drug interaction review uses a custom prefix + "A × B" detail.
export function buildInteractionTitle(opts: {
  drugA: string;
  drugB: string;
  patientName?: string | null;
}): string {
  return buildTaskTitle({
    type: "PRESCRIPTION",
    prefixOverride: "Review interaction",
    detail: `${opts.drugA} × ${opts.drugB}`,
    patientName: opts.patientName,
  });
}

// Pre-visit instructions (PATIENT_COMMUNICATION).
export function buildPreVisitTitle(opts: { patientName?: string | null }): string {
  return buildTaskTitle({
    type: "PATIENT_COMMUNICATION",
    prefixOverride: "Send pre-visit instructions",
    detail: null,
    patientName: opts.patientName,
  });
}

// Onboarding review.
export function buildOnboardingReviewTitle(opts: { patientName?: string | null }): string {
  return buildTaskTitle({
    type: "ONBOARDING_ADMIN",
    prefixOverride: "Complete onboarding",
    detail: null,
    patientName: opts.patientName,
  });
}
