// Build suggested follow-up tasks from a completed onboarding form.
// Pure, side-effect free (the lab-results check is done by the caller).
import type { OnboardingForm } from "./OnboardingFormContext";
import type { TaskCategory, TaskPriority } from "@/lib/tasks";
import type { TaskCategoryKind } from "@/lib/taskCategory";

export type SuggestedTask = {
  /** Stable client-side id for selection. */
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  task_category: TaskCategoryKind;
  priority: TaskPriority;
  /** Days from today. */
  due_in_days: number;
  assignee_name: string;
  created_from: string;
};

const SCREENINGS: { key: keyof OnboardingForm; yearKey: keyof OnboardingForm; label: string }[] = [
  { key: "screen_breast",     yearKey: "screen_breast_year",     label: "breast" },
  { key: "screen_cervix",     yearKey: "screen_cervix_year",     label: "cervix" },
  { key: "screen_colorectum", yearKey: "screen_colorectum_year", label: "colorectum" },
  { key: "screen_prostate",   yearKey: "screen_prostate_year",   label: "prostate" },
  { key: "screen_skin",       yearKey: "screen_skin_year",       label: "skin (dermatoscopy)" },
  { key: "screen_lung",       yearKey: "screen_lung_year",       label: "lung (low-dose CT)" },
];

const FIRST_DEGREE_RELATIVES = ["mother", "father", "sibling", "brother", "sister"];
const CARDIO_RX = /(cardio|heart|coronary|infarct|stroke|hyperten|atrial|arrhyth)/i;
const CANCER_RX = /(cancer|carcinoma|sarcoma|leukemia|lymphoma|melanoma|tumou?r|neoplasm)/i;

export function buildSuggestedTasks(opts: {
  form: OnboardingForm;
  patientName: string;
  hasLabResults: boolean;
}): SuggestedTask[] {
  const { form, patientName, hasLabResults } = opts;
  const out: SuggestedTask[] = [];

  // 1) Cancer screenings toggled ON without a recorded year
  for (const s of SCREENINGS) {
    const on = Boolean(form[s.key]);
    const year = form[s.yearKey] as number | null;
    if (on && !year) {
      out.push({
        id: `screening-${s.key}`,
        title: `Schedule ${s.label} screening — ${patientName}`,
        category: "care_coordination",
        task_category: "administrative",
        priority: "high",
        due_in_days: 30,
        assignee_name: "Nurse Mäkinen",
        created_from: "Onboarding — Cancer Risks",
      });
    }
  }

  // 2) Drug interaction review for ≥ 2 current medications
  const currentMedCount = (form.current_illnesses ?? []).reduce(
    (n, ill) => n + (ill.medications?.length ?? 0),
    0,
  );
  if (currentMedCount >= 2) {
    out.push({
      id: "med-interactions",
      title: `Review drug interactions — ${patientName}`,
      description: `Patient has ${currentMedCount} current medications recorded during onboarding.`,
      category: "clinical",
      task_category: "medication",
      priority: "high",
      due_in_days: 7,
      assignee_name: "Dr. Laine",
      created_from: "Onboarding — Medications",
    });
  }

  // 3) Lab order if no lab results on file
  if (!hasLabResults) {
    out.push({
      id: "lab-order",
      title: `Prepare & send lab order — ${patientName}`,
      description: "Comprehensive lab package (no prior lab results on file).",
      category: "care_coordination",
      task_category: "lab_review",
      priority: "high",
      due_in_days: 14,
      assignee_name: "Nurse Mäkinen",
      created_from: "Onboarding — Lab order",
    });
  }

  // 4) Family history risk review
  const flagged = (form.family_history ?? []).some((row) => {
    const rel = (row.relative ?? "").toLowerCase();
    if (!FIRST_DEGREE_RELATIVES.some((r) => rel.includes(r))) return false;
    const text = `${row.illness_name ?? ""} ${row.icd_code ?? ""}`;
    return CARDIO_RX.test(text) || CANCER_RX.test(text);
  });
  if (flagged) {
    out.push({
      id: "family-risk",
      title: `Review family history risk factors — ${patientName}`,
      description: "First-degree relative with cardiovascular or cancer diagnosis.",
      category: "clinical",
      task_category: "clinical_review",
      priority: "medium",
      due_in_days: 30,
      assignee_name: "Dr. Laine",
      created_from: "Onboarding — Family history",
    });
  }

  return out;
}

export function dueDateFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
