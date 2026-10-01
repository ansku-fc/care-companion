// Inline vaccination entry for the right rail. Records a vaccine given or
// ordered this visit; vaccine chosen from a searchable dropdown (synthetic
// catalog — see vaccineCatalog.ts). Writes onto plan.vaccinations.
import { useState } from "react";
import { VACCINES } from "@/lib/vaccineCatalog";
import { type VaccinationStatus } from "@/lib/visits";
import { FormCard, DateField, ChipSelector, TextField, PrimaryButton, CancelLink, uid } from "@/components/visits/forms";
import { Combobox, type ComboOption } from "./Combobox";
import { useVisitForm } from "./VisitFormProvider";

const VACCINE_OPTIONS: ComboOption[] = VACCINES.map((v) => ({ value: v, label: v, searchText: v }));
const STATUSES = ["given", "ordered"] as const;

export function VaccinationEntryForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const [vaccine, setVaccine] = useState("");
  const [status, setStatus] = useState<VaccinationStatus>("given");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    if (!vaccine.trim()) return;
    f.addVaccination({
      id: uid(),
      vaccine: vaccine.trim(),
      status,
      date: date.trim() || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <FormCard onClose={onClose}>
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Vaccine</div>
        <Combobox options={VACCINE_OPTIONS} value={vaccine || null} onSelect={setVaccine} placeholder="Search vaccines…" searchPlaceholder="Search vaccine…" />
      </div>
      <ChipSelector options={STATUSES} value={status} onChange={(v) => setStatus(v)} />
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Date (optional)</div>
        <DateField value={date} onChange={setDate} />
      </div>
      <TextField value={note} onChange={setNote} placeholder="Note (optional)" size="sm" />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton disabled={!vaccine.trim()} onClick={save}>Add vaccination</PrimaryButton>
      </div>
    </FormCard>
  );
}
