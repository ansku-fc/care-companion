// Boundary adapters: convert the shapes produced by the reused consultation
// forms (components/visits/forms) into the canonical VisitPlan sub-types. This
// is where the form vocabulary meets the canonical enums (TaskCategory etc.).
import type {
  Task as FormTask,
  Referral as FormReferral,
  Medication as FormMedication,
} from "@/components/visits/forms";
import type { TaskCategory } from "@/lib/tasks";
import type { PlanPrescription, PlanReferral, PlanTask } from "@/lib/visits";

function categoryForFormType(type: FormTask["type"]): TaskCategory {
  switch (type) {
    case "Referral":
      return "referral";
    case "Appointment":
      return "care_coordination";
    case "Other":
      return "administrative";
    case "Prescription":
    case "Lab order":
    default:
      return "clinical";
  }
}

export function taskFromForm(t: FormTask): PlanTask {
  return {
    id: t.id,
    title: t.title,
    priority: "medium", // form doesn't capture priority; sensible default for the mockup
    category: categoryForFormType(t.type),
    assignee: t.assignee,
    dueDate: t.due,
  };
}

export function referralFromForm(r: FormReferral): PlanReferral {
  return {
    id: r.id,
    specialty: r.specialty,
    referTo: r.referTo,
    assignee: r.assignee,
    dueDate: r.due,
    notes: r.notes,
  };
}

export function prescriptionFromForm(m: FormMedication): PlanPrescription {
  return {
    id: m.id,
    medicationName: m.name,
    atc: m.atc,
    dose: m.dose,
    frequency: m.frequency,
    time: m.time,
  };
}
