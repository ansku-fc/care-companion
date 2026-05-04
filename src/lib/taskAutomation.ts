// Centralised helpers for creating / auto-completing structured tasks.
// All app-side task triggers should funnel through these helpers so that
// task_type, linked_entity, and auto_close_event stay consistent.

import { supabase } from "@/integrations/supabase/client";
import {
  buildInteractionTitle,
  buildOnboardingReviewTitle,
  buildTaskTitle,
  TASK_TYPE_META,
  type TaskType,
} from "@/lib/taskTypes";
import { detectInteractions } from "@/lib/drugInteractions";

export interface CreateTaskInput {
  taskType: TaskType;
  patientId: string | null;
  patientName?: string | null;
  detail?: string | null;
  /** Override the canonical prefix for special cases (interactions, etc.). */
  titleOverride?: string;
  description?: string | null;
  assigneeName: string;
  assigneeType?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueInDays?: number;
  createdBy: string;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  createdFrom?: string | null;
}

function dueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function categoryFor(t: TaskType) {
  switch (t) {
    case "REFERRAL":              return "referral" as const;
    case "ONBOARDING_ADMIN":      return "administrative" as const;
    case "APPOINTMENT_CLINIC":
    case "APPOINTMENT_EXTERNAL":  return "care_coordination" as const;
    case "PRESCRIPTION":
    case "LAB_DIAGNOSTICS":
    case "MONITORING":
    default:                      return "clinical" as const;
  }
}

function taskCategoryFor(t: TaskType) {
  switch (t) {
    case "LAB_DIAGNOSTICS":       return "lab_review" as const;
    case "PRESCRIPTION":          return "medication" as const;
    case "REFERRAL":              return "referral" as const;
    case "MONITORING":            return "dimension_review" as const;
    case "ONBOARDING_ADMIN":      return "administrative" as const;
    case "APPOINTMENT_CLINIC":
    case "APPOINTMENT_EXTERNAL":
    default:                      return "administrative" as const;
  }
}

/** Single source of truth for inserting a new typed task. */
export async function createTypedTask(input: CreateTaskInput): Promise<string | null> {
  const title = input.titleOverride ?? buildTaskTitle({
    type: input.taskType,
    detail: input.detail ?? null,
    patientName: input.patientName ?? null,
  });
  const meta = TASK_TYPE_META[input.taskType];
  const payload = {
    title,
    description: input.description ?? null,
    patient_id: input.patientId,
    category: categoryFor(input.taskType),
    task_category: taskCategoryFor(input.taskType),
    priority: input.priority ?? "medium",
    status: "todo" as const,
    assignee_name: input.assigneeName,
    assignee_type: input.assigneeType ?? (/nurse/i.test(input.assigneeName) ? "nurse_internal" : "doctor_internal"),
    due_date: dueDate(input.dueInDays ?? 7),
    created_by: input.createdBy,
    created_from: input.createdFrom ?? null,
    task_type: input.taskType,
    linked_entity_type: input.linkedEntityType ?? null,
    linked_entity_id: input.linkedEntityId ?? null,
    auto_close_event: meta.autoCloseEvent,
  };
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload as never)
    .select("id")
    .single();
  if (error) {
    console.error("createTypedTask failed", error, payload);
    return null;
  }
  return (data as any)?.id ?? null;
}

/**
 * Auto-complete (status → done) any open task that matches the given
 * task_type + linked_entity. Multiple matches are all closed (idempotent).
 */
export async function autoCompleteTasks(opts: {
  taskType: TaskType | TaskType[];
  linkedEntityType: string;
  linkedEntityId: string;
}): Promise<number> {
  const types = Array.isArray(opts.taskType) ? opts.taskType : [opts.taskType];
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "done" as const })
    .in("task_type", types as any)
    .eq("linked_entity_type", opts.linkedEntityType)
    .eq("linked_entity_id", opts.linkedEntityId)
    .neq("status", "done")
    .select("id");
  if (error) {
    console.error("autoCompleteTasks failed", error);
    return 0;
  }
  return (data ?? []).length;
}

// ----------------------------------------------------------------------------
// Common high-level events
// ----------------------------------------------------------------------------

export async function createOnboardingReviewTask(opts: {
  patientId: string;
  patientName: string;
  createdBy: string;
}) {
  return createTypedTask({
    taskType: "ONBOARDING_ADMIN",
    patientId: opts.patientId,
    patientName: opts.patientName,
    titleOverride: buildOnboardingReviewTitle({ patientName: opts.patientName }),
    description: "Review baseline data and plan first clinical actions.",
    assigneeName: "Dr. Laine",
    priority: "medium",
    dueInDays: 7,
    createdBy: opts.createdBy,
    linkedEntityType: "patient",
    linkedEntityId: opts.patientId,
    createdFrom: "Patient created",
  });
}

export async function createPreVisitInstructionsTask(opts: {
  patientId: string;
  patientName: string;
  appointmentId: string;
  createdBy: string;
  dueDateISO: string;
}) {
  return createTypedTask({
    taskType: "PATIENT_COMMUNICATION",
    patientId: opts.patientId,
    patientName: opts.patientName,
    titleOverride: buildPreVisitTitle({ patientName: opts.patientName }),
    description: "Send pre-visit preparation instructions (fasting, documents, etc.) to patient.",
    assigneeName: "Nurse Mäkinen",
    priority: "medium",
    dueInDays: Math.max(
      1,
      Math.floor((new Date(opts.dueDateISO).getTime() - Date.now()) / 86_400_000) - 1,
    ),
    createdBy: opts.createdBy,
    linkedEntityType: "appointment",
    linkedEntityId: opts.appointmentId,
    createdFrom: "Appointment created with prep requirements",
  });
}

export async function createInteractionReviewTasks(opts: {
  patientId: string;
  patientName: string;
  newMedicationName: string;
  newMedicationId: string;
  createdBy: string;
}): Promise<number> {
  // Look up existing active meds for the patient
  const { data: existing } = await supabase
    .from("patient_medications")
    .select("id, medication_name, status")
    .eq("patient_id", opts.patientId)
    .eq("status", "active");
  const others = (existing ?? [])
    .filter((m: any) => m.id !== opts.newMedicationId)
    .map((m: any) => m.medication_name as string);
  const hits = detectInteractions(opts.newMedicationName, others);
  let created = 0;
  for (const hit of hits) {
    const ok = await createTypedTask({
      taskType: "PRESCRIPTION",
      patientId: opts.patientId,
      patientName: opts.patientName,
      titleOverride: buildInteractionTitle({
        drugA: hit.drugAName,
        drugB: hit.drugBName,
        patientName: opts.patientName,
      }),
      description: hit.pair.rationale,
      assigneeName: "Dr. Laine",
      priority: hit.pair.severity === "high" ? "urgent" : "high",
      dueInDays: hit.pair.severity === "high" ? 1 : 3,
      createdBy: opts.createdBy,
      linkedEntityType: "medication",
      linkedEntityId: opts.newMedicationId,
      createdFrom: `Drug interaction: ${hit.drugAName} × ${hit.drugBName}`,
    });
    if (ok) created++;
  }
  return created;
}
