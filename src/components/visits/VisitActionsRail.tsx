// Persistent right-hand actions rail for the workspace phase — restores the old
// consultation prototype's rail (Dimensions Tagged / Tasks / Referrals /
// Prescriptions / Follow-up), but bound to the real visit draft (VisitPlan) and
// the canonical dimension tagging. Reuses the extracted form primitives.
import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { VISIT_TYPE_META, type VisitType } from "@/lib/episodes";
import {
  dimensionLabel,
  formatScore,
  scoreBand,
  affectedDimensions,
  scoringInputsFromVisit,
  type PlanFollowUp,
  type PatientBaseline,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import {
  TaskForm, ReferralForm, PrescriptionForm,
  TextField, ChipSelector, PrimaryButton, CancelLink, uid,
} from "@/components/visits/forms";
import { taskFromForm, referralFromForm, prescriptionFromForm } from "./planAdapters";
import { useVisitForm } from "./VisitFormProvider";
import { SectionLabel, GhostButton, Row } from "./visitUi";

type OpenForm = null | "task" | "referral" | "prescription" | "followup";
const REASON_ENTRIES = Object.entries(VISIT_TYPE_META) as [VisitType, { label: string }][];

export function VisitActionsRail({ baseline }: { baseline: PatientBaseline }) {
  const f = useVisitForm();
  const draft = f.draft;
  const plan = draft.plan;
  const [open, setOpen] = useState<OpenForm>(null);

  // Derived, read-only: which dimensions this visit's inputs affected + drivers.
  const affected = affectedDimensions(baseline, scoringInputsFromVisit(draft));
  const counts = `${plan.tasks.length} task${plan.tasks.length === 1 ? "" : "s"} · ${plan.referrals.length} referral${plan.referrals.length === 1 ? "" : "s"}${plan.followUp ? " · 1 follow-up" : ""}`;

  return (
    <aside className="w-[320px] shrink-0 flex flex-col" style={{ borderLeft: "1px solid #E7DCCD" }}>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        <div>
          <SectionLabel>Actions</SectionLabel>
          <p className="text-[12px] text-[#9B8775] mt-1">Tasks and actions from this visit</p>
        </div>

        {/* Dimensions Affected — derived, read-only aggregation of tagged inputs */}
        <section className="space-y-2">
          <SectionLabel>Dimensions Affected</SectionLabel>
          {affected.length === 0 ? (
            <div
              className="rounded-[8px] flex flex-col items-center justify-center text-center py-6 px-4"
              style={{ border: "1px dashed #E7DCCD", background: "#FFFFFF" }}
            >
              <ClipboardList className="h-7 w-7 mb-2" style={{ color: "#E7DCCD" }} />
              <p className="text-[12px] text-[#9B8775]">Tag diagnoses, meds or measurements to see affected dimensions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {affected.map((a) => (
                <div key={a.dimension} className="rounded-[8px] p-3 bg-white" style={{ border: "1px solid #E7DCCD" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-medium text-[#2E1F14] truncate">{dimensionLabel(a.dimension)}</span>
                    <span className="flex items-center gap-1 shrink-0 text-[11px]">
                      <span className={`tabular-nums ${scoreColorClass(a.from)}`}>{formatScore(a.from)}</span>
                      <span className="text-[#9B8775]">→</span>
                      <span className={`font-semibold tabular-nums ${scoreColorClass(a.to)}`}>{formatScore(a.to)}</span>
                      <span className={`font-medium ${scoreColorClass(a.to)}`}>{scoreBand(a.to)}</span>
                      {a.delta !== 0 && <span style={{ color: a.delta > 0 ? "#E8446A" : "#0EA5A0" }}>{a.delta > 0 ? "↑" : "↓"}</span>}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6E5A48] mt-1">
                    {a.drivers.map((d, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        <span style={{ color: d.direction === "up" ? "#E8446A" : "#0EA5A0" }}>{d.label}</span>
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tasks to Create */}
        <section className="space-y-2">
          <SectionLabel>Tasks to Create</SectionLabel>
          {plan.tasks.map((t) => (
            <Row key={t.id} onRemove={() => f.removeTask(t.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{t.title}</div>
              <div className="text-[11px] text-[#9B8775]">{t.assignee} · {t.category} · {t.priority}</div>
            </Row>
          ))}
          {open === "task" ? (
            <TaskForm onSave={(t) => { f.addTask(taskFromForm(t)); setOpen(null); }} onCancel={() => setOpen(null)} />
          ) : (
            <GhostButton className="w-full" onClick={() => setOpen("task")}>+ Add task manually</GhostButton>
          )}
        </section>

        {/* Referrals to Create */}
        <section className="space-y-2">
          <SectionLabel>Referrals to Create</SectionLabel>
          {plan.referrals.map((r) => (
            <Row key={r.id} onRemove={() => f.removeReferral(r.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">
                {r.specialty}{r.referTo && <span className="text-[#9B8775] font-normal"> · {r.referTo}</span>}
              </div>
              <div className="text-[11px] text-[#9B8775]">{r.assignee}</div>
            </Row>
          ))}
          {open === "referral" ? (
            <ReferralForm onSave={(r) => { f.addReferral(referralFromForm(r)); setOpen(null); }} onCancel={() => setOpen(null)} />
          ) : (
            <GhostButton className="w-full" onClick={() => setOpen("referral")}>+ Initiate referral</GhostButton>
          )}
        </section>

        {/* Prescriptions */}
        <section className="space-y-2">
          <SectionLabel>Prescriptions</SectionLabel>
          {plan.prescriptions.map((p) => (
            <Row key={p.id} onRemove={() => f.removePrescription(p.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{p.medicationName}</div>
              <div className="text-[11px] text-[#9B8775]">{[p.dose, p.frequency, p.time].filter(Boolean).join(" · ")}</div>
            </Row>
          ))}
          {open === "prescription" ? (
            <PrescriptionForm onSave={(m) => { f.addPrescription(prescriptionFromForm(m)); setOpen(null); }} onCancel={() => setOpen(null)} />
          ) : (
            <GhostButton className="w-full" onClick={() => setOpen("prescription")}>+ Prescribe</GhostButton>
          )}
        </section>

        {/* Follow-up */}
        <section className="space-y-2">
          <SectionLabel>Follow-up</SectionLabel>
          {plan.followUp && (
            <Row onRemove={() => f.patchPlan({ followUp: null })}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{VISIT_TYPE_META[plan.followUp.visitType].label}</div>
              <div className="text-[11px] text-[#9B8775]">in {plan.followUp.timeframe} · {plan.followUp.with}</div>
            </Row>
          )}
          {open === "followup" ? (
            <FollowUpPlanForm onSave={(fu) => { f.patchPlan({ followUp: fu }); setOpen(null); }} onCancel={() => setOpen(null)} />
          ) : (
            !plan.followUp && <GhostButton className="w-full" onClick={() => setOpen("followup")}>+ Schedule follow-up</GhostButton>
          )}
        </section>
      </div>

      {/* Sticky footer summary */}
      <div className="shrink-0 px-5 py-3 bg-white" style={{ borderTop: "1px solid #E7DCCD" }}>
        <div className="text-[12px] text-[#9B8775]">
          {affected.length} dimension{affected.length === 1 ? "" : "s"} affected · {counts}
        </div>
      </div>
    </aside>
  );
}

function FollowUpPlanForm({
  onSave,
  onCancel,
}: {
  onSave: (f: PlanFollowUp) => void;
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
      <ChipSelector options={TIMEFRAMES} value={timeframe} onChange={(v) => setTimeframe(v)} />
      <TextField value={withWho} onChange={setWithWho} placeholder="With…" size="sm" />
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
