// Inline diagnosis entry for the diagnosis-driven prescribing flow. Picking a
// diagnosis from the ICD-10 catalog immediately records a NEW active
// VisitDiagnosis (dimensions derived from the ICD→dimension mapping) and closes
// — adding and prescribing are one motion, no separate "Add diagnosis" step.
// Diagnoses the patient ALREADY has are excluded from the catalog (you can't
// newly-diagnose an existing condition; those live in "Current diagnoses").
import { useMemo } from "react";
import { ICD10_ILLNESSES } from "@/lib/onboardingTaxonomy";
import { suggestDimensionsForIcd } from "@/lib/visits";
import { FormCard, uid } from "@/components/visits/forms";
import { Combobox, type ComboOption } from "./Combobox";
import { useVisitForm } from "./VisitFormProvider";

type CurrentDiagnosis = { name: string; icd10: string };

// Catalog sorted by condition NAME (not code) for predictable scanning.
const ICD_OPTIONS: ComboOption[] = [...ICD10_ILLNESSES]
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  .map((e) => ({
    value: e.code,
    label: `${e.code} — ${e.name}`,
    searchText: `${e.code} ${e.name}`,
  }));

export function DiagnosisEntryForm({
  onClose,
  currentDiagnoses = [],
}: {
  onClose: () => void;
  currentDiagnoses?: CurrentDiagnosis[];
}) {
  const f = useVisitForm();

  // Exclude conditions the patient already has (mirrors the medication add flow,
  // which hides drugs the patient is already on).
  const options = useMemo(() => {
    const have = new Set(currentDiagnoses.map((d) => d.icd10));
    return ICD_OPTIONS.filter((o) => !have.has(o.value));
  }, [currentDiagnoses]);

  // Pick → record a new active diagnosis straight away; dimensions are derived
  // from the ICD, never hand-tagged. The prompt then opens in "New diagnoses".
  const onPick = (code: string) => {
    const name = ICD10_ILLNESSES.find((e) => e.code === code)?.name ?? "";
    if (!name) return;
    f.addDiagnosis({ id: uid(), name, icd10: code, status: "active", dimensions: suggestDimensionsForIcd(code) });
    onClose();
  };

  return (
    <FormCard onClose={onClose}>
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Diagnosis or ICD-10</div>
        <Combobox
          options={options}
          value={null}
          onSelect={onPick}
          placeholder="Search diagnoses…"
          searchPlaceholder="Search the ICD-10 catalog…"
        />
      </div>
    </FormCard>
  );
}
