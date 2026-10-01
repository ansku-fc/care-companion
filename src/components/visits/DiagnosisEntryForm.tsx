// Inline diagnosis entry — relocated verbatim from the retired VisitDrawer.
// Renders in place (expand-in-place) within the center column; wires straight
// into the visit draft via useVisitForm. ICD combobox + dimension tagging.
import { useState } from "react";
import { ICD10_ILLNESSES } from "@/lib/onboardingTaxonomy";
import {
  suggestDimensionsForIcd,
  type DimensionKey,
  type DiagnosisStatus,
} from "@/lib/visits";
import { FormCard, SelectField, PrimaryButton, CancelLink, uid } from "@/components/visits/forms";
import { DimensionMultiSelect } from "./DimensionMultiSelect";
import { Combobox, type ComboOption } from "./Combobox";
import { useVisitForm } from "./VisitFormProvider";

const ICD_OPTIONS: ComboOption[] = ICD10_ILLNESSES.map((e) => ({
  value: e.code,
  label: `${e.code} — ${e.name}`,
  searchText: `${e.code} ${e.name}`,
}));

export function DiagnosisEntryForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const [icd10, setIcd10] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<DiagnosisStatus>("active");
  const [dims, setDims] = useState<DimensionKey[]>([]);
  const onPickIcd = (code: string) => {
    setIcd10(code);
    setName(ICD10_ILLNESSES.find((e) => e.code === code)?.name ?? "");
    const s = suggestDimensionsForIcd(code);
    if (s.length) setDims(s);
  };
  const save = () => {
    if (!name.trim()) return;
    f.addDiagnosis({ id: uid(), name: name.trim(), icd10: icd10.trim(), status, dimensions: dims });
    onClose();
  };
  return (
    <FormCard onClose={onClose}>
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Condition (ICD-10)</div>
        <Combobox options={ICD_OPTIONS} value={icd10 || null} onSelect={onPickIcd} placeholder="Search diagnoses…" searchPlaceholder="Search code or condition…" />
      </div>
      <SelectField value={status} onChange={(v) => setStatus(v as DiagnosisStatus)} options={["active", "resolved"]} />
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Related dimension(s)</div>
        <DimensionMultiSelect value={dims} onChange={setDims} />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton disabled={!name.trim()} onClick={save}>Add diagnosis</PrimaryButton>
      </div>
    </FormCard>
  );
}
