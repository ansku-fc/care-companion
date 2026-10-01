// State layer for the visit intake flow — modelled on OnboardingFormContext.
// Holds the working ClinicalVisit draft and exposes set / patch / hydrate plus
// small array helpers for the sub-collections (symptoms, med changes,
// measurements, dimension updates, plan items).

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type {
  ClinicalVisit,
  VisitDiagnosis,
  PrescribingContext,
  MedicationChange,
  VisitTreatment,
  PlanPrescription,
  PlanReferral,
  PlanTask,
  PlanVaccination,
  PlanLabOrder,
  VisitMeasurement,
  VisitNotes,
  VisitPlan,
} from "@/lib/visits";

type VisitFormContextValue = {
  draft: ClinicalVisit;
  set: <K extends keyof ClinicalVisit>(key: K, value: ClinicalVisit[K]) => void;
  patch: (updates: Partial<ClinicalVisit>) => void;
  hydrate: (next: ClinicalVisit) => void;
  patchPlan: (updates: Partial<VisitPlan>) => void;
  patchNotes: (updates: Partial<VisitNotes>) => void;
  // Medication changes
  addMedicationChange: (m: MedicationChange) => void;
  removeMedicationChange: (id: string) => void;
  // Non-medication treatments
  addTreatment: (t: VisitTreatment) => void;
  removeTreatment: (id: string) => void;
  // Measurements
  addMeasurement: (m: VisitMeasurement) => void;
  removeMeasurement: (id: string) => void;
  // Diagnoses recorded this visit
  addDiagnosis: (d: VisitDiagnosis) => void;
  removeDiagnosis: (id: string) => void;
  updateDiagnosis: (id: string, patch: Partial<VisitDiagnosis>) => void;
  // Existing (baseline) diagnoses pulled in for prescribing (not re-scored)
  addPrescribingContext: (c: PrescribingContext) => void;
  removePrescribingContext: (id: string) => void;
  updatePrescribingContext: (id: string, patch: Partial<PrescribingContext>) => void;
  // Plan
  addTask: (t: PlanTask) => void;
  removeTask: (id: string) => void;
  addReferral: (r: PlanReferral) => void;
  removeReferral: (id: string) => void;
  addPrescription: (p: PlanPrescription) => void;
  removePrescription: (id: string) => void;
  addVaccination: (v: PlanVaccination) => void;
  removeVaccination: (id: string) => void;
  addLabOrder: (o: PlanLabOrder) => void;
  removeLabOrder: (id: string) => void;
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

  const patchPlan = useCallback((updates: Partial<VisitPlan>) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, ...updates } }));
  }, []);

  const patchNotes = useCallback((updates: Partial<VisitNotes>) => {
    setDraft((prev) => ({ ...prev, notes: { ...prev.notes, ...updates } }));
  }, []);

  const addMedicationChange = useCallback((m: MedicationChange) => {
    setDraft((prev) => ({ ...prev, medicationChanges: [...prev.medicationChanges, m] }));
  }, []);
  const removeMedicationChange = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, medicationChanges: prev.medicationChanges.filter((x) => x.id !== id) }));
  }, []);

  const addTreatment = useCallback((t: VisitTreatment) => {
    setDraft((prev) => ({ ...prev, treatments: [...(prev.treatments ?? []), t] }));
  }, []);
  const removeTreatment = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, treatments: (prev.treatments ?? []).filter((x) => x.id !== id) }));
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
  const updateDiagnosis = useCallback((id: string, patch: Partial<VisitDiagnosis>) => {
    setDraft((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }, []);
  const addPrescribingContext = useCallback((c: PrescribingContext) => {
    setDraft((prev) => ({ ...prev, prescribingContexts: [...(prev.prescribingContexts ?? []), c] }));
  }, []);
  const removePrescribingContext = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      prescribingContexts: (prev.prescribingContexts ?? []).filter((c) => c.id !== id),
    }));
  }, []);
  const updatePrescribingContext = useCallback((id: string, patch: Partial<PrescribingContext>) => {
    setDraft((prev) => ({
      ...prev,
      prescribingContexts: (prev.prescribingContexts ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
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
  const addVaccination = useCallback((v: PlanVaccination) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, vaccinations: [...(prev.plan.vaccinations ?? []), v] } }));
  }, []);
  const removeVaccination = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      plan: { ...prev.plan, vaccinations: (prev.plan.vaccinations ?? []).filter((x) => x.id !== id) },
    }));
  }, []);
  const addLabOrder = useCallback((o: PlanLabOrder) => {
    setDraft((prev) => ({ ...prev, plan: { ...prev.plan, labOrders: [...(prev.plan.labOrders ?? []), o] } }));
  }, []);
  const removeLabOrder = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      plan: { ...prev.plan, labOrders: (prev.plan.labOrders ?? []).filter((x) => x.id !== id) },
    }));
  }, []);

  const value = useMemo<VisitFormContextValue>(
    () => ({
      draft, set, patch, hydrate, patchPlan, patchNotes,
      addMedicationChange, removeMedicationChange,
      addTreatment, removeTreatment,
      addMeasurement, removeMeasurement, addDiagnosis, removeDiagnosis, updateDiagnosis,
      addPrescribingContext, removePrescribingContext, updatePrescribingContext,
      addTask, removeTask, addReferral, removeReferral, addPrescription, removePrescription,
      addVaccination, removeVaccination,
      addLabOrder, removeLabOrder,
    }),
    [
      draft, set, patch, hydrate, patchPlan, patchNotes,
      addMedicationChange, removeMedicationChange,
      addTreatment, removeTreatment,
      addMeasurement, removeMeasurement, addDiagnosis, removeDiagnosis, updateDiagnosis,
      addPrescribingContext, removePrescribingContext, updatePrescribingContext,
      addTask, removeTask, addReferral, removeReferral, addPrescription, removePrescription,
      addVaccination, removeVaccination,
      addLabOrder, removeLabOrder,
    ],
  );

  return <VisitFormContext.Provider value={value}>{children}</VisitFormContext.Provider>;
}

export function useVisitForm() {
  const ctx = useContext(VisitFormContext);
  if (!ctx) throw new Error("useVisitForm must be used within VisitFormProvider");
  return ctx;
}
