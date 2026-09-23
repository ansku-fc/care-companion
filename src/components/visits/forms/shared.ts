// Constants, id/date helpers, and payload types for the shared clinical action
// forms. Kept separate from the components so fast-refresh stays happy and
// non-UI consumers (e.g. visit intake) can import types without pulling JSX.

export const ASSIGNEES = ["Dr. Laine", "Nurse Mäkinen", "System"] as const;
export const TASK_TYPES = ["Referral", "Prescription", "Lab order", "Appointment", "Other"] as const;
export const VISIT_TYPES = ["Check-up", "Consultation", "Procedure"] as const;
export const TIMEFRAMES = ["2 weeks", "1 month", "3 months", "6 months", "Custom date"] as const;

export type Task = { id: string; title: string; assignee: string; due: string; type: typeof TASK_TYPES[number] };
export type Referral = { id: string; specialty: string; referTo: string; assignee: string; due: string; notes: string };
export type FollowUp = { id: string; visitType: typeof VISIT_TYPES[number]; timeframe: string; with: string; notes: string };
export type Diagnosis = { id: string; code: string; name: string; status: "current" | "previous"; year: string };
export type Medication = { id: string; name: string; dose: string; frequency: string; time: string };

export function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
