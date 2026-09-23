// Phase 1: the visit workspace. Interval/delta capture only — baseline lives in
// the sidebar and is never re-asked here. The doctor tags dimensions ON the
// clinical inputs (diagnoses, medication changes, measurements); dimension
// SCORES are never entered — they are derived (see "Dimensions Affected" below
// and derive.ts). Reuses the shared clinical forms and patients/panels.
import { useState } from "react";
import { VISIT_TYPE_META, type VisitType } from "@/lib/episodes";
import {
  dimensionLabel,
  formatScore,
  scoreBand,
  affectedDimensions,
  scoringInputsFromVisit,
  suggestDimensionsForIcd,
  suggestDimensionsForMarker,
  type DimensionKey,
  type DiagnosisStatus,
  type MedicationChangeKind,
  type PatientBaseline,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import {
  VitalsPanel, defaultVitalsData, type VitalsData,
  SleepPanel, defaultSleepData, type SleepData,
  MentalHealthPanel, defaultMentalHealthData, type MentalHealthData,
  ActivityPanel, defaultActivityData, type ActivityData,
  NutritionPanel, defaultNutritionData, type NutritionData,
  MolesPanel, defaultMolesData, type MoleEntry,
} from "@/components/patients/panels";
import {
  SelectField, TextField, PrimaryButton, CancelLink, uid,
} from "@/components/visits/forms";
import { DimensionMultiSelect } from "./DimensionMultiSelect";
import { useVisitForm } from "./VisitFormProvider";
import { SectionCard, SectionLabel, GhostButton, Row } from "./visitUi";

const MED_CHANGE_LABELS: Record<MedicationChangeKind, string> = {
  started: "Started",
  stopped: "Stopped",
  dose_changed: "Dose changed",
  continued: "Continued",
};

const REASON_ENTRIES = Object.entries(VISIT_TYPE_META) as [VisitType, { label: string }][];

export function VisitWorkspace({ baseline }: { baseline: PatientBaseline }) {
  const f = useVisitForm();
  const draft = f.draft;

  /* ---- Structured-data panels (rich capture; local UI state in this mockup) ---- */
  const [panels, setPanels] = useState<Set<string>>(new Set());
  const [vitals, setVitals] = useState<VitalsData>({ ...defaultVitalsData });
  const [sleep, setSleep] = useState<SleepData>({ ...defaultSleepData });
  const [mental, setMental] = useState<MentalHealthData>({ ...defaultMentalHealthData });
  const [activity, setActivity] = useState<ActivityData>({ ...defaultActivityData });
  const [nutrition, setNutrition] = useState<NutritionData>({ ...defaultNutritionData });
  const [moles, setMoles] = useState<MoleEntry[]>([...defaultMolesData]);
  const togglePanel = (p: string) =>
    setPanels((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  return (
    <div className="space-y-2">
      {/* 1 — Reason for visit */}
      <SectionCard>
        <SectionLabel>Reason for Visit</SectionLabel>
        <div className="grid grid-cols-[220px_1fr] gap-3 items-start">
          <select
            value={draft.reason}
            onChange={(e) => f.set("reason", e.target.value as VisitType)}
            className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] py-1"
            style={{ borderBottom: "1px solid #E7DCCD" }}
          >
            {REASON_ENTRIES.map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <input
            value={draft.reasonNote ?? ""}
            onChange={(e) => f.set("reasonNote", e.target.value)}
            placeholder="Chief complaint / reason note…"
            className="w-full bg-transparent outline-none text-[14px] text-[#1F1611] placeholder:text-[#C9BBA9] py-1"
            style={{ borderBottom: "1px solid #E7DCCD" }}
          />
        </div>
      </SectionCard>

      {/* 2 — Interval history */}
      <SectionCard>
        <SectionLabel>Interval History — Since Last Visit</SectionLabel>
        <NewSymptoms />
        <MedicationChanges />
        <LifeEvents />
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Adherence</div>
            <input
              value={draft.intervalHistory.adherenceNote ?? ""}
              onChange={(e) => f.patchInterval({ adherenceNote: e.target.value })}
              placeholder="Adherence notes…"
              className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] placeholder:text-[#C9BBA9] py-1"
              style={{ borderBottom: "1px solid #E7DCCD" }}
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Notes</div>
            <input
              value={draft.intervalHistory.freeText ?? ""}
              onChange={(e) => f.patchInterval({ freeText: e.target.value })}
              placeholder="Free-text summary…"
              className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] placeholder:text-[#C9BBA9] py-1"
              style={{ borderBottom: "1px solid #E7DCCD" }}
            />
          </div>
        </div>
      </SectionCard>

      {/* 3 — Diagnoses */}
      <SectionCard>
        <SectionLabel>Diagnoses</SectionLabel>
        <Diagnoses />
      </SectionCard>

      {/* 4 — Structured data */}
      <SectionCard>
        <SectionLabel>Structured Data</SectionLabel>
        <p className="text-[12px] italic text-[#9B8775]">
          Rich capture panels (transient in this mockup). Persisted measurements are recorded below.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["vitals", "sleep", "mental", "activity", "nutrition", "moles"] as const).map((p) => {
            const active = panels.has(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePanel(p)}
                className="rounded-full text-[12px] font-medium px-3 py-1 capitalize"
                style={active
                  ? { background: "#2E1F14", color: "#FFFFFF", border: "1px solid #2E1F14" }
                  : { background: "#F5F0EA", color: "#9B8775", border: "1px solid #E7DCCD" }}
              >
                {p}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-4">
          {panels.has("vitals") && <PanelShell title="Vitals"><VitalsPanel value={vitals} onChange={(u) => setVitals((v) => ({ ...v, ...u }))} /></PanelShell>}
          {panels.has("sleep") && <PanelShell title="Sleep"><SleepPanel value={sleep} onChange={(u) => setSleep((v) => ({ ...v, ...u }))} /></PanelShell>}
          {panels.has("mental") && <PanelShell title="Mental Health"><MentalHealthPanel value={mental} onChange={(u) => setMental((v) => ({ ...v, ...u }))} /></PanelShell>}
          {panels.has("activity") && <PanelShell title="Activity"><ActivityPanel value={activity} onChange={(u) => setActivity((v) => ({ ...v, ...u }))} /></PanelShell>}
          {panels.has("nutrition") && <PanelShell title="Nutrition"><NutritionPanel value={nutrition} onChange={(u) => setNutrition((v) => ({ ...v, ...u }))} /></PanelShell>}
          {panels.has("moles") && <PanelShell title="Moles"><MolesPanel moles={moles} onChange={setMoles} /></PanelShell>}
        </div>
        <div className="mt-4 pt-3" style={{ borderTop: "0.5px solid #F0EBE4" }}>
          <Measurements />
        </div>
      </SectionCard>

      {/* 5 — Dimensions affected (derived, read-only) */}
      <SectionCard>
        <SectionLabel>Dimensions Affected This Visit</SectionLabel>
        <p className="text-[12px] italic text-[#9B8775]">
          Derived automatically from the tagged diagnoses, medications and measurements above. Not manually set.
        </p>
        <DimensionsAffected baseline={baseline} />
      </SectionCard>
    </div>
  );
}

/* ---------------- Interval history sub-sections ---------------- */

function NewSymptoms() {
  const f = useVisitForm();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [dims, setDims] = useState<DimensionKey[]>([]);
  const save = () => {
    if (!desc.trim()) return;
    f.addSymptom({ id: uid(), description: desc.trim(), dimensions: dims });
    setDesc(""); setDims([]); setOpen(false);
  };
  return (
    <div className="mt-1">
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">New Symptoms</div>
      {f.draft.intervalHistory.newSymptoms.map((s) => (
        <Row key={s.id} onRemove={() => f.removeSymptom(s.id)}>
          <span className="text-[13px] text-[#1F1611]">{s.description}</span>
          {s.dimensions.length > 0 && (
            <span className="text-[11px] text-[#9B8775]"> · {s.dimensions.map(dimensionLabel).join(", ")}</span>
          )}
        </Row>
      ))}
      {open ? (
        <div className="mt-2 space-y-2">
          <TextField value={desc} onChange={setDesc} placeholder="Describe the symptom…" />
          <DimensionMultiSelect value={dims} onChange={setDims} />
          <div className="flex items-center justify-end gap-3">
            <CancelLink onClick={() => setOpen(false)} />
            <PrimaryButton disabled={!desc.trim()} onClick={save}>Add symptom</PrimaryButton>
          </div>
        </div>
      ) : (
        <GhostButton onClick={() => setOpen(true)}>+ Add symptom</GhostButton>
      )}
    </div>
  );
}

function MedicationChanges() {
  const f = useVisitForm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [change, setChange] = useState<MedicationChangeKind>("started");
  const [detail, setDetail] = useState("");
  const [dims, setDims] = useState<DimensionKey[]>([]);
  const save = () => {
    if (!name.trim()) return;
    f.addMedicationChange({ id: uid(), medicationName: name.trim(), change, detail: detail.trim() || undefined, dimensions: dims });
    setName(""); setChange("started"); setDetail(""); setDims([]); setOpen(false);
  };
  return (
    <div className="mt-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Medication Changes</div>
      {f.draft.intervalHistory.medicationChanges.map((m) => (
        <Row key={m.id} onRemove={() => f.removeMedicationChange(m.id)}>
          <span className="text-[13px] text-[#1F1611] font-medium">{m.medicationName}</span>
          <span className="text-[11px] text-[#9B8775]"> · {MED_CHANGE_LABELS[m.change]}{m.detail ? ` · ${m.detail}` : ""}{m.dimensions.length ? ` · ${m.dimensions.map(dimensionLabel).join(", ")}` : ""}</span>
        </Row>
      ))}
      {open ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-[1fr_150px] gap-3">
            <TextField value={name} onChange={setName} placeholder="Medication name" />
            <SelectField
              value={change}
              onChange={(v) => setChange(v as MedicationChangeKind)}
              options={["started", "stopped", "dose_changed", "continued"]}
            />
          </div>
          <TextField value={detail} onChange={setDetail} placeholder="Detail (e.g. 10mg → 20mg)" size="sm" />
          <div>
            <div className="text-[11px] text-[#9B8775] mb-1">Related dimension(s)</div>
            <DimensionMultiSelect value={dims} onChange={setDims} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <CancelLink onClick={() => setOpen(false)} />
            <PrimaryButton disabled={!name.trim()} onClick={save}>Add change</PrimaryButton>
          </div>
        </div>
      ) : (
        <GhostButton onClick={() => setOpen(true)}>+ Add medication change</GhostButton>
      )}
    </div>
  );
}

function LifeEvents() {
  const f = useVisitForm();
  const [text, setText] = useState("");
  const events = f.draft.intervalHistory.lifeEvents;
  const add = () => {
    if (!text.trim()) return;
    f.patchInterval({ lifeEvents: [...events, text.trim()] });
    setText("");
  };
  return (
    <div className="mt-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Life Events</div>
      {events.map((e, i) => (
        <Row key={i} onRemove={() => f.patchInterval({ lifeEvents: events.filter((_, idx) => idx !== i) })}>
          <span className="text-[13px] text-[#1F1611]">{e}</span>
        </Row>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a life event and press Enter…"
          className="flex-1 bg-transparent outline-none text-[13px] text-[#1F1611] placeholder:text-[#C9BBA9] py-1"
          style={{ borderBottom: "1px solid #E7DCCD" }}
        />
        <GhostButton onClick={add}>Add</GhostButton>
      </div>
    </div>
  );
}

/* ---------------- Diagnoses (tagged input; auto-suggests dimension from ICD) ---------------- */

function Diagnoses() {
  const f = useVisitForm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icd10, setIcd10] = useState("");
  const [status, setStatus] = useState<DiagnosisStatus>("active");
  const [dims, setDims] = useState<DimensionKey[]>([]);
  const save = () => {
    if (!name.trim()) return;
    f.addDiagnosis({ id: uid(), name: name.trim(), icd10: icd10.trim(), status, dimensions: dims });
    setName(""); setIcd10(""); setStatus("active"); setDims([]); setOpen(false);
  };
  // Auto-suggest dimensions from the ICD code (doctor can adjust).
  const onIcdChange = (v: string) => {
    setIcd10(v);
    const suggested = suggestDimensionsForIcd(v);
    if (suggested.length) setDims(suggested);
  };
  return (
    <div>
      {f.draft.diagnoses.map((d) => (
        <Row key={d.id} onRemove={() => f.removeDiagnosis(d.id)}>
          <span className="text-[13px] text-[#1F1611] font-medium">{d.name}</span>
          {d.icd10 && <span className="ml-1.5 text-[10px] font-mono text-[#9B8775]">{d.icd10}</span>}
          <span className="text-[11px] text-[#9B8775]"> · {d.status}{d.dimensions.length ? ` · ${d.dimensions.map(dimensionLabel).join(", ")}` : ""}</span>
        </Row>
      ))}
      {open ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <TextField value={icd10} onChange={onIcdChange} placeholder="ICD-10 (e.g. I10)" size="sm" />
            <TextField value={name} onChange={setName} placeholder="Diagnosis name" />
          </div>
          <div className="grid grid-cols-[150px_1fr] gap-3 items-center">
            <SelectField value={status} onChange={(v) => setStatus(v as DiagnosisStatus)} options={["active", "resolved"]} />
            <div>
              <div className="text-[11px] text-[#9B8775] mb-1">Related dimension(s)</div>
              <DimensionMultiSelect value={dims} onChange={setDims} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <CancelLink onClick={() => setOpen(false)} />
            <PrimaryButton disabled={!name.trim()} onClick={save}>Add diagnosis</PrimaryButton>
          </div>
        </div>
      ) : (
        <GhostButton onClick={() => setOpen(true)}>+ Add diagnosis</GhostButton>
      )}
    </div>
  );
}

/* ---------------- Measurements (tagged input; auto-suggests dimension from marker) ---------------- */

function Measurements() {
  const f = useVisitForm();
  const [open, setOpen] = useState(false);
  const [marker, setMarker] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [kind, setKind] = useState<"vital" | "lab">("vital");
  const [source, setSource] = useState<"measured_today" | "reviewed">("measured_today");
  const [dims, setDims] = useState<DimensionKey[]>([]);
  const save = () => {
    if (!marker.trim()) return;
    f.addMeasurement({ id: uid(), kind, marker: marker.trim(), value, unit: unit.trim(), source, dimensions: dims });
    setMarker(""); setValue(""); setUnit(""); setKind("vital"); setSource("measured_today"); setDims([]); setOpen(false);
  };
  // Auto-suggest dimension from the marker (doctor can adjust).
  const onMarkerChange = (v: string) => {
    setMarker(v);
    const suggested = suggestDimensionsForMarker(v);
    if (suggested.length) setDims(suggested);
  };
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Recorded Measurements</div>
      {f.draft.measurements.map((m) => (
        <Row key={m.id} onRemove={() => f.removeMeasurement(m.id)}>
          <span className="text-[13px] text-[#1F1611] font-medium">{m.marker}</span>
          <span className="text-[13px] text-[#1F1611]"> {String(m.value)} {m.unit}</span>
          <span className="text-[11px] text-[#9B8775]"> · {m.kind} · {m.source === "measured_today" ? "measured" : "reviewed"}{m.dimensions.length ? ` · ${m.dimensions.map(dimensionLabel).join(", ")}` : ""}</span>
        </Row>
      ))}
      {open ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-[1fr_100px_100px] gap-3">
            <TextField value={marker} onChange={onMarkerChange} placeholder="Marker (e.g. Systolic BP)" />
            <TextField value={value} onChange={setValue} placeholder="Value" size="sm" />
            <TextField value={unit} onChange={setUnit} placeholder="Unit" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField value={kind} onChange={(v) => setKind(v as "vital" | "lab")} options={["vital", "lab"]} />
            <SelectField value={source} onChange={(v) => setSource(v as "measured_today" | "reviewed")} options={["measured_today", "reviewed"]} />
          </div>
          <div>
            <div className="text-[11px] text-[#9B8775] mb-1">Related dimension(s)</div>
            <DimensionMultiSelect value={dims} onChange={setDims} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <CancelLink onClick={() => setOpen(false)} />
            <PrimaryButton disabled={!marker.trim()} onClick={save}>Add measurement</PrimaryButton>
          </div>
        </div>
      ) : (
        <GhostButton onClick={() => setOpen(true)}>+ Add measurement</GhostButton>
      )}
    </div>
  );
}

/* ---------------- Dimensions affected (derived, read-only) ---------------- */

function DimensionsAffected({ baseline }: { baseline: PatientBaseline }) {
  const f = useVisitForm();
  const affected = affectedDimensions(baseline, scoringInputsFromVisit(f.draft));
  if (affected.length === 0) {
    return <p className="text-[12px] italic text-[#9B8775] mt-1">No dimensions affected yet — tag diagnoses, medications or measurements above.</p>;
  }
  return (
    <div className="mt-2 space-y-2">
      {affected.map((a) => (
        <div key={a.dimension} className="rounded-[8px] p-3" style={{ border: "1px solid #E7DCCD" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-[#2E1F14]">{dimensionLabel(a.dimension)}</span>
            <span className="flex items-center gap-1.5 text-[12px]">
              <span className={`tabular-nums ${scoreColorClass(a.from)}`}>{formatScore(a.from)}</span>
              <span className="text-[#9B8775]">→</span>
              <span className={`font-semibold tabular-nums ${scoreColorClass(a.to)}`}>{formatScore(a.to)}</span>
              <span className={`font-medium ${scoreColorClass(a.to)}`}>{scoreBand(a.to)}</span>
              {a.delta !== 0 && (
                <span style={{ color: a.delta > 0 ? "#E8446A" : "#0EA5A0" }}>{a.delta > 0 ? "↑" : "↓"}</span>
              )}
            </span>
          </div>
          <div className="text-[11px] text-[#6E5A48] mt-1">
            driven by:{" "}
            {a.drivers.map((d, i) => (
              <span key={i}>
                {i > 0 && ", "}
                <span style={{ color: d.direction === "up" ? "#E8446A" : "#0EA5A0" }}>{d.label}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Small shared bits ---------------- */

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-4" style={{ border: "1px solid #E7DCCD", background: "rgba(250,245,238,0.6)" }}>
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#9B8775]">{title}</div>
      {children}
    </div>
  );
}
