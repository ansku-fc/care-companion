// Keyword-based classifier for tasks. Mirrors the SQL backfill so the UI
// detects categories the same way the database does for historic rows.
//
// Categories drive the task detail panel:
//   lab_review, medication, dimension_review, followup, referral → clinical panel
//   administrative → manual panel (status / notes / edit / delete)

export type TaskCategoryKind =
  | "lab_review"
  | "medication"
  | "dimension_review"
  | "followup"
  | "referral"
  | "administrative";

export const TASK_CATEGORY_META: Record<
  TaskCategoryKind,
  { label: string; isClinical: boolean }
> = {
  lab_review:       { label: "Lab review",       isClinical: true  },
  medication:       { label: "Medication",       isClinical: true  },
  dimension_review: { label: "Dimension review", isClinical: true  },
  followup:         { label: "Follow-up",        isClinical: true  },
  referral:         { label: "Referral",         isClinical: true  },
  administrative:   { label: "Administrative",   isClinical: false },
};

// Order matters — first match wins. Mirrors the SQL backfill priority.
const RULES: { kind: TaskCategoryKind; re: RegExp }[] = [
  {
    kind: "lab_review",
    re: /\b(lab|laboratory|results?|enzymes?|markers?|hba1c|cholesterol|glucose|alat|asat|creatinine|hemoglobin|tsh|ferritin|vitamin|blood test|urine)\b/i,
  },
  {
    kind: "medication",
    re: /\b(prescription|medication|drug|renewals?|renew|supply|interaction|warfarin|metformin|statin|dose|dosage|ibuprofen)\b/i,
  },
  {
    kind: "dimension_review",
    re: /\b(cardiovascular|metabolic|cancer|mental health|sleep|respiratory|digestion|dimensions?|risk factor|risk index|thyroid function|blood pressure medication)\b/i,
  },
  {
    kind: "followup",
    re: /\b(follow.?up|post.?visit|check.?in|recall|review after)\b/i,
  },
  {
    kind: "referral",
    re: /\b(referrals?|refer|specialist|consult|colonoscopy|appointment|scheduling)\b/i,
  },
];

export function detectTaskCategory(title: string): TaskCategoryKind {
  const t = (title ?? "").toString();
  if (!t.trim()) return "administrative";
  for (const r of RULES) if (r.re.test(t)) return r.kind;
  return "administrative";
}

export function isClinicalCategory(c: string | null | undefined): boolean {
  if (!c) return false;
  const meta = TASK_CATEGORY_META[c as TaskCategoryKind];
  return !!meta?.isClinical;
}
