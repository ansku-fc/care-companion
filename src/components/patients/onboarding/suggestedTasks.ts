// Build suggested follow-up tasks from a completed onboarding form.
// Pure, side-effect free.
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

const SCREENING_KEYS: (keyof OnboardingForm)[] = [
  "screen_breast",
  "screen_cervix",
  "screen_colorectum",
  "screen_prostate",
  "screen_skin",
  "screen_lung",
];
const SCREENING_YEAR_KEYS: (keyof OnboardingForm)[] = [
  "screen_breast_year",
  "screen_cervix_year",
  "screen_colorectum_year",
  "screen_prostate_year",
  "screen_skin_year",
  "screen_lung_year",
];

const FIRST_DEGREE_RELATIVES = ["mother", "father", "sibling", "brother", "sister", "son", "daughter", "child"];
const CANCER_RX = /(cancer|carcinoma|sarcoma|leukemia|lymphoma|melanoma|tumou?r|neoplasm)/i;
const CARDIO_RX = /(cardio|heart|coronary|infarct|stroke|hyperten|atrial|arrhyth)/i;

// Medications that warrant ongoing monitoring labs and the markers to order.
const MED_MONITORING: { rx: RegExp; label: string; markers: string[] }[] = [
  {
    rx: /(statin|atorvastatin|simvastatin|rosuvastatin|pravastatin)/i,
    label: "Statin therapy",
    markers: ["ALAT", "ASAT", "CK", "LDL", "HDL", "Total cholesterol", "Triglycerides"],
  },
  {
    rx: /(carbimazole|methimazole|propylthiouracil|thiamazole)/i,
    label: "Antithyroid therapy",
    markers: ["TSH", "Free T4", "Free T3", "CBC", "ALAT"],
  },
  {
    rx: /(levothyroxine|thyroxine)/i,
    label: "Levothyroxine therapy",
    markers: ["TSH", "Free T4"],
  },
  {
    rx: /(metformin)/i,
    label: "Metformin therapy",
    markers: ["HbA1c", "Creatinine", "eGFR", "Vitamin B12"],
  },
  {
    rx: /(warfarin)/i,
    label: "Warfarin therapy",
    markers: ["INR", "PT"],
  },
  {
    rx: /(amiodarone)/i,
    label: "Amiodarone therapy",
    markers: ["TSH", "Free T4", "ALAT", "ASAT"],
  },
  {
    rx: /(lithium)/i,
    label: "Lithium therapy",
    markers: ["Lithium level", "TSH", "Creatinine", "eGFR"],
  },
  {
    rx: /(methotrexate)/i,
    label: "Methotrexate therapy",
    markers: ["CBC", "ALAT", "ASAT", "Creatinine"],
  },
];

function countMoleAbcdeFlags(mole: {
  asymmetry?: string;
  borders?: string;
  color?: string;
  size?: string;
  change?: string;
  symptoms?: string;
}): number {
  let n = 0;
  const a = (mole.asymmetry ?? "").toLowerCase();
  if (a && /asym|irreg/.test(a)) n++;
  const b = (mole.borders ?? "").toLowerCase();
  if (b && /irreg|notch|blur/.test(b)) n++;
  const c = (mole.color ?? "").toLowerCase();
  if (c && /(multi|uneven|black|red|blue|white)/.test(c)) n++;
  const d = (mole.size ?? "").toLowerCase();
  // D = diameter > 6mm
  if (d && /(>\s*6|6\s*[–-]\s*10|5[–-]?10|>\s*10|10mm|large)/.test(d)) n++;
  const e = (mole.change ?? "").toLowerCase();
  if (e && e !== "no change" && /(change|grow|enlarg|color|shape|size)/.test(e)) n++;
  const sym = (mole.symptoms ?? "").toLowerCase();
  if (sym && /(itch|bleed|crust|pain|tender)/.test(sym)) n++;
  return n;
}

export function buildSuggestedTasks(opts: {
  form: OnboardingForm;
  patientName: string;
  /** Kept for backwards compatibility — no longer used (baseline labs are ordered with the onboarding visit). */
  hasLabResults?: boolean;
}): SuggestedTask[] {
  const { form, patientName } = opts;
  const out: SuggestedTask[] = [];

  /* ---------- 1. Concerning mole → urgent dermatology referral ---------- */
  const moles = Array.isArray(form.moles) ? form.moles : [];
  const concerningMole = moles.find((m) => countMoleAbcdeFlags(m) >= 4);
  if (concerningMole) {
    const flags = countMoleAbcdeFlags(concerningMole);
    out.push({
      id: "derm-referral",
      title: `Dermatology referral — ${patientName}`,
      description: `Recorded mole "${concerningMole.label || "Mole"}" at ${concerningMole.location || "unspecified location"} has ${flags} concerning ABCDE findings — urgent dermatoscopy / excision review.`,
      category: "clinical",
      task_category: "referral",
      priority: "urgent",
      due_in_days: 7,
      assignee_name: "Dr. Laine",
      created_from: "Onboarding — Moles (ABCDE)",
    });
  }

  /* ---------- 2. No completed cancer screenings → schedule screenings ---------- */
  const anyCompletedScreening = SCREENING_KEYS.some((k, i) => {
    const on = Boolean(form[k]);
    const year = form[SCREENING_YEAR_KEYS[i]] as number | null;
    return on && Boolean(year);
  });
  if (!anyCompletedScreening) {
    out.push({
      id: "schedule-screenings",
      title: `Schedule cancer screenings — ${patientName}`,
      description: "No completed cancer screenings recorded during onboarding. Plan age- and sex-appropriate baseline screenings.",
      category: "care_coordination",
      task_category: "administrative",
      priority: "high",
      due_in_days: 30,
      assignee_name: "Nurse Mäkinen",
      created_from: "Onboarding — Cancer Risks",
    });
  }

  /* ---------- 3. First-degree family history → risk review ---------- */
  const familyRows = form.family_history ?? [];
  const firstDegree = familyRows.filter((row) => {
    const rel = (row.relative ?? "").toLowerCase();
    return FIRST_DEGREE_RELATIVES.some((r) => rel.includes(r));
  });
  if (firstDegree.length > 0) {
    out.push({
      id: "family-risk",
      title: `Review family history risk factors — ${patientName}`,
      description: `${firstDegree.length} first-degree relative${firstDegree.length === 1 ? "" : "s"} with recorded illness — review hereditary risk and screening implications.`,
      category: "clinical",
      task_category: "dimension_review",
      priority: "medium",
      due_in_days: 30,
      assignee_name: "Dr. Laine",
      created_from: "Onboarding — Family history",
    });
  }

  /* ---------- 4. Targeted (additional) lab work ---------- */
  // Collect markers + reasons triggered by onboarding findings, beyond the
  // baseline panel that's ordered with the onboarding visit.
  const targetedMarkers = new Set<string>();
  const targetedReasons: string[] = [];

  if (concerningMole) {
    ["LDH", "S-100B"].forEach((m) => targetedMarkers.add(m));
    targetedReasons.push("suspicious mole (melanoma markers)");
  }

  const cancerInFamily = firstDegree.some((row) =>
    CANCER_RX.test(`${row.illness_name ?? ""} ${row.icd_code ?? ""}`),
  );
  if (cancerInFamily) {
    ["CA-125", "CEA", "CA 19-9", "AFP", "PSA"].forEach((m) => targetedMarkers.add(m));
    targetedReasons.push("first-degree family history of cancer (tumor markers / genetic referral baseline)");
  }

  const cardioInFamily = firstDegree.some((row) =>
    CARDIO_RX.test(`${row.illness_name ?? ""} ${row.icd_code ?? ""}`),
  );
  if (cardioInFamily) {
    ["Lp(a)", "ApoB", "hs-CRP"].forEach((m) => targetedMarkers.add(m));
    targetedReasons.push("first-degree family history of cardiovascular disease");
  }

  const currentMeds = (form.current_illnesses ?? []).flatMap((ill) =>
    (ill.medications ?? []).map((m) => (m as any)?.name ?? ""),
  ) as string[];
  for (const med of currentMeds) {
    for (const rule of MED_MONITORING) {
      if (rule.rx.test(med)) {
        rule.markers.forEach((m) => targetedMarkers.add(m));
        targetedReasons.push(`${rule.label} monitoring (${med})`);
      }
    }
  }

  if (targetedMarkers.size > 0) {
    const markerList = Array.from(targetedMarkers).join(", ");
    out.push({
      id: "targeted-lab-order",
      title: `Targeted lab order — ${patientName}`,
      description: `Additional markers beyond the baseline panel: ${markerList}. Triggered by: ${targetedReasons.join("; ")}.`,
      category: "care_coordination",
      task_category: "lab_review",
      priority: "high",
      due_in_days: 14,
      assignee_name: "Nurse Mäkinen",
      created_from: "Onboarding — Targeted labs",
    });
  }

  /* ---------- 5. Drug interaction review (kept) ---------- */
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

  return out;
}

export function dueDateFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
