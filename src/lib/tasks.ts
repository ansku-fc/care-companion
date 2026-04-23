// Centralized task domain helpers shared across the app.
// All surfaces (Tasks page, Patient Overview, Calendar, Home Action Centre) read
// and write through these helpers so updates stay consistent.

import type { Tables, Enums } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskCategory = Enums<"task_category">;
export type TaskPriority = Enums<"task_priority">;
export type TaskStatus = Enums<"task_status">;

// Spec categories — we keep legacy enum values usable but only expose these in UI.
export const TASK_CATEGORIES: { key: TaskCategory; label: string; color: string }[] = [
  { key: "clinical",          label: "Clinical",          color: "bg-primary" },
  { key: "care_coordination", label: "Care Coordination", color: "bg-chart-4" },
  { key: "referral",          label: "Referral",          color: "bg-chart-2" },
  { key: "administrative",    label: "Administrative",    color: "bg-muted-foreground" },
];

// Map legacy categories to spec ones for display purposes only.
export function categoryLabel(c: TaskCategory): string {
  const direct = TASK_CATEGORIES.find((t) => t.key === c);
  if (direct) return direct.label;
  switch (c) {
    case "clinical_review":         return "Clinical";
    case "client_communication":    return "Care Coordination";
    case "documentation_reporting": return "Administrative";
    default:                        return c;
  }
}

export function categoryDotColor(c: TaskCategory): string {
  const direct = TASK_CATEGORIES.find((t) => t.key === c);
  if (direct) return direct.color;
  switch (c) {
    case "clinical_review":         return "bg-primary";
    case "client_communication":    return "bg-chart-4";
    case "documentation_reporting": return "bg-muted-foreground";
    default:                        return "bg-muted-foreground";
  }
}

export const PRIORITY_OPTIONS: { key: TaskPriority; label: string; dot: string; badge: string }[] = [
  { key: "urgent", label: "Urgent", dot: "bg-destructive",      badge: "bg-destructive text-destructive-foreground" },
  { key: "high",   label: "High",   dot: "bg-warning",          badge: "bg-warning text-warning-foreground" },
  { key: "medium", label: "Normal", dot: "bg-primary/70",       badge: "bg-secondary text-secondary-foreground" },
  { key: "low",    label: "Low",    dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground" },
];

export const priorityMeta = (p: TaskPriority) =>
  PRIORITY_OPTIONS.find((x) => x.key === p) ?? PRIORITY_OPTIONS[2];

export const STATUS_OPTIONS: { key: TaskStatus; label: string }[] = [
  { key: "todo",        label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done",        label: "Completed" },
  { key: "deferred",    label: "Deferred" },
];

export const statusLabel = (s: TaskStatus) =>
  STATUS_OPTIONS.find((x) => x.key === s)?.label ?? s;

// Built-in assignees (per spec, only Dr. Laine and Nurse Mäkinen for now).
export const ASSIGNEES = [
  { name: "Dr. Laine",     type: "doctor_internal", role: "doctor" as const },
  { name: "Nurse Mäkinen", type: "nurse_internal",  role: "nurse" as const  },
];

export function assigneeRole(name: string | null): "doctor" | "nurse" | "system" {
  if (!name) return "system";
  if (/nurse/i.test(name)) return "nurse";
  if (/dr\.?|doctor/i.test(name)) return "doctor";
  return "system";
}

// Date helpers
export function isOverdue(t: Pick<Task, "due_date" | "status">) {
  if (!t.due_date || t.status === "done") return false;
  // Compare on calendar day, treating "today" as not overdue.
  const d = new Date(t.due_date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

export function isDueToday(t: Pick<Task, "due_date">) {
  if (!t.due_date) return false;
  const d = new Date(t.due_date);
  return (
    d.getFullYear() === new Date().getFullYear() &&
    d.getMonth() === new Date().getMonth() &&
    d.getDate() === new Date().getDate()
  );
}

export function isCompletedToday(t: Pick<Task, "status" | "updated_at">) {
  if (t.status !== "done") return false;
  const d = new Date(t.updated_at);
  return (
    d.getFullYear() === new Date().getFullYear() &&
    d.getMonth() === new Date().getMonth() &&
    d.getDate() === new Date().getDate()
  );
}

export function dueWithinDays(t: Pick<Task, "due_date" | "status">, days: number) {
  if (!t.due_date || t.status === "done" || t.status === "deferred") return false;
  const d = new Date(t.due_date);
  d.setHours(23, 59, 59, 999);
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  limit.setHours(23, 59, 59, 999);
  return d.getTime() <= limit.getTime();
}
