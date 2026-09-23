// Phase 2: read-only review before save. Everything shown that is comparative
// (measurement trends, dimension band diffs) is computed here via derive.ts —
// none of it is stored on the visit.
import { ArrowLeft } from "lucide-react";
import { VISIT_TYPE_META } from "@/lib/episodes";
import {
  dimensionLabel,
  formatScore,
  scoreBand,
  affectedDimensions,
  scoringInputsFromVisit,
  measurementTrend,
  type ClinicalVisit,
  type PatientBaseline,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775] mb-2">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[8px]" style={{ border: "1px solid #E7DCCD", padding: "16px" }}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] italic text-[#9B8775]">{children}</span>;
}
function NoteBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775] mb-1">{label}</div>
      <p className="text-[13px] text-[#1F1611] leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}

export function VisitReviewScreen({
  draft,
  priorVisits,
  baseline,
  patientName,
  saving,
  onBack,
  onSave,
}: {
  draft: ClinicalVisit;
  priorVisits: ClinicalVisit[];
  baseline: PatientBaseline;
  patientName: string;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}) {
  const prior = priorVisits[0] ?? null;
  const affected = affectedDimensions(baseline, scoringInputsFromVisit(draft));
  const summary = [
    `${affected.length} dimension${affected.length === 1 ? "" : "s"} affected`,
    `${draft.plan.tasks.length} task${draft.plan.tasks.length === 1 ? "" : "s"}`,
    `${draft.plan.referrals.length} referral${draft.plan.referrals.length === 1 ? "" : "s"}`,
    draft.plan.followUp ? "1 follow-up" : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#FDF6EE" }}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-6 pt-8 pb-32">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[14px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to visit
          </button>
          <h1 className="text-[28px] leading-tight text-[#2E1F14] font-semibold">Review &amp; Save</h1>
          <p className="text-[14px] text-[#9B8775] mt-1">
            {patientName} · {VISIT_TYPE_META[draft.reason].label} ·{" "}
            {new Date(draft.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          <div className="mt-8 space-y-6">
            {/* Reason + medication changes */}
            <section>
              <Label>Visit</Label>
              <Card>
                {draft.reasonNote && <p className="text-[13px] text-[#1F1611] mb-3">{draft.reasonNote}</p>}
                <div className="text-[13px] text-[#1F1611]">
                  <span className="text-[#9B8775]">Medication changes: </span>
                  {draft.medicationChanges.length
                    ? draft.medicationChanges.map((m) => `${m.medicationName} (${m.change.replace("_", " ")})`).join("; ")
                    : <Empty>None</Empty>}
                </div>
              </Card>
            </section>

            {/* Clinical notes (SOAP free text) */}
            {(draft.notes.subjective || draft.notes.objective || draft.notes.assessment || draft.notes.general) && (
              <section>
                <Label>Clinical Notes</Label>
                <Card>
                  <div className="space-y-3">
                    {draft.notes.subjective && <NoteBlock label="Reported Symptoms">{draft.notes.subjective}</NoteBlock>}
                    {draft.notes.objective && <NoteBlock label="Clinical Observations">{draft.notes.objective}</NoteBlock>}
                    {draft.notes.assessment && <NoteBlock label="Assessment">{draft.notes.assessment}</NoteBlock>}
                    {draft.notes.general && <NoteBlock label="General Notes">{draft.notes.general}</NoteBlock>}
                  </div>
                </Card>
              </section>
            )}

            {/* Measurements with trend */}
            <section>
              <Label>Measurements</Label>
              <Card>
                {draft.measurements.length === 0 ? (
                  <Empty>No measurements recorded.</Empty>
                ) : (
                  <div>
                    {draft.measurements.map((m, i) => {
                      const trend = measurementTrend(m, prior);
                      return (
                        <div key={m.id} className="flex items-center gap-3 h-8" style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}>
                          <span className="flex-1 text-[14px] text-[#6E5A48] truncate">{m.marker}</span>
                          <span className="text-[14px] font-semibold text-[#1F1611] tabular-nums">{String(m.value)} <span className="text-[12px] font-normal text-[#9B8775]">{m.unit}</span></span>
                          <span className="w-[120px] text-right text-[12px]" style={{ color: trend ? (trend.trend === "up" ? "#E8446A" : trend.trend === "down" ? "#0EA5A0" : "#9B8775") : "#C9BBA9" }}>
                            {trend ? `${trend.trend === "up" ? "↑" : trend.trend === "down" ? "↓" : "→"} ${trend.delta! > 0 ? "+" : ""}${trend.delta}` : "no prior"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </section>

            {/* Dimensions affected — derived from tagged inputs */}
            <section>
              <Label>Dimensions Affected</Label>
              <Card>
                {affected.length === 0 ? (
                  <Empty>No dimensions affected.</Empty>
                ) : (
                  <div>
                    {affected.map((a, i) => (
                      <div key={a.dimension} className="py-2.5" style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-[#1F1611]">{dimensionLabel(a.dimension)}</span>
                          <span className="flex items-center gap-1.5 text-[12px]">
                            <span className={`tabular-nums ${scoreColorClass(a.from)}`}>{formatScore(a.from)}</span>
                            <span className="text-[#9B8775]">→</span>
                            <span className={`font-semibold tabular-nums ${scoreColorClass(a.to)}`}>{formatScore(a.to)}</span>
                            <span className={`font-medium ${scoreColorClass(a.to)}`}>{scoreBand(a.to)}</span>
                            {a.delta !== 0 && <span style={{ color: a.delta > 0 ? "#E8446A" : "#0EA5A0" }}>{a.delta > 0 ? "↑" : "↓"}</span>}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6E5A48] mt-0.5">
                          driven by:{" "}
                          {a.drivers.map((d, di) => (
                            <span key={di}>
                              {di > 0 && ", "}
                              <span style={{ color: d.direction === "up" ? "#E8446A" : "#0EA5A0" }}>{d.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>

            {/* Plan */}
            <section>
              <Label>Plan</Label>
              <Card>
                <div className="space-y-2 text-[13px] text-[#1F1611]">
                  <div><span className="text-[#9B8775]">Tasks: </span>{draft.plan.tasks.length ? draft.plan.tasks.map((t) => t.title).join("; ") : <Empty>None</Empty>}</div>
                  <div><span className="text-[#9B8775]">Referrals: </span>{draft.plan.referrals.length ? draft.plan.referrals.map((r) => r.specialty).join("; ") : <Empty>None</Empty>}</div>
                  <div><span className="text-[#9B8775]">Prescriptions: </span>{draft.plan.prescriptions.length ? draft.plan.prescriptions.map((p) => p.medicationName).join("; ") : <Empty>None</Empty>}</div>
                  <div><span className="text-[#9B8775]">Follow-up: </span>{draft.plan.followUp ? `${VISIT_TYPE_META[draft.plan.followUp.visitType].label} in ${draft.plan.followUp.timeframe}` : <Empty>None scheduled</Empty>}</div>
                </div>
              </Card>
            </section>
          </div>
        </div>
      </div>

      <div className="shrink-0 bg-white px-6 py-4" style={{ borderTop: "1px solid #E7DCCD" }}>
        <div className="max-w-[680px] mx-auto flex items-center justify-between gap-4">
          <button onClick={onBack} disabled={saving} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-[13px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors" style={{ border: "1px solid #E7DCCD" }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex flex-col items-end gap-1">
            <button onClick={onSave} disabled={saving} className="h-9 px-5 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: "#2E1F14" }}>
              {saving ? "Saving…" : "Save & Close"}
            </button>
            <span className="text-[11px] text-[#9B8775] text-right max-w-[360px]">{summary}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
