// Clinical Episodes — outcome layer that groups tasks into chained workflows.
// See spec: Visit Types (scheduling) + Episodes (outcome).
import type { Tables, Enums } from "@/integrations/supabase/types";

export type Episode = Tables<"episodes">;
export type EpisodeType = Enums<"episode_type">;
export type EpisodeStatus = Enums<"episode_status">;
export type EpisodeUrgency = Enums<"episode_urgency">;
export type VisitType = Enums<"visit_type">;

export const EPISODE_TYPE_META: Record<
  EpisodeType,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DIAGNOSTIC: {
    label: "Diagnostic",
    badgeClass: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
    dotClass: "bg-blue-500",
  },
  TREATMENT: {
    label: "Treatment",
    badgeClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    dotClass: "bg-emerald-500",
  },
  REFERRAL: {
    label: "Referral",
    badgeClass: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
    dotClass: "bg-violet-500",
  },
  MONITORING: {
    label: "Monitoring",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    dotClass: "bg-amber-500",
  },
  CARE_COORDINATION: {
    label: "Care Coordination",
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export const URGENCY_META: Record<
  EpisodeUrgency,
  { label: string; className: string }
> = {
  ROUTINE:  { label: "Routine",  className: "text-muted-foreground" },
  ELEVATED: { label: "Elevated", className: "text-warning" },
  URGENT:   { label: "Urgent",   className: "text-destructive font-medium" },
};

// --- Visit type → duration + patient invite text ---------------------------

export interface VisitTypeMeta {
  label: string;
  durationMinutes: number;
  prepInstructions: string;
}

export const VISIT_TYPE_META: Record<VisitType, VisitTypeMeta> = {
  ANNUAL_CHECKUP: {
    label: "Annual checkup",
    durationMinutes: 90,
    prepInstructions:
      "Please fast for 10 hours before your appointment. Complete your health questionnaire beforehand.",
  },
  ACUTE_CONSULTATION: {
    label: "Acute consultation",
    durationMinutes: 30,
    prepInstructions: "No preparation needed.",
  },
  LAB_VISIT: {
    label: "Lab visit",
    durationMinutes: 15,
    prepInstructions:
      "Please fast for 10 hours if a fasting sample is required — you will be notified separately.",
  },
  FOLLOWUP_CONSULTATION: {
    label: "Follow-up consultation",
    durationMinutes: 30,
    prepInstructions: "No preparation needed.",
  },
  NURSE_CONSULTATION: {
    label: "Nurse consultation",
    durationMinutes: 30,
    prepInstructions: "No preparation needed.",
  },
  RESULTS_REVIEW_CALL: {
    label: "Results review call",
    durationMinutes: 15,
    prepInstructions:
      "Your doctor will call you at the scheduled time to discuss your results.",
  },
};

/** Build the patient-facing invite text stored on the appointment record. */
export function buildPatientInvite(opts: {
  visitType: VisitType;
  patientName?: string | null;
  startTime?: Date | string | null;
  providerName?: string | null;
}): string {
  const meta = VISIT_TYPE_META[opts.visitType];
  const when = opts.startTime
    ? new Date(opts.startTime).toLocaleString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const lines: string[] = [];
  lines.push(`Hello${opts.patientName ? ` ${opts.patientName}` : ""},`);
  lines.push("");
  lines.push(
    `You have a ${meta.label.toLowerCase()} (${meta.durationMinutes} min)${
      when ? ` on ${when}` : ""
    }${opts.providerName ? ` with ${opts.providerName}` : ""}.`,
  );
  lines.push("");
  lines.push(meta.prepInstructions);
  lines.push("");
  lines.push("Foundation Clinic");
  return lines.join("\n");
}
