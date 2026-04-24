import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

/* ---------------- Types ---------------- */

export type IllnessRow = {
  id: string;
  icd_code: string;
  illness_name: string;
  onset_year: number | null;
  resolved_year: number | null; // only used by previous illnesses
  medications: string[];
  notes: string;
};

export type FamilyHistoryRow = {
  id: string;
  relative: string;
  icd_code: string;
  illness_name: string;
  age_at_diagnosis: number | null;
  deceased: boolean;
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
  allergies: string[];
  supplements: string[];

  /* Step 2 — Illnesses & medications */
  current_illnesses: IllnessRow[];
  previous_illnesses: IllnessRow[];

  /* Step 3 — Family history */
  family_history: FamilyHistoryRow[];

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
});

const blankFamily = (): FamilyHistoryRow => ({
  id: crypto.randomUUID(),
  relative: "",
  icd_code: "",
  illness_name: "",
  age_at_diagnosis: null,
  deceased: false,
});

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
