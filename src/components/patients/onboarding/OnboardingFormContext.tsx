import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

/* ---------------- Types ---------------- */

import type { AllergySeverity } from "@/lib/allergens";

export type AllergyEntry = {
  name: string;
  icd_code: string | null;
  severity: AllergySeverity | null;
};

export type MedicationFrequency =
  | "once_daily"
  | "twice_daily"
  | "three_times_daily"
  | "as_needed"
  | "weekly"
  | "other"
  | "";

export type MedicationRoute =
  | "oral"
  | "topical"
  | "inhaled"
  | "injection"
  | "other"
  | "";

export type MedicationDetail = {
  /** Display name (e.g. "Metformin"). */
  name: string;
  /** Optional ATC code if known. */
  atc?: string;
  dose: string;
  frequency: MedicationFrequency;
  route: MedicationRoute;
  start_year: number | null;
  notes: string;
};

export type IllnessRow = {
  id: string;
  icd_code: string;
  illness_name: string;
  onset_year: number | null;
  resolved_year: number | null; // only used by previous illnesses
  medications: MedicationDetail[];
  notes: string;
  /** Health-dimension keys (matches DIMENSION_TAGS keys). */
  dimensions: string[];
  /** Whether the doctor has confirmed the suggested dimensions. */
  dimensions_confirmed: boolean;
};

/** Normalize legacy `string[]` medications stored in extra_data to the new shape. */
export function normalizeMedications(input: unknown): MedicationDetail[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m): MedicationDetail | null => {
      if (typeof m === "string") {
        return { name: m, dose: "", frequency: "", route: "", start_year: null, notes: "" };
      }
      if (m && typeof m === "object") {
        const o = m as Record<string, unknown>;
        if (typeof o.name !== "string" || !o.name.trim()) return null;
        return {
          name: o.name,
          atc: typeof o.atc === "string" ? o.atc : undefined,
          dose: typeof o.dose === "string" ? o.dose : "",
          frequency: (o.frequency as MedicationFrequency) ?? "",
          route: (o.route as MedicationRoute) ?? "",
          start_year:
            typeof o.start_year === "number"
              ? o.start_year
              : o.start_year == null
                ? null
                : Number(o.start_year) || null,
          notes: typeof o.notes === "string" ? o.notes : "",
        };
      }
      return null;
    })
    .filter((m): m is MedicationDetail => !!m);
}

export function normalizeIllnessRows(input: unknown): IllnessRow[] {
  if (!Array.isArray(input)) return [];
  return input.map((row: any) => ({
    id: typeof row?.id === "string" ? row.id : crypto.randomUUID(),
    icd_code: row?.icd_code ?? "",
    illness_name: row?.illness_name ?? "",
    onset_year: row?.onset_year ?? null,
    resolved_year: row?.resolved_year ?? null,
    medications: normalizeMedications(row?.medications),
    notes: row?.notes ?? "",
    dimensions: Array.isArray(row?.dimensions) ? row.dimensions : [],
    dimensions_confirmed: Boolean(row?.dimensions_confirmed),
  }));
}

export type FamilyHistoryRow = {
  id: string;
  relative: string;
  icd_code: string;
  illness_name: string;
  age_at_diagnosis: number | null;
  deceased: boolean;
};

export type ExamFindingKey =
  | "heart"
  | "peripheral_circulation"
  | "lungs"
  | "lymph_nodes"
  | "thyroid"
  | "skin_general"
  | "abdomen"
  | "eyes"
  | "ears"
  | "musculoskeletal";

export type ExamFinding = { present: boolean; notes: string };

export type ExamFindings = Record<ExamFindingKey, ExamFinding> & {
  peripheral_adp: ExamFinding;
  peripheral_atp: ExamFinding;
  peripheral_afem: ExamFinding;
};

export type MoleEntry = {
  id: string;
  label: string;
  side: "front" | "back";
  location: string;
  asymmetry: string;
  borders: string;
  color: string;
  size: string;
  change: string;
  symptoms: string;
};

export type OnboardingForm = {
  /* Step 1 — Basic Info */
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  waist_circumference_cm: number | null;
  hip_circumference_cm: number | null;
  occupation: string;
  education_level: string;
  shift_work: boolean;
  bp1_systolic: number | null;
  bp1_diastolic: number | null;
  bp2_systolic: number | null;
  bp2_diastolic: number | null;
  ecg_notes: string;
  allergies: AllergyEntry[];
  supplements: string[];

  /* Step 2 — Illnesses & medications */
  current_illnesses: IllnessRow[];
  previous_illnesses: IllnessRow[];

  /* Step 3 — Family history */
  family_history: FamilyHistoryRow[];

  /* Step 4 — Lifestyle */
  smoking_current: boolean;
  smoking_cigs_per_day: number | null;
  smoking_years: number | null;
  smoking_previous: boolean;
  smoking_previous_years: number | null;
  alcohol_current: boolean;
  alcohol_units_per_week: number | null;
  caffeine_current: boolean;
  caffeine_cups_per_day: number | null;
  caffeine_last_cup_time: string;
  nicotine_pouches_current: boolean;
  nicotine_pouches_per_day: number | null;
  nicotine_pouches_strength: string;
  drugs_current: boolean;
  drugs_notes: string;

  /* Step 5 — Physical Activity */
  cardio_easy_hours_per_week: number | null;
  cardio_moderate_hours_per_week: number | null;
  cardio_vigorous_hours_per_week: number | null;
  strength_hours_per_week: number | null;
  sedentary_hours_per_day: number | null;

  /* Step 6 — Nutrition */
  diet_type: string;
  water_litres_per_day: number | null;
  fruits_vegetables_g_per_day: number | null;
  fish_g_per_day: number | null;
  red_meat_g_per_day: number | null;
  sugar_g_per_day: number | null;
  sodium_g_per_day: number | null;

  /* Step 7 — Sleep */
  sleep_quality: number | null;
  sleep_bedtime: string;
  sleep_waking_time: string;
  sleep_latency_mins: number | null;
  sleep_total_hours: number | null;
  sleep_deep_percent: number | null;
  sleep_efficiency_percent: number | null;
  daytime_fatigue: number | null;
  insomnia: boolean;
  restless_legs: boolean;
  sleep_apnea: boolean;
  sleep_apnea_type: string;
  sleep_apnea_severity: string;

  /* Step 8 — Mental Health */
  social_support_perceived: number | null;
  recovery_perceived: number | null;
  workload_perceived: number | null;
  stress_perceived: number | null;
  gad2_enabled: boolean;
  gad2_q1: number | null;
  gad2_q2: number | null;
  phq2_enabled: boolean;
  phq2_q1: number | null;
  phq2_q2: number | null;

  /* Step 9 — Cancer */
  screen_breast: boolean;
  screen_breast_year: number | null;
  screen_cervix: boolean;
  screen_cervix_year: number | null;
  screen_colorectum: boolean;
  screen_colorectum_year: number | null;
  screen_prostate: boolean;
  screen_prostate_year: number | null;
  screen_skin: boolean;
  screen_skin_year: number | null;
  screen_lung: boolean;
  screen_lung_year: number | null;
  precancer_skin: boolean;
  precancer_skin_year: number | null;
  precancer_cervix: boolean;
  precancer_cervix_year: number | null;
  precancer_colorectum: boolean;
  precancer_colorectum_year: number | null;
  sun_exposure: boolean;
  sun_protection_method: string;
  severe_sunburns_history: boolean;

  /* Step 10 — Status */
  exam_findings: ExamFindings;
  moles_enabled: boolean;
  moles: MoleEntry[];

  /* Step tracking */
  current_step: number;
  /** Steps the doctor explicitly marked complete (Save) vs skipped. */
  completed_steps: number[];
  skipped_steps: number[];
};

const blankIllness = (): IllnessRow => ({
  id: crypto.randomUUID(),
  icd_code: "",
  illness_name: "",
  onset_year: null,
  resolved_year: null,
  medications: [],
  notes: "",
  dimensions: [],
  dimensions_confirmed: false,
});

const blankFamily = (): FamilyHistoryRow => ({
  id: crypto.randomUUID(),
  relative: "",
  icd_code: "",
  illness_name: "",
  age_at_diagnosis: null,
  deceased: false,
});

const emptyFinding = (): ExamFinding => ({ present: false, notes: "" });

export function blankExamFindings(): ExamFindings {
  return {
    heart: emptyFinding(),
    peripheral_circulation: emptyFinding(),
    lungs: emptyFinding(),
    lymph_nodes: emptyFinding(),
    thyroid: emptyFinding(),
    skin_general: emptyFinding(),
    abdomen: emptyFinding(),
    eyes: emptyFinding(),
    ears: emptyFinding(),
    musculoskeletal: emptyFinding(),
    peripheral_adp: emptyFinding(),
    peripheral_atp: emptyFinding(),
    peripheral_afem: emptyFinding(),
  };
}

export function blankMole(label = "Mole 1"): MoleEntry {
  return {
    id: crypto.randomUUID(),
    label,
    side: "front",
    location: "",
    asymmetry: "",
    borders: "",
    color: "",
    size: "",
    change: "",
    symptoms: "",
  };
}

export const blankOnboardingForm: OnboardingForm = {
  age: null,
  height_cm: null,
  weight_kg: null,
  waist_circumference_cm: null,
  hip_circumference_cm: null,
  occupation: "",
  education_level: "",
  shift_work: false,
  bp1_systolic: null,
  bp1_diastolic: null,
  bp2_systolic: null,
  bp2_diastolic: null,
  ecg_notes: "",
  allergies: [],
  supplements: [],

  current_illnesses: [],
  previous_illnesses: [],

  family_history: [],

  smoking_current: false,
  smoking_cigs_per_day: null,
  smoking_years: null,
  smoking_previous: false,
  smoking_previous_years: null,
  alcohol_current: false,
  alcohol_units_per_week: null,
  caffeine_current: false,
  caffeine_cups_per_day: null,
  caffeine_last_cup_time: "",
  nicotine_pouches_current: false,
  nicotine_pouches_per_day: null,
  nicotine_pouches_strength: "",
  drugs_current: false,
  drugs_notes: "",

  cardio_easy_hours_per_week: null,
  cardio_moderate_hours_per_week: null,
  cardio_vigorous_hours_per_week: null,
  strength_hours_per_week: null,
  sedentary_hours_per_day: null,

  diet_type: "",
  water_litres_per_day: null,
  fruits_vegetables_g_per_day: null,
  fish_g_per_day: null,
  red_meat_g_per_day: null,
  sugar_g_per_day: null,
  sodium_g_per_day: null,

  sleep_quality: null,
  sleep_bedtime: "",
  sleep_waking_time: "",
  sleep_latency_mins: null,
  sleep_total_hours: null,
  sleep_deep_percent: null,
  sleep_efficiency_percent: null,
  daytime_fatigue: null,
  insomnia: false,
  restless_legs: false,
  sleep_apnea: false,
  sleep_apnea_type: "",
  sleep_apnea_severity: "",

  social_support_perceived: null,
  recovery_perceived: null,
  workload_perceived: null,
  stress_perceived: null,
  gad2_enabled: false,
  gad2_q1: null,
  gad2_q2: null,
  phq2_enabled: false,
  phq2_q1: null,
  phq2_q2: null,

  screen_breast: false,
  screen_breast_year: null,
  screen_cervix: false,
  screen_cervix_year: null,
  screen_colorectum: false,
  screen_colorectum_year: null,
  screen_prostate: false,
  screen_prostate_year: null,
  screen_skin: false,
  screen_skin_year: null,
  screen_lung: false,
  screen_lung_year: null,
  precancer_skin: false,
  precancer_skin_year: null,
  precancer_cervix: false,
  precancer_cervix_year: null,
  precancer_colorectum: false,
  precancer_colorectum_year: null,
  sun_exposure: false,
  sun_protection_method: "",
  severe_sunburns_history: false,

  exam_findings: blankExamFindings(),
  moles_enabled: false,
  moles: [],

  current_step: 1,
  completed_steps: [],
  skipped_steps: [],
};

/* ---------------- Auto-calculations ---------------- */

export function calcBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function calcWaistHipRatio(waist: number | null, hip: number | null): number | null {
  if (!waist || !hip || hip <= 0) return null;
  return Math.round((waist / hip) * 100) / 100;
}

/** MET hours per week — Easy×3.5 + Moderate×5 + Vigorous×8 + Strength×4. */
export function calcMetHours(
  easy: number | null,
  moderate: number | null,
  vigorous: number | null,
  strength: number | null,
): number | null {
  const vals = [easy, moderate, vigorous, strength];
  if (vals.every((v) => v === null || v === 0)) return null;
  const total = (easy ?? 0) * 3.5 + (moderate ?? 0) * 5 + (vigorous ?? 0) * 8 + (strength ?? 0) * 4;
  return Math.round(total * 10) / 10;
}

/** Estimated fiber from fruit+veg grams (×0.05). */
export function calcFiberFromFruitVeg(fruitVegG: number | null): number | null {
  if (!fruitVegG || fruitVegG <= 0) return null;
  return Math.round(fruitVegG * 0.05 * 10) / 10;
}

/* ---------------- Context ---------------- */

type OnboardingFormContextValue = {
  form: OnboardingForm;
  set: <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => void;
  patch: (updates: Partial<OnboardingForm>) => void;
  /** Replace the entire form (used when loading a draft). */
  hydrate: (next: OnboardingForm) => void;
  addIllness: (kind: "current" | "previous") => void;
  removeIllness: (kind: "current" | "previous", id: string) => void;
  updateIllness: (kind: "current" | "previous", id: string, updates: Partial<IllnessRow>) => void;
  addFamilyRow: () => void;
  removeFamilyRow: (id: string) => void;
  updateFamilyRow: (id: string, updates: Partial<FamilyHistoryRow>) => void;
};

const OnboardingFormContext = createContext<OnboardingFormContextValue | null>(null);

export function OnboardingFormProvider({
  initial,
  children,
}: {
  initial?: Partial<OnboardingForm>;
  children: ReactNode;
}) {
  const [form, setForm] = useState<OnboardingForm>({ ...blankOnboardingForm, ...initial });

  const set = useCallback(<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patch = useCallback((updates: Partial<OnboardingForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const hydrate = useCallback((next: OnboardingForm) => setForm(next), []);

  const addIllness = useCallback((kind: "current" | "previous") => {
    setForm((prev) => {
      const key = kind === "current" ? "current_illnesses" : "previous_illnesses";
      return { ...prev, [key]: [...prev[key], blankIllness()] };
    });
  }, []);

  const removeIllness = useCallback((kind: "current" | "previous", id: string) => {
    setForm((prev) => {
      const key = kind === "current" ? "current_illnesses" : "previous_illnesses";
      return { ...prev, [key]: prev[key].filter((row) => row.id !== id) };
    });
  }, []);

  const updateIllness = useCallback(
    (kind: "current" | "previous", id: string, updates: Partial<IllnessRow>) => {
      setForm((prev) => {
        const key = kind === "current" ? "current_illnesses" : "previous_illnesses";
        return {
          ...prev,
          [key]: prev[key].map((row) => (row.id === id ? { ...row, ...updates } : row)),
        };
      });
    },
    [],
  );

  const addFamilyRow = useCallback(() => {
    setForm((prev) => ({ ...prev, family_history: [...prev.family_history, blankFamily()] }));
  }, []);

  const removeFamilyRow = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, family_history: prev.family_history.filter((r) => r.id !== id) }));
  }, []);

  const updateFamilyRow = useCallback((id: string, updates: Partial<FamilyHistoryRow>) => {
    setForm((prev) => ({
      ...prev,
      family_history: prev.family_history.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, []);

  const value = useMemo<OnboardingFormContextValue>(
    () => ({
      form,
      set,
      patch,
      hydrate,
      addIllness,
      removeIllness,
      updateIllness,
      addFamilyRow,
      removeFamilyRow,
      updateFamilyRow,
    }),
    [form, set, patch, hydrate, addIllness, removeIllness, updateIllness, addFamilyRow, removeFamilyRow, updateFamilyRow],
  );

  return <OnboardingFormContext.Provider value={value}>{children}</OnboardingFormContext.Provider>;
}

export function useOnboardingForm() {
  const ctx = useContext(OnboardingFormContext);
  if (!ctx) throw new Error("useOnboardingForm must be used within OnboardingFormProvider");
  return ctx;
}
