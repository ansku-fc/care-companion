// Inline clinical action forms (task / referral / follow-up / diagnosis /
// prescription) used by the visit-intake drawer. Originally extracted from the
// (now retired) consultation prototype.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { MEDICATION_LIST } from "@/lib/onboardingTaxonomy";
import { TREATMENT_CATALOG } from "@/lib/treatmentCatalog";
import { medicationAllergyConflict } from "@/lib/drugAllergy";
import {
  FormCard,
  TextField,
  SelectField,
  DateField,
  ChipSelector,
  PrimaryButton,
  CancelLink,
} from "./primitives";
import {
  ASSIGNEES,
  TASK_TYPES,
  VISIT_TYPES,
  TIMEFRAMES,
  todayPlus,
  uid,
  type Task,
  type Referral,
  type FollowUp,
  type Diagnosis,
  type Medication,
} from "./shared";
import { Combobox, type ComboOption, sortByLabel } from "../Combobox";

// Searchable medication options sourced from the shared ATC list (A→Z).
const MED_OPTIONS: ComboOption[] = sortByLabel(
  MEDICATION_LIST.map((m) => ({
    value: m.name,
    label: m.atc ? `${m.name} (${m.atc})` : m.name,
    searchText: `${m.name} ${m.atc}`,
  })),
);

// Searchable non-medication treatment options (A→Z), from the treatment catalog.
const TREATMENT_OPTIONS: ComboOption[] = sortByLabel(
  TREATMENT_CATALOG.map((name) => ({ value: name, label: name, searchText: name })),
);

export function TaskForm({ onSave, onCancel }: { onSave: (t: Task) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>(ASSIGNEES[0]);
  const [due, setDue] = useState(todayPlus(3));
  const [type, setType] = useState<typeof TASK_TYPES[number] | "">("");

  return (
    <FormCard>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to happen..."
        className="w-full bg-transparent outline-none text-[14px] text-[#1F1611] placeholder:text-[#C9BBA9] py-1"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={assignee} onChange={setAssignee} options={ASSIGNEES} />
        <DateField value={due} onChange={setDue} />
      </div>
      <ChipSelector options={TASK_TYPES} value={type} onChange={(v) => setType(v)} />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!title.trim() || !type}
          onClick={() =>
            onSave({
              id: uid(),
              title: title.trim(),
              assignee,
              due,
              type: type as typeof TASK_TYPES[number],
            })
          }
        >
          Add task
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

export function ReferralForm({
  onSave,
  onCancel,
}: {
  onSave: (r: Referral) => void;
  onCancel: () => void;
}) {
  const [specialty, setSpecialty] = useState("");
  const [referTo, setReferTo] = useState("");
  const [assignee, setAssignee] = useState<string>(ASSIGNEES[1]);
  const [due, setDue] = useState(todayPlus(7));
  const [notes, setNotes] = useState("");

  return (
    <FormCard onClose={onCancel}>
      <TextField value={specialty} onChange={setSpecialty} placeholder="e.g. Gastroenterology" />
      <TextField
        value={referTo}
        onChange={setReferTo}
        placeholder="Specific clinic or leave blank"
        size="sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={assignee} onChange={setAssignee} options={ASSIGNEES} />
        <DateField value={due} onChange={setDue} />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reason for referral..."
        className="w-full bg-transparent outline-none text-[12px] text-[#6E5A48] placeholder:text-[#C9BBA9] py-1 resize-none"
        style={{ minHeight: 40, borderBottom: "1px solid #E7DCCD" }}
      />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!specialty.trim()}
          onClick={() =>
            onSave({
              id: uid(),
              specialty: specialty.trim(),
              referTo: referTo.trim(),
              assignee,
              due,
              notes: notes.trim(),
            })
          }
        >
          Add referral
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

export function FollowUpForm({
  onSave,
  onCancel,
}: {
  onSave: (f: FollowUp) => void;
  onCancel: () => void;
}) {
  const [visitType, setVisitType] = useState<typeof VISIT_TYPES[number] | "">("");
  const [timeframe, setTimeframe] = useState<string>(TIMEFRAMES[2]);
  const [withWho, setWithWho] = useState<string>(ASSIGNEES[0]);
  const [notes, setNotes] = useState("");

  return (
    <FormCard>
      <ChipSelector options={VISIT_TYPES} value={visitType} onChange={(v) => setVisitType(v)} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField value={timeframe} onChange={setTimeframe} options={TIMEFRAMES} />
        <SelectField value={withWho} onChange={setWithWho} options={ASSIGNEES.slice(0, 2)} />
      </div>
      <TextField
        value={notes}
        onChange={setNotes}
        placeholder="Purpose of follow-up..."
        size="sm"
      />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!visitType}
          onClick={() =>
            onSave({
              id: uid(),
              visitType: visitType as typeof VISIT_TYPES[number],
              timeframe,
              with: withWho,
              notes: notes.trim(),
            })
          }
        >
          Add follow-up
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

export function DiagnosisForm({ onSave, onCancel }: { onSave: (d: Diagnosis) => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"current" | "previous">("current");
  const [year, setYear] = useState("");
  return (
    <FormCard>
      <div className="grid grid-cols-[100px_1fr] gap-3">
        <TextField value={code} onChange={setCode} placeholder="ICD code" size="sm" />
        <TextField value={name} onChange={setName} placeholder="Diagnosis name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ChipSelector options={["current", "previous"] as const} value={status} onChange={(v) => setStatus(v)} />
        <TextField value={year} onChange={setYear} placeholder="Year (e.g. 2022)" size="sm" />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!name.trim()}
          onClick={() => onSave({ id: uid(), code: code.trim(), name: name.trim(), status, year: year.trim() })}
        >
          Add diagnosis
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

// Inline form to link a non-medication treatment (device/therapy/intervention)
// to a diagnosis: a searchable catalog dropdown + an optional free-text note.
// Mirrors PrescriptionForm's shape (Combobox + fields + confirm), minus drugs.
export function TreatmentForm({
  onSave,
  onCancel,
}: {
  onSave: (t: { name: string; note?: string }) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  return (
    <FormCard onClose={onCancel}>
      <Combobox
        options={TREATMENT_OPTIONS}
        value={selected}
        onSelect={(val) => {
          setSelected(val);
          setName(val);
        }}
        placeholder="Search treatments…"
        searchPlaceholder="Search device, therapy or intervention…"
      />
      <TextField value={note} onChange={setNote} placeholder="Note (optional) — e.g. pressure, tolerance, plan" size="sm" />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), note: note.trim() || undefined })}>
          Add treatment
        </PrimaryButton>
      </div>
    </FormCard>
  );
}

// A standing medication the patient is already on, for the dropdown's "Current
// medications" group. Structural subset of the rail's CurrentMed (no circular
// import); `dimensions` are resolved by the caller when recording the change.
type FormCurrentMed = { id: string; name: string; atc?: string; dose: string; frequency: string; time?: string };

export function PrescriptionForm({
  onSave,
  onCancel,
  currentMeds = [],
  changeTarget,
  allergies = [],
}: {
  // basedOnCurrentId is the current medication's id when one was picked (→ the
  // caller records a medication change), or null for a brand-new prescription.
  onSave: (m: Medication, basedOnCurrentId: string | null) => void;
  onCancel: () => void;
  currentMeds?: FormCurrentMed[];
  /** Change mode: the one current medication being changed. It appears ONCE
   *  (as the item being edited, fields pre-filled); the dropdown below is for
   *  substituting to a different medication, not re-picking this one. */
  changeTarget?: FormCurrentMed;
  /** Patient allergy labels (same source as the left-rail Allergies list) — used
   *  to flag conflicts in the dropdown and gate confirm behind acknowledge. */
  allergies?: string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState(changeTarget?.name ?? "");
  const [atc, setAtc] = useState<string | undefined>(changeTarget?.atc);
  const [dose, setDose] = useState(changeTarget?.dose ?? "");
  const [frequency, setFrequency] = useState(changeTarget?.frequency ?? "");
  const [time, setTime] = useState(changeTarget?.time ?? "");
  const [basedOnId, setBasedOnId] = useState<string | null>(changeTarget ? changeTarget.id : null);
  const [acknowledged, setAcknowledged] = useState(false);

  // Allergy conflict for the medication currently in the form. Hard match →
  // confirm is gated behind an explicit acknowledge (never accidental).
  const conflict = medicationAllergyConflict({ name, atc }, allergies);
  // Reset the acknowledgement whenever the medication changes.
  useEffect(() => setAcknowledged(false), [name]);

  // Add flow: offer only drugs the patient is NOT already on — adding a
  // medication they already take makes no sense. (Current meds are acted on via
  // Change / Stop, not re-added.) Conflicting options carry a ⚠ allergy tag.
  const alreadyOn = new Set(currentMeds.map((c) => c.name.toLowerCase()));
  const addOptions: ComboOption[] = MED_OPTIONS.filter((o) => !alreadyOn.has(o.value.toLowerCase())).map((o) => {
    const optAtc = MEDICATION_LIST.find((m) => m.name === o.value)?.atc;
    const c = medicationAllergyConflict({ name: o.value, atc: optAtc }, allergies);
    return c ? { ...o, note: `⚠ ${c.tag}` } : o;
  });

  const onPick = (val: string) => {
    // Add flow only (change mode has no dropdown): always a catalog → new rx.
    setSelected(val);
    setName(val);
    setAtc(MEDICATION_LIST.find((m) => m.name === val)?.atc || undefined);
    setDose("");
    setFrequency("");
    setTime("");
    setBasedOnId(null);
  };

  const fields = (
    <div className="grid grid-cols-3 gap-3">
      <TextField value={dose} onChange={setDose} placeholder="Dose (e.g. 25mg)" size="sm" />
      <TextField value={frequency} onChange={setFrequency} placeholder="Frequency" size="sm" />
      <TextField value={time} onChange={setTime} placeholder="Time of day" size="sm" />
    </div>
  );

  return (
    <FormCard onClose={onCancel}>
      {changeTarget ? (
        <>
          {/* The medication being changed — shown once; edit its dose/frequency/time
              only. Swapping drugs = Stop + Add another (explicit actions), not here. */}
          <div className="text-[12px]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B8775]">Changing</span>
            <span className="ml-1.5 font-medium text-[#1F1611]">{changeTarget.name}</span>
          </div>
          {fields}
        </>
      ) : (
        <>
          <Combobox
            options={addOptions}
            value={selected}
            onSelect={onPick}
            placeholder="Search medications…"
            searchPlaceholder="Search medication or ATC…"
          />
          {fields}
        </>
      )}

      {/* Hard allergy conflict — unmissable banner; confirm gated behind acknowledge. */}
      {conflict && (
        <div
          className="rounded-[8px] p-2 flex items-start gap-2"
          style={{ background: "#FBECDD", border: "1px solid #E7C9A8" }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#B45309" }} />
          <div className="min-w-0">
            <div className="text-[12px] font-medium" style={{ color: "#8A3D09" }}>
              Patient allergic to {conflict.allergy} — {conflict.reason}
            </div>
            <label className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6E5A48] cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              I've reviewed the allergy conflict
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!name.trim() || (!!conflict && !acknowledged)}
          onClick={() =>
            onSave(
              { id: uid(), name: name.trim(), atc, dose: dose.trim(), frequency: frequency.trim(), time: time.trim() },
              basedOnId,
            )
          }
        >
          Prescribe
        </PrimaryButton>
      </div>
    </FormCard>
  );
}
