// ────────────────────────────────────────────────────────────────────
// Sub-dimension scoring
//
// Each sub-dimension is independently derived from real patient signals
// (onboarding answers, lab results, diagnoses, medications, allergies).
//
// Conventions:
//   - returns `null` when no relevant data exists for that sub-dimension
//     (rendered as "—" in the UI)
//   - returns a number 1.0–10.0 when there is data
//
// General scale (per spec):
//   - All values healthy           → 1.0–2.5
//   - One mild concern             → 3.0–5.0
//   - One significant concern      → 5.5–7.5
//   - Multiple / critical concerns → 7.5–10.0
// ────────────────────────────────────────────────────────────────────

import type { Tables } from "@/integrations/supabase/types";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";

type Onboarding = Tables<"patient_onboarding"> | null;
type Lab = Tables<"patient_lab_results">;
type Diag = { diagnosis: string | null; icd_code: string | null };
type Med = { medication_name: string | null; indication: string | null };
type Allergy = { allergen: string | null };

export type SubScoreMap = Record<string, number | null>;

const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n * 10) / 10));

const matchesAny = (haystack: string | null | undefined, needles: string[]) => {
  if (!haystack) return false;
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
};

const anyDiag = (diags: Diag[], needles: string[]) =>
  diags.some(
    (d) => matchesAny(d.diagnosis, needles) || matchesAny(d.icd_code, needles),
  );

const anyMed = (meds: Med[], needles: string[]) =>
  meds.some(
    (m) =>
      matchesAny(m.medication_name, needles) || matchesAny(m.indication, needles),
  );

// ────────────────────────────────────────────────────────────────────
// Individual sub-scorers — return number or null
// ────────────────────────────────────────────────────────────────────

function scoreMentalWellbeing(o: Onboarding): number | null {
  if (!o) return null;
  const stress = o.stress_perceived;
  const gad = o.gad2_score ?? o.gad7_score;
  const phq = o.phq2_score;
  if (stress == null && gad == null && phq == null) return null;
  let s = 1.5;
  let concerns = 0;
  if (stress != null) {
    if (stress >= 8) { s += 5; concerns++; }
    else if (stress >= 6) { s += 3; concerns++; }
    else if (stress >= 4) { s += 1.5; }
  }
  if (gad != null) {
    if (gad >= 10) { s += 4; concerns++; }
    else if (gad >= 5) { s += 2; concerns++; }
    else if (gad >= 3) { s += 1; }
  }
  if (phq != null) {
    if (phq >= 3) { s += 3; concerns++; }
    else if (phq >= 2) { s += 1.5; }
  }
  if (concerns >= 2) s = Math.max(s, 7.5);
  return clamp(s);
}

function scoreSleepRecovery(o: Onboarding): number | null {
  if (!o) return null;
  const q = o.sleep_quality;
  const hrs = o.sleep_hours_per_night;
  const deep = o.deep_sleep_percent;
  const insomnia = o.insomnia;
  if (q == null && hrs == null && deep == null && insomnia == null) return null;
  let s = 1.5;
  let concerns = 0;
  if (q != null) {
    if (q <= 3) { s += 3.5; concerns++; }
    else if (q <= 5) { s += 1.5; }
  }
  if (hrs != null) {
    if (hrs < 5 || hrs > 10) { s += 3; concerns++; }
    else if (hrs < 6.5) { s += 1.5; }
  }
  if (deep != null && deep < 10) { s += 1.5; concerns++; }
  if (insomnia) { s += 2.5; concerns++; }
  if (concerns >= 2) s = Math.max(s, 6.5);
  return clamp(s);
}

function scoreSensoryOrgans(o: Onboarding): number | null {
  if (!o) return null;
  const flags = [
    o.symptom_smell, o.symptom_vision, o.symptom_hearing,
    o.illness_senses,
  ];
  if (flags.every((f) => f == null || f === false)) {
    if (o.illness_senses === false && !o.symptom_smell && !o.symptom_vision && !o.symptom_hearing) {
      return clamp(1.8);
    }
    return null;
  }
  const positive = flags.filter(Boolean).length;
  if (positive >= 3) return clamp(8.0);
  if (positive === 2) return clamp(6.0);
  if (positive === 1) return clamp(4.0);
  return clamp(1.8);
}

function scoreMemory(o: Onboarding): number | null {
  if (!o) return null;
  const age = o.age;
  if (age == null || age < 50) return null; // not relevant
  const cogIssue = o.illness_neurological || o.symptom_neurological;
  let s = 2.0;
  if (age >= 75) s += 1.5;
  else if (age >= 65) s += 0.8;
  if (cogIssue) s += 4;
  return clamp(s);
}

function scorePain(o: Onboarding, diags: Diag[]): number | null {
  const painDiag = anyDiag(diags, [
    "pain", "arthritis", "fibromyalgia", "neuralgia", "migraine",
    "m54", "m25", "g43", "g44", "r52",
  ]);
  const jointSym = o?.symptom_joint_pain;
  if (!painDiag && jointSym !== true && jointSym !== false) return null;
  let s = 1.8;
  if (jointSym) s += 3;
  if (painDiag) s += 4;
  return clamp(s);
}

function scoreSubstanceUse(o: Onboarding): number | null {
  if (!o) return null;
  const alc = o.alcohol_units_per_week;
  const smoking = o.smoking;
  const other = o.other_substances;
  const perceived = o.substance_use_perceived;
  if (alc == null && !smoking && other == null && perceived == null) return null;
  let s = 1.5;
  if (alc != null) {
    if (alc > 21) s += 4;
    else if (alc > 14) s += 2.5;
    else if (alc > 7) s += 1;
  }
  if (smoking && smoking !== "never" && smoking !== "Never" && smoking !== "no") {
    const sm = smoking.toLowerCase();
    if (sm.includes("daily") || sm.includes("current")) s += 4;
    else if (sm.includes("occasional") || sm.includes("former")) s += 1.5;
  }
  if (other) s += 2.5;
  if (perceived != null && perceived >= 6) s += 1.5;
  return clamp(s);
}

// ── Metabolic ──────────────────────────────────────────────────────
function scoreBloodGlucose(latestLab: Lab | null): number | null {
  const v = latestLab?.hba1c_mmol_mol;
  if (v == null) return null;
  if (v > 53) return clamp(8.0);
  if (v > 48) return clamp(6.5);
  if (v > 42) return clamp(4.5);
  return clamp(1.8);
}

function scoreLipids(latestLab: Lab | null): number | null {
  const v = latestLab?.ldl_mmol_l;
  if (v == null) return null;
  if (v > 4.5) return clamp(8.5);
  if (v > 4.0) return clamp(7.0);
  if (v > 3.0) return clamp(4.5);
  return clamp(1.8);
}

function scoreBodyComposition(o: Onboarding): number | null {
  if (!o) return null;
  const bmi = o.bmi != null ? Number(o.bmi) : null;
  const waist = o.waist_circumference_cm != null ? Number(o.waist_circumference_cm) : null;
  const whr = o.waist_to_hip_ratio != null ? Number(o.waist_to_hip_ratio) : null;
  if (bmi == null && waist == null && whr == null) return null;
  let s = 1.5;
  let concerns = 0;
  if (bmi != null) {
    if (bmi >= 35) { s += 5; concerns++; }
    else if (bmi >= 30) { s += 3.5; concerns++; }
    else if (bmi >= 27) { s += 2; }
    else if (bmi >= 25) { s += 1; }
    else if (bmi < 18.5) { s += 2; concerns++; }
  }
  if (waist != null) {
    if (waist >= 102) { s += 1.5; concerns++; }
    else if (waist >= 94) { s += 0.8; }
  }
  if (whr != null) {
    if (whr >= 1.0) { s += 1.5; concerns++; }
    else if (whr >= 0.9) { s += 0.6; }
  }
  if (concerns >= 2) s = Math.max(s, 6.5);
  return clamp(s);
}

function scoreThyroid(latestLab: Lab | null, o: Onboarding): number | null {
  const tsh = latestLab?.tsh_mu_l;
  const hormoneIllness = o?.illness_hormone;
  if (tsh == null && hormoneIllness == null) return null;
  let s = 1.8;
  if (tsh != null) {
    if (tsh > 10 || tsh < 0.1) s += 6;
    else if (tsh > 4 || tsh < 0.4) s += 3;
  }
  if (hormoneIllness) s += 2;
  return clamp(s);
}

function scoreLiver(latestLab: Lab | null, diags: Diag[]): number | null {
  const alat = latestLab?.alat_u_l;
  const ratio = latestLab?.alat_asat_ratio;
  const liverDiag = anyDiag(diags, ["liver", "hepat", "k70", "k71", "k72", "k73", "k74", "k76"]);
  if (alat == null && ratio == null && !liverDiag) return null;
  let s = 1.8;
  if (alat != null) {
    if (alat > 80) s += 5;
    else if (alat > 50) s += 3;
    else if (alat > 35) s += 1.5;
  }
  if (ratio != null && ratio > 1.5) s += 1.5;
  if (liverDiag) s += 3;
  return clamp(s);
}

function scoreEndocrine(latestLab: Lab | null, o: Onboarding): number | null {
  const t = scoreThyroid(latestLab, o);
  const g = scoreBloodGlucose(latestLab);
  const vals = [t, g].filter((x): x is number => x != null);
  if (!vals.length) return null;
  return clamp(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function scoreKidneys(latestLab: Lab | null, o: Onboarding): number | null {
  const egfr = latestLab?.egfr;
  const uacr = latestLab?.urine_acr_mg_mmol;
  const flag = latestLab?.u_alb_krea_abnormal;
  const kidneyIllness = o?.illness_kidney;
  if (egfr == null && uacr == null && flag == null && !kidneyIllness) return null;
  let s = 1.8;
  if (egfr != null) {
    if (egfr < 30) s += 6;
    else if (egfr < 60) s += 3;
    else if (egfr < 90) s += 1;
  }
  if (uacr != null && uacr > 3) s += 2;
  if (flag) s += 2;
  if (kidneyIllness) s += 2;
  return clamp(s);
}

function scoreNutrition(o: Onboarding): number | null {
  if (!o) return null;
  const f = o.fruits_vegetables_g_per_day;
  const fib = o.fiber_g_per_day;
  const sugar = o.sugar_g_per_day;
  const sodium = o.sodium_g_per_day;
  if (f == null && fib == null && sugar == null && sodium == null) return null;
  let s = 1.5;
  let concerns = 0;
  if (f != null && f < 400) { s += 1.5; concerns++; }
  if (fib != null && fib < 25) { s += 1.5; concerns++; }
  if (sugar != null && sugar > 50) { s += 1.5; concerns++; }
  if (sodium != null && sodium > 5) { s += 1.5; concerns++; }
  if (concerns >= 3) s = Math.max(s, 7);
  return clamp(s);
}

function scoreMetabolism(latestLab: Lab | null, o: Onboarding): number | null {
  const parts = [
    scoreBloodGlucose(latestLab),
    scoreLipids(latestLab),
    scoreBodyComposition(o),
  ].filter((x): x is number => x != null);
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// ── Cardiovascular ─────────────────────────────────────────────────
function scoreBloodPressure(o: Onboarding, latestLab: Lab | null): number | null {
  const sys = o?.bp1_systolic ?? latestLab?.blood_pressure_systolic;
  const dia = o?.bp1_diastolic ?? latestLab?.blood_pressure_diastolic;
  if (sys == null && dia == null) return null;
  let s = 1.8;
  if (sys != null) {
    if (sys >= 180) s += 7;
    else if (sys >= 160) s += 5;
    else if (sys >= 140) s += 3;
    else if (sys >= 130) s += 1.5;
  }
  if (dia != null) {
    if (dia >= 110) s += 4;
    else if (dia >= 100) s += 2.5;
    else if (dia >= 90) s += 1.5;
  }
  return clamp(s);
}

// ── Exercise ───────────────────────────────────────────────────────
function scoreCardioFitness(o: Onboarding): number | null {
  if (!o) return null;
  const easy = Number(o.cardio_easy_hours_per_week ?? 0);
  const mod = Number(o.cardio_moderate_hours_per_week ?? 0);
  const vig = Number(o.cardio_vigorous_hours_per_week ?? 0);
  const total = easy + mod + vig;
  if (
    o.cardio_easy_hours_per_week == null &&
    o.cardio_moderate_hours_per_week == null &&
    o.cardio_vigorous_hours_per_week == null
  ) return null;
  const metWeighted = easy * 0.5 + mod + vig * 2;
  if (metWeighted >= 5) return clamp(1.8);
  if (metWeighted >= 2.5) return clamp(3.5);
  if (total > 0) return clamp(5.5);
  return clamp(8.0);
}

function scoreStrength(o: Onboarding): number | null {
  if (!o || o.strength_hours_per_week == null) return null;
  const h = Number(o.strength_hours_per_week);
  if (h >= 2) return clamp(1.8);
  if (h >= 1) return clamp(3.5);
  if (h > 0) return clamp(5.5);
  return clamp(7.5);
}

function scoreMobility(o: Onboarding): number | null {
  if (!o) return null;
  const ms = o.illness_musculoskeletal;
  const restr = o.symptom_mobility_restriction;
  const joint = o.symptom_joint_pain;
  if (ms == null && restr == null && joint == null) return null;
  let s = 1.8;
  if (ms) s += 3;
  if (restr) s += 3;
  if (joint) s += 2;
  return clamp(s);
}

function scoreSedentary(o: Onboarding): number | null {
  if (!o || o.sedentary_hours_per_day == null) return null;
  const h = Number(o.sedentary_hours_per_day);
  if (h >= 10) return clamp(8.0);
  if (h >= 8) return clamp(6.0);
  if (h >= 6) return clamp(4.0);
  return clamp(1.8);
}

function scorePhysicalPerformance(o: Onboarding): number | null {
  const parts = [scoreCardioFitness(o), scoreStrength(o), scoreSedentary(o)]
    .filter((x): x is number => x != null);
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// ── Digestion ──────────────────────────────────────────────────────
function scoreGutHealth(o: Onboarding, diags: Diag[]): number | null {
  const giDiag = anyDiag(diags, ["gastritis", "ibs", "ibd", "crohn", "colitis", "k50", "k51", "k58", "k29"]);
  const giSym = o?.symptom_gastrointestinal;
  const giIll = o?.illness_gastrointestinal;
  if (!giDiag && giSym == null && giIll == null) return null;
  let s = 1.8;
  if (giSym) s += 2.5;
  if (giIll) s += 2;
  if (giDiag) s += 3.5;
  return clamp(s);
}

function scorePancreas(latestLab: Lab | null, diags: Diag[]): number | null {
  const pancDiag = anyDiag(diags, ["pancreat", "k85", "k86"]);
  const glu = scoreBloodGlucose(latestLab);
  if (!pancDiag && glu == null) return null;
  let s = glu ?? 1.8;
  if (pancDiag) s = Math.max(s, 7);
  return clamp(s);
}

// ── Respiratory & Immune ───────────────────────────────────────────
function scoreLungFunction(o: Onboarding, latestLab: Lab | null, diags: Diag[], meds: Med[]): number | null {
  const fev = latestLab?.fev1_percent;
  const pef = latestLab?.pef_percent;
  const respDiag = anyDiag(diags, ["asthma", "copd", "j44", "j45"]);
  const respMed = anyMed(meds, ["inhaler", "salbutamol", "budesonide", "formoterol"]);
  const sym = o?.symptom_respiratory;
  if (fev == null && pef == null && !respDiag && !respMed && sym == null) return null;
  let s = 1.8;
  if (fev != null) {
    if (fev < 50) s += 6;
    else if (fev < 70) s += 4;
    else if (fev < 80) s += 2;
  }
  if (pef != null && pef < 80) s += 1.5;
  if (respDiag) s += 3;
  if (respMed) s += 1;
  if (sym) s += 1;
  return clamp(s);
}

function scoreImmuneResilience(o: Onboarding, diags: Diag[]): number | null {
  const autoimmuneDiag = anyDiag(diags, ["lupus", "rheumatoid", "psoriasis", "hashimoto", "m05", "m06", "l40"]);
  const ill = o?.illness_immune;
  const inf = o?.infections_per_year;
  if (!autoimmuneDiag && ill == null && inf == null) return null;
  let s = 1.8;
  if (autoimmuneDiag) s += 4;
  if (ill) s += 2;
  if (inf != null) {
    if (inf > 6) s += 3;
    else if (inf > 3) s += 1.5;
  }
  return clamp(s);
}

function scoreAllergies(allergies: Allergy[], o: Onboarding): number | null {
  const n = allergies.length;
  const allergySym = o?.symptom_immune_allergies;
  if (n === 0 && allergySym == null) return null;
  let s = 1.8;
  if (n === 1) s += 1.5;
  else if (n === 2) s += 3;
  else if (n >= 3) s += 5;
  if (allergySym) s += 1;
  return clamp(s);
}

// ── Cancer ─────────────────────────────────────────────────────────
function scoreScreening(o: Onboarding): number | null {
  if (!o) return null;
  const flags = [o.cancer_screening_breast, o.cancer_screening_cervical, o.cancer_screening_colorectal];
  if (flags.every((f) => f == null)) return null;
  const known = flags.filter((f) => f != null) as boolean[];
  const overdue = known.filter((f) => f === false).length;
  const ratio = overdue / known.length;
  if (ratio === 0) return clamp(1.8);
  if (ratio < 0.5) return clamp(4.5);
  if (ratio < 1) return clamp(6.5);
  return clamp(8.0);
}

function scoreFamilyHistory(o: Onboarding): number | null {
  if (!o) return null;
  const flags = [o.genetic_cancer, o.genetic_melanoma, o.genetic_nervous_system, o.genetic_cardiovascular];
  if (flags.every((f) => f == null || f === false)) {
    if (flags.some((f) => f === false)) return clamp(1.8);
    return null;
  }
  const positive = flags.filter(Boolean).length;
  if (positive >= 2) return clamp(7.5);
  if (positive === 1) return clamp(5.5);
  return clamp(1.8);
}

function scoreCancerLifestyle(o: Onboarding): number | null {
  if (!o) return null;
  const sub = scoreSubstanceUse(o);
  const body = scoreBodyComposition(o);
  const sun = o.sun_exposure;
  const parts: number[] = [];
  if (sub != null) parts.push(sub);
  if (body != null) parts.push(body);
  if (sun === true) parts.push(5);
  else if (sun === false) parts.push(2);
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function scorePrecancerous(o: Onboarding): number | null {
  if (!o || (o.prev_precancerous == null && o.prev_cancer == null)) return null;
  let s = 1.8;
  if (o.prev_precancerous) s += 4;
  if (o.prev_cancer) s += 4;
  return clamp(s);
}

function scoreGynCancer(o: Onboarding, diags: Diag[]): number | null {
  const cervical = o?.cancer_screening_cervical;
  const gynDiag = anyDiag(diags, ["c50", "c53", "c54", "c56", "breast cancer", "cervical", "ovarian"]);
  if (cervical == null && !gynDiag) return null;
  let s = 1.8;
  if (cervical === false) s += 3.5;
  if (gynDiag) s += 5;
  return clamp(s);
}

function scoreProstateOtherCancer(o: Onboarding, diags: Diag[]): number | null {
  const colo = o?.cancer_screening_colorectal;
  const otherDiag = anyDiag(diags, ["c61", "c18", "c19", "c20", "prostate", "colorectal", "colon cancer"]);
  if (colo == null && !otherDiag) return null;
  let s = 1.8;
  if (colo === false) s += 3.5;
  if (otherDiag) s += 5;
  return clamp(s);
}

// ── Skin / Oral / Mucosal ──────────────────────────────────────────
function scoreSkin(o: Onboarding, diags: Diag[]): number | null {
  const skinCond = o?.skin_condition;
  const rashSym = o?.symptom_skin_rash;
  const skinDiag = anyDiag(diags, ["dermatitis", "psoriasis", "melanoma", "l20", "l40", "c43", "d22"]);
  if (skinCond == null && rashSym == null && !skinDiag) return null;
  let s = 1.8;
  if (skinCond != null) {
    if (skinCond <= 3) s += 4;
    else if (skinCond <= 5) s += 2;
  }
  if (rashSym) s += 1.5;
  if (skinDiag) s += 3;
  return clamp(s);
}

function scoreMucousMembranes(o: Onboarding): number | null {
  const sym = o?.symptom_mucous_membranes;
  if (sym == null) return null;
  return sym ? clamp(5) : clamp(1.8);
}

function scoreDentalHealth(diags: Diag[]): number | null {
  const oral = anyDiag(diags, ["caries", "periodont", "k02", "k05", "dental", "tooth"]);
  if (!oral) return null;
  return clamp(6);
}

// ── Reproductive & Sexual Health ───────────────────────────────────
function scoreUrology(o: Onboarding, diags: Diag[]): number | null {
  const uro = anyDiag(diags, ["prostat", "n40", "n41", "uti", "n39"]);
  const kidneySym = o?.symptom_kidney_function;
  if (!uro && kidneySym == null) return null;
  let s = 1.8;
  if (uro) s += 4;
  if (kidneySym) s += 2;
  return clamp(s);
}

function scoreGynaecology(o: Onboarding, diags: Diag[]): number | null {
  const gyn = anyDiag(diags, ["menstr", "menopause", "endometr", "n80", "n92", "n95"]);
  const sym = o?.symptom_menstruation_menopause;
  if (!gyn && sym == null) return null;
  let s = 1.8;
  if (sym) s += 3;
  if (gyn) s += 4;
  return clamp(s);
}

function scorePregnancy(diags: Diag[]): number | null {
  const preg = anyDiag(diags, ["pregnan", "z34", "o00", "o09"]);
  if (!preg) return null;
  return clamp(3.0);
}

// ────────────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────────────

export interface ScoringInput {
  onboarding: Onboarding;
  labResults: Lab[];
  diagnoses: Diag[];
  medications: Med[];
  allergies: Allergy[];
}

export function computeSubScores(input: ScoringInput): SubScoreMap {
  const { onboarding, labResults, diagnoses, medications, allergies } = input;
  const sortedLabs = [...labResults].sort((a, b) =>
    (b.result_date || "").localeCompare(a.result_date || ""),
  );
  const latestLab = sortedLabs[0] || null;

  const map: SubScoreMap = {};

  // Brain & Mental Health
  map["mental_wellbeing"] = scoreMentalWellbeing(onboarding);
  map["sleep_recovery"] = scoreSleepRecovery(onboarding);
  map["sensory_organs"] = scoreSensoryOrgans(onboarding);
  map["memory"] = scoreMemory(onboarding);
  map["pain"] = scorePain(onboarding, diagnoses);
  map["substance_use"] = scoreSubstanceUse(onboarding);

  // Metabolic
  map["endocrine"] = scoreEndocrine(latestLab, onboarding);
  map["kidneys"] = scoreKidneys(latestLab, onboarding);
  map["body_composition"] = scoreBodyComposition(onboarding);
  map["nutrition"] = scoreNutrition(onboarding);
  map["metabolism"] = scoreMetabolism(latestLab, onboarding);

  // Exercise & Functional
  map["musculoskeletal"] = scoreMobility(onboarding);
  map["physical_performance"] = scorePhysicalPerformance(onboarding);

  // Digestion
  map["gastrointestinal"] = scoreGutHealth(onboarding, diagnoses);
  map["liver"] = scoreLiver(latestLab, diagnoses);
  map["pancreas"] = scorePancreas(latestLab, diagnoses);

  // Respiratory & Immune
  map["respiratory"] = scoreLungFunction(onboarding, latestLab, diagnoses, medications);
  map["immune_defence"] = scoreImmuneResilience(onboarding, diagnoses);
  map["allergies"] = scoreAllergies(allergies, onboarding);

  // Cancer
  map["gynaecological_cancer"] = scoreGynCancer(onboarding, diagnoses);
  map["prostate_other_cancer"] = scoreProstateOtherCancer(onboarding, diagnoses);
  map["precancerous"] = scorePrecancerous(onboarding);

  // Skin / Oral / Mucosal
  map["skin"] = scoreSkin(onboarding, diagnoses);
  map["mucous_membranes"] = scoreMucousMembranes(onboarding);
  map["dental_health"] = scoreDentalHealth(diagnoses);

  // Reproductive & Sexual
  map["urology"] = scoreUrology(onboarding, diagnoses);
  map["gynaecology"] = scoreGynaecology(onboarding, diagnoses);
  map["pregnancy"] = scorePregnancy(diagnoses);

  return map;
}

/**
 * Aggregate sub-scores into a parent score = average of non-null subs.
 * Returns null when no sub has data.
 */
export function aggregateMainScore(
  mainKey: string,
  subScores: SubScoreMap,
): number | null {
  const main = HEALTH_TAXONOMY.find((m) => m.key === mainKey);
  if (!main || !main.subDimensions.length) return null;
  const vals = main.subDimensions
    .map((s) => subScores[s.key])
    .filter((x): x is number => x != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
