// Phase 1: the visit workspace. Interval/delta capture only — baseline lives in
// the sidebar and is never re-asked here. Reuses the shared clinical forms and
// the patients/panels structured-data panels; all dimension references are
// canonical DimensionKeys.
import { useState } from "react";
import { X } from "lucide-react";
import { VISIT_TYPE_META, type VisitType } from "@/lib/episodes";
import {
  DIMENSION_KEYS,
  dimensionLabel,
  formatScore,
  scoreBand,
  dimensionDiff,
  type ClinicalVisit,
  type DimensionKey,
  type MedicationChangeKind,
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
  TaskForm, ReferralForm, PrescriptionForm,
  SelectField, TextField, PrimaryButton, CancelLink, ChipSelector, uid,
} from "@/components/visits/forms";
import { taskFromForm, referralFromForm, prescriptionFromForm } from "./planAdapters";
import { DimensionMultiSelect } from "./DimensionMultiSelect";
import { useVisitForm } from "./VisitFormProvider";
import { SectionCard, SectionLabel, AutoTextarea, GhostButton, FlagToggle } from "./visitUi";

const MED_CHANGE_LABELS: Record<MedicationChangeKind, string> = {
  started: "Started",
  stopped: "Stopped",
  dose_changed: "Dose changed",
  continued: "Continued",
};

const REASON_ENTRIES = Object.entries(VISIT_TYPE_META) as [VisitType, { label: string }][];

export function VisitWorkspace({ priorVisits }: { priorVisits: ClinicalVisit[] }) {
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

      {/* 3 — Structured data */}
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

      {/* 4 — Dimension tagging */}
      <SectionCard>
        <SectionLabel>Dimensions Updated This Visit</SectionLabel>
        <DimensionTagging priorVisits={priorVisits} />
      </SectionCard>

      {/* 5 — Plan */}
      <SectionCard>
        <SectionLabel>Plan & Actions</SectionLabel>
        <VisitPlanSection />
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
  const save = () => {
    if (!name.trim()) return;
    f.addMedicationChange({ id: uid(), medicationName: name.trim(), change, detail: detail.trim() || undefined });
    setName(""); setChange("started"); setDetail(""); setOpen(false);
  };
  return (
    <div className="mt-3">
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Medication Changes</div>
      {f.draft.intervalHistory.medicationChanges.map((m) => (
        <Row key={m.id} onRemove={() => f.removeMedicationChange(m.id)}>
          <span className="text-[13px] text-[#1F1611] font-medium">{m.medicationName}</span>
          <span className="text-[11px] text-[#9B8775]"> · {MED_CHANGE_LABELS[m.change]}{m.detail ? ` · ${m.detail}` : ""}</span>
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

/* ---------------- Measurements (canonical, persisted) ---------------- */

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
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1">Recorded Measurements</div>
      {f.draft.measurements.map((m) => (
        <Row key={m.id} onRemove={() => f.removeMeasurement(m.id)}>
          <span className="text-[13px] text-[#1F1611] font-medium">{m.marker}</span>
          <span className="text-[13px] text-[#1F1611]"> {String(m.value)} {m.unit}</span>
          <span className="text-[11px] text-[#9B8775]"> · {m.kind} · {m.source === "measured_today" ? "measured" : "reviewed"}</span>
        </Row>
      ))}
      {open ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-[1fr_100px_100px] gap-3">
            <TextField value={marker} onChange={setMarker} placeholder="Marker (e.g. Systolic BP)" />
            <TextField value={value} onChange={setValue} placeholder="Value" size="sm" />
            <TextField value={unit} onChange={setUnit} placeholder="Unit" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField value={kind} onChange={(v) => setKind(v as "vital" | "lab")} options={["vital", "lab"]} />
            <SelectField value={source} onChange={(v) => setSource(v as "measured_today" | "reviewed")} options={["measured_today", "reviewed"]} />
          </div>
          <DimensionMultiSelect value={dims} onChange={setDims} />
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

/* ---------------- Dimension tagging (free 1–10, band derived) ---------------- */

function DimensionTagging({ priorVisits }: { priorVisits: ClinicalVisit[] }) {
  const f = useVisitForm();
  const updates = f.draft.dimensionUpdates;
  const used = new Set(updates.map((u) => u.dimension));
  const available = DIMENSION_KEYS.filter((k) => !used.has(k));
  const [toAdd, setToAdd] = useState<DimensionKey | "">("");

  const addDimension = () => {
    if (!toAdd) return;
    f.upsertDimensionUpdate({ dimension: toAdd, newScore: null, finding: "", flaggedForReview: false });
    setToAdd("");
  };

  return (
    <div className="space-y-3">
      {updates.length === 0 && (
        <p className="text-[12px] italic text-[#9B8775]">No dimensions updated yet — add the ones this visit touched.</p>
      )}
      {updates.map((u) => {
        const diff = dimensionDiff(u, priorVisits);
        return (
          <div key={u.dimension} className="rounded-[8px] p-3" style={{ border: "1px solid #E7DCCD" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#2E1F14]">{dimensionLabel(u.dimension)}</span>
              <button type="button" onClick={() => f.removeDimensionUpdate(u.dimension)} aria-label="Remove">
                <X className="h-3.5 w-3.5 text-[#C9BBA9]" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#9B8775]">Score</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={u.newScore ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = raw === "" ? null : Math.max(1, Math.min(10, parseFloat(raw)));
                    f.upsertDimensionUpdate({ ...u, newScore: Number.isNaN(n as number) ? null : n });
                  }}
                  className="w-16 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
                  style={{ borderBottom: "1px solid #E7DCCD" }}
                />
              </div>
              <span className={`text-[11px] font-medium ${scoreColorClass(u.newScore)}`}>{scoreBand(u.newScore)}</span>
              {diff.fromScore != null && diff.changed && (
                <span className="text-[11px]" style={{ color: "#D97706" }}>
                  {diff.direction === "up" ? "↑" : "↓"} {diff.fromBand} → {diff.toBand} (was {formatScore(diff.fromScore)})
                </span>
              )}
            </div>
            <div className="mt-2">
              <AutoTextarea
                placeholder="Finding / clinical interpretation…"
                value={u.finding}
                onChange={(v) => f.upsertDimensionUpdate({ ...u, finding: v })}
                minHeight={44}
              />
            </div>
            <div className="mt-1">
              <FlagToggle on={u.flaggedForReview} onChange={(on) => f.upsertDimensionUpdate({ ...u, flaggedForReview: on })} />
            </div>
          </div>
        );
      })}
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-[240px]">
            <SelectField
              value={toAdd}
              onChange={(v) => setToAdd(v as DimensionKey)}
              options={available}
              placeholder="Add a dimension…"
            />
          </div>
          <GhostButton onClick={addDimension}>Add</GhostButton>
        </div>
      )}
    </div>
  );
}

/* ---------------- Plan ---------------- */

type OpenForm = null | "task" | "referral" | "prescription" | "followup";

function VisitPlanSection() {
  const f = useVisitForm();
  const plan = f.draft.plan;
  const [open, setOpen] = useState<OpenForm>(null);

  return (
    <div className="space-y-4">
      {/* Tasks */}
      <PlanGroup label="Tasks">
        {plan.tasks.map((t) => (
          <Row key={t.id} onRemove={() => f.removeTask(t.id)}>
            <span className="text-[13px] text-[#1F1611] font-medium">{t.title}</span>
            <span className="text-[11px] text-[#9B8775]"> · {t.assignee} · {t.category} · {t.priority}</span>
          </Row>
        ))}
        {open === "task" ? (
          <TaskForm onSave={(t) => { f.addTask(taskFromForm(t)); setOpen(null); }} onCancel={() => setOpen(null)} />
        ) : (
          <GhostButton onClick={() => setOpen("task")}>+ Add task</GhostButton>
        )}
      </PlanGroup>

      {/* Referrals */}
      <PlanGroup label="Referrals">
        {plan.referrals.map((r) => (
          <Row key={r.id} onRemove={() => f.removeReferral(r.id)}>
            <span className="text-[13px] text-[#1F1611] font-medium">{r.specialty}</span>
            {r.referTo && <span className="text-[11px] text-[#9B8775]"> · {r.referTo}</span>}
            <span className="text-[11px] text-[#9B8775]"> · {r.assignee}</span>
          </Row>
        ))}
        {open === "referral" ? (
          <ReferralForm onSave={(r) => { f.addReferral(referralFromForm(r)); setOpen(null); }} onCancel={() => setOpen(null)} />
        ) : (
          <GhostButton onClick={() => setOpen("referral")}>+ Initiate referral</GhostButton>
        )}
      </PlanGroup>

      {/* Prescriptions */}
      <PlanGroup label="Prescriptions">
        {plan.prescriptions.map((p) => (
          <Row key={p.id} onRemove={() => f.removePrescription(p.id)}>
            <span className="text-[13px] text-[#1F1611] font-medium">{p.medicationName}</span>
            <span className="text-[11px] text-[#9B8775]"> · {[p.dose, p.frequency, p.time].filter(Boolean).join(" · ")}</span>
          </Row>
        ))}
        {open === "prescription" ? (
          <PrescriptionForm onSave={(m) => { f.addPrescription(prescriptionFromForm(m)); setOpen(null); }} onCancel={() => setOpen(null)} />
        ) : (
          <GhostButton onClick={() => setOpen("prescription")}>+ Prescribe</GhostButton>
        )}
      </PlanGroup>

      {/* Follow-up (canonical VisitType) */}
      <PlanGroup label="Follow-up">
        {plan.followUp && (
          <Row onRemove={() => f.patchPlan({ followUp: null })}>
            <span className="text-[13px] text-[#1F1611] font-medium">{VISIT_TYPE_META[plan.followUp.visitType].label}</span>
            <span className="text-[11px] text-[#9B8775]"> · in {plan.followUp.timeframe} · {plan.followUp.with}</span>
          </Row>
        )}
        {open === "followup" ? (
          <FollowUpPlanForm
            onSave={(fu) => { f.patchPlan({ followUp: fu }); setOpen(null); }}
            onCancel={() => setOpen(null)}
          />
        ) : (
          !plan.followUp && <GhostButton onClick={() => setOpen("followup")}>+ Schedule follow-up</GhostButton>
        )}
      </PlanGroup>
    </div>
  );
}

function FollowUpPlanForm({
  onSave,
  onCancel,
}: {
  onSave: (f: import("@/lib/visits").PlanFollowUp) => void;
  onCancel: () => void;
}) {
  const [visitType, setVisitType] = useState<VisitType>("FOLLOWUP_CONSULTATION");
  const [timeframe, setTimeframe] = useState("3 months");
  const [withWho, setWithWho] = useState("Dr. Laine");
  const [notes, setNotes] = useState("");
  const TIMEFRAMES = ["2 weeks", "1 month", "3 months", "6 months"] as const;
  return (
    <div className="rounded-[8px] p-3 space-y-3" style={{ border: "1px solid #E7DCCD" }}>
      <select
        value={visitType}
        onChange={(e) => setVisitType(e.target.value as VisitType)}
        className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] py-1"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      >
        {REASON_ENTRIES.map(([key, meta]) => (
          <option key={key} value={key}>{meta.label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <ChipSelector options={TIMEFRAMES} value={timeframe} onChange={(v) => setTimeframe(v)} />
        <TextField value={withWho} onChange={setWithWho} placeholder="With…" size="sm" />
      </div>
      <TextField value={notes} onChange={setNotes} placeholder="Purpose of follow-up…" size="sm" />
      <div className="flex items-center justify-end gap-3">
        <CancelLink onClick={onCancel} />
        <PrimaryButton onClick={() => onSave({ id: uid(), visitType, timeframe, with: withWho, notes: notes.trim() })}>
          Add follow-up
        </PrimaryButton>
      </div>
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

function PlanGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-1.5">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="group relative py-1.5 pr-6" style={{ borderTop: "0.5px solid #F0EBE4" }}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" style={{ color: "#C9BBA9" }} />
      </button>
    </div>
  );
}
