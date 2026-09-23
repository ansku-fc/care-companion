// State layer for the visit intake flow — modelled on OnboardingFormContext.
// Holds the working ClinicalVisit draft and exposes set / patch / hydrate plus
// small array helpers for the sub-collections (symptoms, med changes,
// measurements, dimension updates, plan items).

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type {
  ClinicalVisit,
  VisitDiagnosis,
  IntervalHistory,
  MedicationChange,
  PlanPrescription,
  PlanReferral,
  PlanTask,
  SymptomEntry,
  VisitMeasurement,
  VisitPlan,
} from "@/lib/visits";

type VisitFormContextValue = {
  draft: ClinicalVisit;
  set: <K extends keyof ClinicalVisit>(key: K, value: ClinicalVisit[K]) => void;
  patch: (updates: Partial<ClinicalVisit>) => void;
  hydrate: (next: ClinicalVisit) => void;
  patchInterval: (updates: Partial<IntervalHistory>) => void;
  patchPlan: (updates: Partial<VisitPlan>) => void;
  // Symptoms
  addSymptom: (s: SymptomEntry) => void;
  removeSymptom: (id: string) => void;
  // Medication changes
  addMedicationChange: (m: MedicationChange) => void;
  removeMedicationChange: (id: string) => void;
  // Measurements
  addMeasurement: (m: VisitMeasurement) => void;
  removeMeasurement: (id: string) => void;
  // Diagnoses recorded this visit
  addDiagnosis: (d: VisitDiagnosis) => void;
  removeDiagnosis: (id: string) => void;
  // Plan
  addTask: (t: PlanTask) => void;
  removeTask: (id: string) => void;
  addReferral: (r: PlanReferral) => void;
  removeReferral: (id: string) => void;
  addPrescription: (p: PlanPrescription) => void;
  removePrescription: (id: string) => void;
};

const VisitFormContext = createContext<VisitFormContextValue | null>(null);

export function VisitFormProvider({
  initial,
  children,
}: {
  initial: ClinicalVisit;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<ClinicalVisit>(initial);

  const set = useCallback(<K extends keyof ClinicalVisit>(key: K, value: ClinicalVisit[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const patch = useCallback((updates: Partial<ClinicalVisit>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const hydrate = useCallback((next: ClinicalVisit) => setDraft(next), []);

  const patchInterval = useCallback((updates: Partial<IntervalHistory>) => {
    setDraft((prev) => ({ ...prev, intervalHistory: { ...prev.intervalHistory, ...updates } }));
  }, []);

  const patchPlan = useCallback((updates: Partial<VisitPlan>) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, ...updates } }));
  }, []);

  const addSymptom = useCallback((s: SymptomEntry) => {
    setDraft((prev) => ({
      ...prev,
      intervalHistory: { ...prev.intervalHistory, newSymptoms: [...prev.intervalHistory.newSymptoms, s] },
    }));
  }, []);
  const removeSymptom = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      intervalHistory: {
        ...prev.intervalHistory,
        newSymptoms: prev.intervalHistory.newSymptoms.filter((x) => x.id !== id),
      },
    }));
  }, []);

  const addMedicationChange = useCallback((m: MedicationChange) => {
    setDraft((prev) => ({
      ...prev,
      intervalHistory: { ...prev.intervalHistory, medicationChanges: [...prev.intervalHistory.medicationChanges, m] },
    }));
  }, []);
  const removeMedicationChange = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      intervalHistory: {
        ...prev.intervalHistory,
        medicationChanges: prev.intervalHistory.medicationChanges.filter((x) => x.id !== id),
      },
    }));
  }, []);

  const addMeasurement = useCallback((m: VisitMeasurement) => {
    setDraft((prev) => ({ ...prev, measurements: [...prev.measurements, m] }));
  }, []);
  const removeMeasurement = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, measurements: prev.measurements.filter((x) => x.id !== id) }));
  }, []);

  const addDiagnosis = useCallback((d: VisitDiagnosis) => {
    setDraft((prev) => ({ ...prev, diagnoses: [...prev.diagnoses, d] }));
  }, []);
  const removeDiagnosis = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, diagnoses: prev.diagnoses.filter((d) => d.id !== id) }));
  }, []);

  const addTask = useCallback((t: PlanTask) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, tasks: [...prev.plan.tasks, t] } }));
  }, []);
  const removeTask = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, tasks: prev.plan.tasks.filter((x) => x.id !== id) } }));
  }, []);
  const addReferral = useCallback((r: PlanReferral) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, referrals: [...prev.plan.referrals, r] } }));
  }, []);
  const removeReferral = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, referrals: prev.plan.referrals.filter((x) => x.id !== id) } }));
  }, []);
  const addPrescription = useCallback((p: PlanPrescription) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, prescriptions: [...prev.plan.prescriptions, p] } }));
  }, []);
  const removePrescription = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      plan: { ...prev.plan, prescriptions: prev.plan.prescriptions.filter((x) => x.id !== id) },
    }));
  }, []);

  const value = useMemo<VisitFormContextValue>(
    () => ({
      draft, set, patch, hydrate, patchInterval, patchPlan,
      addSymptom, removeSymptom, addMedicationChange, removeMedicationChange,
      addMeasurement, removeMeasurement, addDiagnosis, removeDiagnosis,
      addTask, removeTask, addReferral, removeReferral, addPrescription, removePrescription,
    }),
    [
      draft, set, patch, hydrate, patchInterval, patchPlan,
      addSymptom, removeSymptom, addMedicationChange, removeMedicationChange,
      addMeasurement, removeMeasurement, addDiagnosis, removeDiagnosis,
      addTask, removeTask, addReferral, removeReferral, addPrescription, removePrescription,
    ],
  );

  return <VisitFormContext.Provider value={value}>{children}</VisitFormContext.Provider>;
}

export function useVisitForm() {
  const ctx = useContext(VisitFormContext);
  if (!ctx) throw new Error("useVisitForm must be used within VisitFormProvider");
  return ctx;
}
