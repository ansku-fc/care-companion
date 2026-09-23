// Inline clinical action forms (task / referral / follow-up / diagnosis /
// prescription) shared by the consultation and visit-intake surfaces.
// Extracted verbatim from ConsultationWorkspacePage — no behaviour change.
import { useState } from "react";
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
    <FormCard>
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

export function PrescriptionForm({ onSave, onCancel }: { onSave: (m: Medication) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [time, setTime] = useState("");
  return (
    <FormCard>
      <TextField value={name} onChange={setName} placeholder="Medication name" />
      <div className="grid grid-cols-3 gap-3">
        <TextField value={dose} onChange={setDose} placeholder="Dose (e.g. 25mg)" size="sm" />
        <TextField value={frequency} onChange={setFrequency} placeholder="Frequency" size="sm" />
        <TextField value={time} onChange={setTime} placeholder="Time of day" size="sm" />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onCancel} />
        <PrimaryButton
          disabled={!name.trim()}
          onClick={() => onSave({ id: uid(), name: name.trim(), dose: dose.trim(), frequency: frequency.trim(), time: time.trim() })}
        >
          Prescribe
        </PrimaryButton>
      </div>
    </FormCard>
  );
}
