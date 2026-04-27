// Shared types/helpers for the 3-step referral coordination workflow.
// Persisted in tasks.referral_progress (JSONB).

export type ReferralStepKey = "send_referral" | "schedule_appointment" | "send_invite";

export interface ReferralStepBase {
  done: boolean;
  completed_at?: string | null;     // ISO timestamp
  completed_by_name?: string | null;
}

export interface SendReferralStep extends ReferralStepBase {
  to?: string | null;               // receiving clinic / specialty
  reason?: string | null;
}

export interface ScheduleAppointmentStep extends ReferralStepBase {
  appointment_at?: string | null;   // ISO datetime
  location?: string | null;
  contact_person?: string | null;
  notes?: string | null;
}

export interface SendInviteStep extends ReferralStepBase {
  invite_title?: string | null;
  attending_notes?: string | null;
}

export interface ReferralProgress {
  send_referral?: SendReferralStep;
  schedule_appointment?: ScheduleAppointmentStep;
  send_invite?: SendInviteStep;
}

export const HELSINKI_LOCATIONS = [
  "HYKS Meilahti",
  "HYKS Jorvi",
  "Peijaksen sairaala",
  "Terveystalo",
  "Mehiläinen",
  "Other",
] as const;

// Maps a referral task title to the most likely receiving clinic /
// specialty. Used to pre-fill the "To" field on Step 1.
const SPECIALTY_MAP: { test: RegExp; to: string; specialty: string }[] = [
  { test: /\bcolonoscopy|colorectal|gastro/i,            to: "Gastroenterology, HYKS Meilahti", specialty: "Gastroenterology" },
  { test: /\bcardio|echocardiogram|ekg|ecg/i,            to: "Cardiology, HYKS Meilahti",       specialty: "Cardiology" },
  { test: /\bdermatology|skin|melanoma|mole/i,           to: "Dermatology, HYKS",                specialty: "Dermatology" },
  { test: /\bneurology|migraine|seizure/i,               to: "Neurology, HYKS Meilahti",         specialty: "Neurology" },
  { test: /\bortho|knee|hip\b|fracture/i,                to: "Orthopaedics, HYKS Jorvi",         specialty: "Orthopaedics" },
  { test: /\bpsych|mental health/i,                      to: "Psychiatry, HYKS",                 specialty: "Psychiatry" },
  { test: /\bendocrin|thyroid|diabetes/i,                to: "Endocrinology, HYKS Meilahti",     specialty: "Endocrinology" },
  { test: /\bhepatology|liver/i,                         to: "Hepatology, HYKS Meilahti",        specialty: "Hepatology" },
  { test: /\boncology|cancer/i,                          to: "Oncology, HYKS",                   specialty: "Oncology" },
  { test: /\burology|prostate/i,                         to: "Urology, HYKS",                    specialty: "Urology" },
  { test: /\bgynaecology|gynecology|cervical/i,          to: "Gynaecology, HYKS",                specialty: "Gynaecology" },
  { test: /\bmammogram|breast/i,                         to: "Breast Imaging, HUSLAB",           specialty: "Breast imaging" },
  { test: /\bmri|radiology|x.?ray|ct\b/i,                to: "Radiology, HUS Kuvantaminen",     specialty: "Radiology" },
];

export function inferReferralTarget(title: string): { to: string; specialty: string } {
  const t = title ?? "";
  for (const m of SPECIALTY_MAP) if (m.test.test(t)) return { to: m.to, specialty: m.specialty };
  return { to: "", specialty: "Specialist" };
}

// Builds the calendar invite title from the task + Step-2 location.
export function defaultInviteTitle(taskTitle: string, location: string | null | undefined): string {
  const cleaned = (taskTitle ?? "").replace(/^book\s+/i, "").replace(/\s+appointment$/i, "");
  const head = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Appointment";
  return location ? `${head} — ${location}` : head;
}

export function isStepDone(progress: ReferralProgress | null | undefined, key: ReferralStepKey): boolean {
  return !!progress?.[key]?.done;
}

export function completedCount(progress: ReferralProgress | null | undefined): number {
  if (!progress) return 0;
  let n = 0;
  if (progress.send_referral?.done) n++;
  if (progress.schedule_appointment?.done) n++;
  if (progress.send_invite?.done) n++;
  return n;
}

export const TOTAL_REFERRAL_STEPS = 3;

export function allStepsComplete(progress: ReferralProgress | null | undefined): boolean {
  return completedCount(progress) === TOTAL_REFERRAL_STEPS;
}

// Used by both panel and list row.
export function progressDots(n: number, total = TOTAL_REFERRAL_STEPS): string {
  return "●".repeat(n) + "○".repeat(Math.max(0, total - n));
}
