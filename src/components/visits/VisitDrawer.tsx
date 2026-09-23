// The single right-hand drawer for the visit intake flow. Its content swaps
// based on `request.kind` — one drawer, many contexts. All editing forms mutate
// the same visit draft via useVisitForm; closing returns to the overview with
// the change reflected. Reuses the extracted form primitives and clinical forms.
import { useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VISIT_TYPE_META, type VisitType } from "@/lib/episodes";
import { ICD10_ILLNESSES, MEDICATION_LIST } from "@/lib/onboardingTaxonomy";
import { LAB_MARKERS } from "@/lib/labMarkerCatalog";
import {
  dimensionLabel,
  suggestDimensionsForIcd,
  suggestDimensionsForMarker,
  suggestDimensionsForMedication,
  type ClinicalVisit,
  type DimensionKey,
  type DiagnosisStatus,
  type MedicationChangeKind,
  type PatientBaseline,
  type PlanFollowUp,
  type VisitMeasurement,
} from "@/lib/visits";
import {
  TaskForm, ReferralForm, PrescriptionForm,
  SelectField, TextField, PrimaryButton, CancelLink, ChipSelector, uid,
} from "@/components/visits/forms";
import { taskFromForm, referralFromForm, prescriptionFromForm } from "./planAdapters";
import { DimensionMultiSelect } from "./DimensionMultiSelect";
import { Combobox, type ComboOption } from "./Combobox";
import { useVisitForm } from "./VisitFormProvider";
import { AutoTextarea } from "./visitUi";
import { VisitSummaryContent } from "./VisitSummaryContent";

export type DrawerRequest =
  | { kind: "reason" }
  | { kind: "notes"; focus?: "subjective" | "objective" | "assessment" | "general" }
  | { kind: "medication" }
  | { kind: "diagnosis" }
  | { kind: "measurement" }
  | { kind: "task" }
  | { kind: "referral" }
  | { kind: "prescription" }
  | { kind: "followup" }
  | { kind: "visit-summary"; visit: ClinicalVisit };

const TITLES: Record<DrawerRequest["kind"], string> = {
  reason: "Reason for visit",
  notes: "Clinical notes",
  medication: "Add medication change",
  diagnosis: "Add diagnosis",
  measurement: "Add measurements",
  task: "Add task",
  referral: "Initiate referral",
  prescription: "Prescribe",
  followup: "Schedule follow-up",
  "visit-summary": "Visit summary",
};

/* Option lists sourced from existing codebase data. */
const ICD_OPTIONS: ComboOption[] = ICD10_ILLNESSES.map((e) => ({
  value: e.code,
  label: `${e.code} — ${e.name}`,
  searchText: `${e.code} ${e.name}`,
}));
const MED_OPTIONS: ComboOption[] = MEDICATION_LIST.map((m) => ({
  value: m.name,
  label: m.atc ? `${m.name} (${m.atc})` : m.name,
  searchText: `${m.name} ${m.atc}`,
}));
const LAB_OPTIONS: ComboOption[] = LAB_MARKERS.filter((m) => m.type === "number").map((m) => ({
  value: m.field,
  label: m.unit ? `${m.label} (${m.unit})` : m.label,
  searchText: m.label,
}));

export function VisitDrawer({
  request,
  onClose,
  baseline,
  allVisits,
  patientName,
}: {
  request: DrawerRequest | null;
  onClose: () => void;
  baseline: PatientBaseline;
  allVisits: ClinicalVisit[];
  patientName: string;
}) {
  const title =
    request?.kind === "visit-summary"
      ? `${VISIT_TYPE_META[request.visit.reason].label} · ${patientName} · ${new Date(request.visit.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
      : request
        ? TITLES[request.kind]
        : "";

  return (
    <Sheet open={request !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[440px] sm:max-w-[460px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b text-left">
          <SheetTitle className="text-base pr-6">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {request && <DrawerBody request={request} onClose={onClose} baseline={baseline} allVisits={allVisits} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  request,
  onClose,
  baseline,
  allVisits,
}: {
  request: DrawerRequest;
  onClose: () => void;
  baseline: PatientBaseline;
  allVisits: ClinicalVisit[];
}) {
  const f = useVisitForm();
  switch (request.kind) {
    case "reason":
      return <ReasonForm onClose={onClose} />;
    case "notes":
      return <NotesForm onClose={onClose} />;
    case "medication":
      return <MedicationChangeForm onClose={onClose} />;
    case "diagnosis":
      return <DiagnosisForm onClose={onClose} />;
    case "measurement":
      return <MeasurementForm onClose={onClose} />;
    case "task":
      return <TaskForm onSave={(t) => { f.addTask(taskFromForm(t)); onClose(); }} onCancel={onClose} />;
    case "referral":
      return <ReferralForm onSave={(r) => { f.addReferral(referralFromForm(r)); onClose(); }} onCancel={onClose} />;
    case "prescription":
      return <PrescriptionForm onSave={(m) => { f.addPrescription(prescriptionFromForm(m)); onClose(); }} onCancel={onClose} />;
    case "followup":
      return <FollowUpForm onClose={onClose} />;
    case "visit-summary":
      return <VisitSummaryContent visit={request.visit} allVisits={allVisits} baseline={baseline} />;
  }
}

/* ---------------- Live-edit forms (patch the draft directly, close on Done) ---------------- */

function DoneBar({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-end pt-2">
      <PrimaryButton onClick={onClose}>Done</PrimaryButton>
    </div>
  );
}

function ReasonForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const d = f.draft;
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Visit type</div>
        <select
          value={d.reason}
          onChange={(e) => f.set("reason", e.target.value as VisitType)}
          className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] py-1"
          style={{ borderBottom: "1px solid #E7DCCD" }}
        >
          {(Object.entries(VISIT_TYPE_META) as [VisitType, { label: string }][]).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Chief complaint / reason note</div>
        <AutoTextarea placeholder="Reason for the visit…" value={d.reasonNote ?? ""} onChange={(v) => f.set("reasonNote", v)} minHeight={60} />
      </div>
      <DoneBar onClose={onClose} />
    </div>
  );
}

function NoteField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">{label}</div>
      <AutoTextarea placeholder={placeholder} value={value ?? ""} onChange={onChange} minHeight={70} />
    </div>
  );
}

function NotesForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const n = f.draft.notes;
  return (
    <div className="space-y-4">
      <NoteField label="Reported Symptoms" placeholder="What the patient reports — symptoms, concerns, changes and events since last visit…" value={n.subjective} onChange={(v) => f.patchNotes({ subjective: v })} />
      <NoteField label="Clinical Observations" placeholder="Physical findings, examination notes, clinical observations…" value={n.objective} onChange={(v) => f.patchNotes({ objective: v })} />
      <NoteField label="Assessment" placeholder="Overall clinical assessment and summary…" value={n.assessment} onChange={(v) => f.patchNotes({ assessment: v })} />
      <NoteField label="General Notes" placeholder="Any additional notes…" value={n.general} onChange={(v) => f.patchNotes({ general: v })} />
      <DoneBar onClose={onClose} />
    </div>
  );
}

/* ---------------- Add forms (save to draft, close on save) ---------------- */

function MedicationChangeForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const [name, setName] = useState("");
  const [atc, setAtc] = useState<string | undefined>(undefined);
  const [change, setChange] = useState<MedicationChangeKind>("started");
  const [detail, setDetail] = useState("");
  const [dims, setDims] = useState<DimensionKey[]>([]);
  const onPickMed = (value: string) => {
    setName(value);
    setAtc(MEDICATION_LIST.find((m) => m.name === value)?.atc || undefined);
    const s = suggestDimensionsForMedication(value);
    if (s.length) setDims(s);
  };
  const save = () => {
    if (!name.trim()) return;
    f.addMedicationChange({ id: uid(), medicationName: name.trim(), atc, change, detail: detail.trim() || undefined, dimensions: dims });
    onClose();
  };
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Medication</div>
        <Combobox options={MED_OPTIONS} value={name || null} onSelect={onPickMed} placeholder="Search medications…" searchPlaceholder="Search medication or ATC…" />
      </div>
      <SelectField value={change} onChange={(v) => setChange(v as MedicationChangeKind)} options={["started", "stopped", "dose_changed", "continued"]} />
      <TextField value={detail} onChange={setDetail} placeholder="Detail (e.g. 10mg → 20mg)" size="sm" />
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Related dimension(s)</div>
        <DimensionMultiSelect value={dims} onChange={setDims} />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton disabled={!name.trim()} onClick={save}>Add change</PrimaryButton>
      </div>
    </div>
  );
}

function DiagnosisForm({ onClose }: { onClose: () => void }) {
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
    <div className="space-y-3">
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
    </div>
  );
}

/* Common vitals mirror what onboarding captures (BP, HR, weight, height, waist)
 * plus temperature. Dimensions here are auto-assigned (well-known); extra lab
 * markers below carry an adjustable dimension tag. */
const COMMON_VITALS: { marker: string; unit: string; dims: DimensionKey[] }[] = [
  { marker: "Systolic BP", unit: "mmHg", dims: ["cardiovascular"] },
  { marker: "Diastolic BP", unit: "mmHg", dims: ["cardiovascular"] },
  { marker: "Heart rate", unit: "bpm", dims: ["cardiovascular"] },
  { marker: "Weight", unit: "kg", dims: ["metabolic"] },
  { marker: "Height", unit: "cm", dims: ["metabolic"] },
  { marker: "Waist circumference", unit: "cm", dims: ["metabolic"] },
  { marker: "Temperature", unit: "°C", dims: ["respiratory_immune"] },
];

type LabRow = { id: string; marker: string; unit: string; value: string; dims: DimensionKey[] };

function MeasurementForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [labs, setLabs] = useState<LabRow[]>([]);

  const addLab = (field: string) => {
    const m = LAB_MARKERS.find((x) => x.field === field);
    if (!m) return;
    setLabs((prev) => [
      ...prev,
      { id: uid(), marker: m.label, unit: m.unit ?? "", value: "", dims: suggestDimensionsForMarker(m.label) },
    ]);
  };
  const updateLab = (id: string, patch: Partial<LabRow>) =>
    setLabs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeLab = (id: string) => setLabs((prev) => prev.filter((r) => r.id !== id));

  const save = () => {
    const out: VisitMeasurement[] = [];
    for (const v of COMMON_VITALS) {
      const raw = (vitals[v.marker] ?? "").trim();
      if (!raw) continue;
      out.push({ id: uid(), kind: "vital", marker: v.marker, value: raw, unit: v.unit, source: "measured_today", dimensions: v.dims });
    }
    for (const r of labs) {
      if (!r.value.trim()) continue;
      out.push({ id: uid(), kind: "lab", marker: r.marker, value: r.value.trim(), unit: r.unit, source: "reviewed", dimensions: r.dims });
    }
    out.forEach((m) => f.addMeasurement(m));
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-2">Common Vitals</div>
        <div className="space-y-2">
          {COMMON_VITALS.map((v) => (
            <div key={v.marker} className="flex items-center gap-2">
              <label className="flex-1 text-[13px] text-[#6E5A48]">{v.marker}</label>
              <input
                value={vitals[v.marker] ?? ""}
                onChange={(e) => setVitals((prev) => ({ ...prev, [v.marker]: e.target.value }))}
                className="w-20 text-right bg-transparent outline-none text-[13px] text-[#1F1611] py-0.5"
                style={{ borderBottom: "1px solid #E7DCCD" }}
              />
              <span className="w-12 text-[11px] text-[#9B8775]">{v.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Other Lab Markers</div>
        {labs.map((r) => (
          <div key={r.id} className="mb-2 rounded-[8px] p-2" style={{ border: "1px solid #E7DCCD" }}>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[13px] text-[#1F1611]">{r.marker}</span>
              <input
                value={r.value}
                onChange={(e) => updateLab(r.id, { value: e.target.value })}
                placeholder="value"
                className="w-20 text-right bg-transparent outline-none text-[13px] text-[#1F1611] py-0.5"
                style={{ borderBottom: "1px solid #E7DCCD" }}
              />
              <span className="w-12 text-[11px] text-[#9B8775]">{r.unit}</span>
              <button type="button" onClick={() => removeLab(r.id)} aria-label="Remove">
                <X className="h-3.5 w-3.5 text-[#C9BBA9]" />
              </button>
            </div>
            <div className="mt-1.5">
              <DimensionMultiSelect value={r.dims} onChange={(d) => updateLab(r.id, { dims: d })} />
            </div>
          </div>
        ))}
        <Combobox
          options={LAB_OPTIONS}
          value={null}
          onSelect={addLab}
          placeholder="+ Add a lab marker…"
          searchPlaceholder="Search lab markers…"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton onClick={save}>Add measurements</PrimaryButton>
      </div>
    </div>
  );
}

function FollowUpForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const existing = f.draft.plan.followUp;
  const [visitType, setVisitType] = useState<VisitType>(existing?.visitType ?? "FOLLOWUP_CONSULTATION");
  const [timeframe, setTimeframe] = useState(existing?.timeframe ?? "3 months");
  const [withWho, setWithWho] = useState(existing?.with ?? "Dr. Laine");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const TIMEFRAMES = ["2 weeks", "1 month", "3 months", "6 months"] as const;
  const save = () => {
    const fu: PlanFollowUp = { id: existing?.id ?? uid(), visitType, timeframe, with: withWho, notes: notes.trim() };
    f.patchPlan({ followUp: fu });
    onClose();
  };
  return (
    <div className="space-y-3">
      <select
        value={visitType}
        onChange={(e) => setVisitType(e.target.value as VisitType)}
        className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] py-1"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      >
        {(Object.entries(VISIT_TYPE_META) as [VisitType, { label: string }][]).map(([key, meta]) => (
          <option key={key} value={key}>{meta.label}</option>
        ))}
      </select>
      <ChipSelector options={TIMEFRAMES} value={timeframe} onChange={(v) => setTimeframe(v)} />
      <TextField value={withWho} onChange={setWithWho} placeholder="With…" size="sm" />
      <TextField value={notes} onChange={setNotes} placeholder="Purpose of follow-up…" size="sm" />
      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton onClick={save}>{existing ? "Update follow-up" : "Add follow-up"}</PrimaryButton>
      </div>
    </div>
  );
}
