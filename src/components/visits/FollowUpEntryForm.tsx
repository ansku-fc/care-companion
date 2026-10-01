// Inline follow-up entry — relocated verbatim from the retired VisitDrawer.
// Expand-in-place within the right rail. Reads any existing follow-up so the
// single follow-up can be edited in place; writes via patchPlan.
import { useState } from "react";
import { VISIT_TYPE_META, type VisitType } from "@/lib/episodes";
import { type PlanFollowUp } from "@/lib/visits";
import { FormCard, TextField, PrimaryButton, CancelLink, ChipSelector, uid } from "@/components/visits/forms";
import { useVisitForm } from "./VisitFormProvider";

export function FollowUpEntryForm({ onClose }: { onClose: () => void }) {
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
    <FormCard onClose={onClose}>
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
    </FormCard>
  );
}
