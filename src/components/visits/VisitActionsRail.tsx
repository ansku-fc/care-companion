// Persistent right-hand actions rail — the at-a-glance action summary for the
// workspace phase. Tasks / referrals / prescriptions / follow-up as compact
// lists with counts; "+ Add" opens the single drawer (data entry never happens
// inline here). Bound to the visit draft's plan via useVisitForm.
import { Plus } from "lucide-react";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { useVisitForm } from "./VisitFormProvider";
import { SectionLabel, Row } from "./visitUi";
import type { DrawerRequest } from "./VisitDrawer";

export function VisitActionsRail({ onOpen }: { onOpen: (request: DrawerRequest) => void }) {
  const f = useVisitForm();
  const plan = f.draft.plan;
  const counts = `${plan.tasks.length} task${plan.tasks.length === 1 ? "" : "s"} · ${plan.referrals.length} referral${plan.referrals.length === 1 ? "" : "s"}${plan.followUp ? " · 1 follow-up" : ""}`;

  return (
    <aside className="w-[320px] shrink-0 flex flex-col" style={{ borderLeft: "1px solid #E7DCCD" }}>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        <div>
          <SectionLabel>Actions</SectionLabel>
          <p className="text-[12px] text-[#9B8775] mt-1">Tasks and actions from this visit</p>
        </div>

        <PlanGroup label="Tasks to Create" count={plan.tasks.length} onAdd={() => onOpen({ kind: "task" })}>
          {plan.tasks.map((t) => (
            <Row key={t.id} onRemove={() => f.removeTask(t.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{t.title}</div>
              <div className="text-[11px] text-[#9B8775]">{t.assignee} · {t.category} · {t.priority}</div>
            </Row>
          ))}
        </PlanGroup>

        <PlanGroup label="Referrals to Create" count={plan.referrals.length} onAdd={() => onOpen({ kind: "referral" })}>
          {plan.referrals.map((r) => (
            <Row key={r.id} onRemove={() => f.removeReferral(r.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">
                {r.specialty}{r.referTo && <span className="text-[#9B8775] font-normal"> · {r.referTo}</span>}
              </div>
              <div className="text-[11px] text-[#9B8775]">{r.assignee}</div>
            </Row>
          ))}
        </PlanGroup>

        <PlanGroup label="Prescriptions" count={plan.prescriptions.length} onAdd={() => onOpen({ kind: "prescription" })}>
          {plan.prescriptions.map((p) => (
            <Row key={p.id} onRemove={() => f.removePrescription(p.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{p.medicationName}</div>
              <div className="text-[11px] text-[#9B8775]">{[p.dose, p.frequency, p.time].filter(Boolean).join(" · ")}</div>
            </Row>
          ))}
        </PlanGroup>

        <PlanGroup
          label="Follow-up"
          count={plan.followUp ? 1 : 0}
          onAdd={() => onOpen({ kind: "followup" })}
          addLabel={plan.followUp ? "Edit" : "Add"}
        >
          {plan.followUp && (
            <Row onRemove={() => f.patchPlan({ followUp: null })}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{VISIT_TYPE_META[plan.followUp.visitType].label}</div>
              <div className="text-[11px] text-[#9B8775]">in {plan.followUp.timeframe} · {plan.followUp.with}</div>
            </Row>
          )}
        </PlanGroup>
      </div>

      <div className="shrink-0 px-5 py-3 bg-white" style={{ borderTop: "1px solid #E7DCCD" }}>
        <div className="text-[12px] text-[#9B8775]">{counts}</div>
      </div>
    </aside>
  );
}

function PlanGroup({
  label,
  count,
  onAdd,
  addLabel = "Add",
  children,
}: {
  label: string;
  count: number;
  onAdd: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between">
        <SectionLabel>
          {label}
          {count > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#6E5A48]">
              {count}
            </span>
          )}
        </SectionLabel>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      </div>
      {children}
    </section>
  );
}
