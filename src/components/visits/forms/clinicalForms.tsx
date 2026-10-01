// Inline clinical action forms (task / referral / follow-up / diagnosis /
// prescription) used by the visit-intake drawer. Originally extracted from the
// (now retired) consultation prototype.
import { useState } from "react";
import { MEDICATION_LIST } from "@/lib/onboardingTaxonomy";
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
import { Combobox, type ComboOption, type ComboGroup, sortByLabel } from "../Combobox";

// Searchable medication options sourced from the shared ATC list (A→Z).
const MED_OPTIONS: ComboOption[] = sortByLabel(
  MEDICATION_LIST.map((m) => ({
    value: m.name,
    label: m.atc ? `${m.name} (${m.atc})` : m.name,
    searchText: `${m.name} ${m.atc}`,
  })),
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

// A standing medication the patient is already on, for the dropdown's "Current
// medications" group. Structural subset of the rail's CurrentMed (no circular
// import); `dimensions` are resolved by the caller when recording the change.
type FormCurrentMed = { id: string; name: string; atc?: string; dose: string; frequency: string; time?: string };

export function PrescriptionForm({
  onSave,
  onCancel,
  currentMeds = [],
}: {
  // basedOnCurrentId is the current medication's id when one was picked (→ the
  // caller records a medication change), or null for a brand-new prescription.
  onSave: (m: Medication, basedOnCurrentId: string | null) => void;
  onCancel: () => void;
  currentMeds?: FormCurrentMed[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [atc, setAtc] = useState<string | undefined>(undefined);
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [time, setTime] = useState("");
  const [basedOnId, setBasedOnId] = useState<string | null>(null);

  const currentOptions: ComboOption[] = sortByLabel(
    currentMeds.map((c) => ({
      value: `current:${c.id}`,
      label: c.name,
      searchText: c.name,
      note: `${c.dose} · ${c.frequency}`, // marks it as current + shows the regimen
    })),
  );
  const groups: ComboGroup[] = [
    ...(currentOptions.length ? [{ heading: "Current medications", options: currentOptions }] : []),
    { heading: currentOptions.length ? "All medications" : "", options: MED_OPTIONS },
  ];

  const onPick = (val: string) => {
    setSelected(val);
    if (val.startsWith("current:")) {
      const cm = currentMeds.find((c) => `current:${c.id}` === val);
      if (cm) {
        setName(cm.name);
        setAtc(cm.atc);
        setDose(cm.dose);
        setFrequency(cm.frequency);
        setTime(cm.time ?? "");
        setBasedOnId(cm.id);
      }
    } else {
      // Catalog pick → new prescription; start from empty regimen fields.
      setName(val);
      setAtc(MEDICATION_LIST.find((m) => m.name === val)?.atc || undefined);
      setDose("");
      setFrequency("");
      setTime("");
      setBasedOnId(null);
    }
  };

  return (
    <FormCard onClose={onCancel}>
      <Combobox
        groups={groups}
        value={selected}
        onSelect={onPick}
        placeholder="Search medications…"
        searchPlaceholder="Search medication or ATC…"
      />
      <div className="grid grid-cols-3 gap-3">
        <TextField value={dose} onChange={setDose} placeholder="Dose (e.g. 25mg)" size="sm" />
        <TextField value={frequency} onChange={setFrequency} placeholder="Frequency" size="sm" />
        <TextField value={time} onChange={setTime} placeholder="Time of day" size="sm" />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!name.trim()}
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
