// Persistent right-hand actions rail — the care-coordination plan arising from
// this visit. Groups, in order: Referrals · Lab Orders · Vaccinations ·
// Follow-up · Statements & Certifications (stub). Each group owns its own
// open-state; "+ New" toggles an inline FormCard under the header, committed
// items list below; up to all groups can be open at once. Prescriptions /
// medication changes are NOT here — they are clinical-record documentation and
// live in the center column (VisitWorkspace). Column has its own scroll + footer.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { useVisitForm } from "./VisitFormProvider";
import { SectionLabel, Row } from "./visitUi";
import { ReferralForm } from "@/components/visits/forms";
import { referralFromForm } from "./planAdapters";
import { FollowUpEntryForm } from "./FollowUpEntryForm";
import { VaccinationEntryForm } from "./VaccinationEntryForm";
import { LabOrderEntryForm } from "./LabOrderEntryForm";

type GroupKey = "referrals" | "laborders" | "vaccination" | "followup";

export function VisitActionsRail() {
  const f = useVisitForm();
  const plan = f.draft.plan;
  const vaccinations = plan.vaccinations ?? [];
  const labOrders = plan.labOrders ?? [];

  const footer = [
    `${plan.referrals.length} referral${plan.referrals.length === 1 ? "" : "s"}`,
    labOrders.length ? `${labOrders.length} lab order${labOrders.length === 1 ? "" : "s"}` : null,
    vaccinations.length ? `${vaccinations.length} vaccination${vaccinations.length === 1 ? "" : "s"}` : null,
    plan.followUp ? "1 follow-up" : null,
  ].filter(Boolean).join(" · ");

  // Per-group "new form" open-state (up to all open at once).
  const [open, setOpen] = useState<Set<GroupKey>>(new Set());
  const toggle = (key: GroupKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const close = (key: GroupKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  return (
    <aside className="w-[360px] shrink-0 flex flex-col" style={{ borderLeft: "1px solid #E7DCCD" }}>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {/* Equal-height intro band — matches the left rail so first headers align. */}
        <div className="min-h-[44px]">
          <SectionLabel>Actions</SectionLabel>
          <p className="text-[12px] text-[#9B8775] mt-1">Care coordination from this visit</p>
        </div>

        {/* Groups separated by the same hairline the left rail uses. */}
        <div className="divide-y divide-[#F0EBE4] border-t border-b border-[#F0EBE4]">
        {/* Referrals */}
        <PlanGroup
          label="Referrals"
          count={plan.referrals.length}
          open={open.has("referrals")}
          onToggle={() => toggle("referrals")}
          form={
            <ReferralForm
              onSave={(r) => { f.addReferral(referralFromForm(r)); close("referrals"); }}
              onCancel={() => close("referrals")}
            />
          }
        >
          {plan.referrals.map((r) => (
            <Row key={r.id} onRemove={() => f.removeReferral(r.id)}>
              <div className="text-[12px] font-medium text-[#2E1F14]">
                {r.specialty}{r.referTo && <span className="text-[#9B8775] font-normal"> · {r.referTo}</span>}
              </div>
              <div className="text-[11px] text-[#9B8775]">{r.assignee}</div>
            </Row>
          ))}
        </PlanGroup>

        {/* Lab Orders — order any test from the full catalog (multi-select). */}
        <PlanGroup
          label="Lab Orders"
          count={labOrders.length}
          open={open.has("laborders")}
          onToggle={() => toggle("laborders")}
          form={<LabOrderEntryForm onClose={() => close("laborders")} />}
        >
          {labOrders.map((o) => (
            <Row key={o.id} onRemove={() => f.removeLabOrder(o.id)}>
              <div className="text-[12px] text-[#2E1F14]">{o.markers.map((m) => m.label).join(", ")}</div>
              <div className="text-[11px] text-[#9B8775]">
                {o.markers.length} marker{o.markers.length === 1 ? "" : "s"}
                {o.fasting && <span className="text-[#B45309]"> · Fasting</span>}
                {o.note ? ` · ${o.note}` : ""}
              </div>
            </Row>
          ))}
        </PlanGroup>

        {/* Vaccinations */}
        <PlanGroup
          label="Vaccinations"
          count={vaccinations.length}
          open={open.has("vaccination")}
          onToggle={() => toggle("vaccination")}
          form={<VaccinationEntryForm onClose={() => close("vaccination")} />}
        >
          {vaccinations.map((v) => (
            <Row key={v.id} onRemove={() => f.removeVaccination(v.id)}>
              <span className="text-[11px] font-medium text-[#0EA5A0]">{v.status === "given" ? "Given" : "Ordered"}</span>
              <span className="text-[12px] text-[#2E1F14]"> · {v.vaccine}</span>
              {(v.date || v.note) && <span className="text-[11px] text-[#9B8775]"> {[v.date, v.note].filter(Boolean).join(" · ")}</span>}
            </Row>
          ))}
        </PlanGroup>

        {/* Follow-up */}
        <PlanGroup
          label="Follow-up"
          count={plan.followUp ? 1 : 0}
          open={open.has("followup")}
          onToggle={() => toggle("followup")}
          addLabel={plan.followUp ? "Edit" : "New"}
          form={<FollowUpEntryForm onClose={() => close("followup")} />}
        >
          {plan.followUp && (
            <Row onRemove={() => f.patchPlan({ followUp: null })}>
              <div className="text-[12px] font-medium text-[#2E1F14]">{VISIT_TYPE_META[plan.followUp.visitType].label}</div>
              <div className="text-[11px] text-[#9B8775]">in {plan.followUp.timeframe} · {plan.followUp.with}</div>
            </Row>
          )}
        </PlanGroup>

        {/* Statements & Certifications — stub; reserves the slot, no functionality yet. */}
        <PlanGroup label="Statements & Certifications" count={0} disabled disabledHint="Coming soon">
          <p className="text-[11px] italic text-[#C9BBA9] pt-1">Sick notes and certificates arrive in a later update.</p>
        </PlanGroup>
        </div>
      </div>

      <div className="shrink-0 px-5 py-3 bg-white" style={{ borderTop: "1px solid #E7DCCD" }}>
        <div className="text-[12px] text-[#9B8775]">{footer}</div>
      </div>
    </aside>
  );
}

/** Scrolls itself into view within the rail when it mounts (on form open). */
function InlineFormSlot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  return <div ref={ref}>{children}</div>;
}

function GroupHeader({
  label,
  count,
  open = false,
  onToggle,
  addLabel = "New",
  disabled = false,
  disabledHint,
}: {
  label: string;
  count: number;
  open?: boolean;
  onToggle?: () => void;
  addLabel?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <SectionLabel>
        {label}
        {count > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#6E5A48]">
            {count}
          </span>
        )}
      </SectionLabel>
      {disabled ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C9BBA9] shrink-0" title={disabledHint}>
          <Plus className="h-3 w-3" /> {disabledHint ?? "New"}
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function PlanGroup({
  label,
  count,
  open = false,
  onToggle,
  addLabel = "New",
  form,
  disabled = false,
  disabledHint,
  children,
}: {
  label: string;
  count: number;
  open?: boolean;
  onToggle?: () => void;
  addLabel?: string;
  form?: ReactNode;
  disabled?: boolean;
  disabledHint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 py-3">
      <GroupHeader
        label={label}
        count={count}
        open={open}
        onToggle={onToggle}
        addLabel={addLabel}
        disabled={disabled}
        disabledHint={disabledHint}
      />
      {open && form && <InlineFormSlot>{form}</InlineFormSlot>}
      {children}
    </section>
  );
}
