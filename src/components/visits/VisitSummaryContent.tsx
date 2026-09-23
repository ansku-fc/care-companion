// Read-only summary of a past visit, rendered inside the visit drawer (opened
// from the sidebar's Visit History). All comparative values (measurement trends,
// dimension movement) are derived from the visit chain via derive.ts — nothing
// is stored.
import { VISIT_TYPE_META } from "@/lib/episodes";
import {
  dimensionLabel,
  formatScore,
  scoreBand,
  affectedDimensions,
  scoringInputsFromVisit,
  measurementTrend,
  sortByDateDesc,
  type ClinicalVisit,
  type PatientBaseline,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] italic text-muted-foreground">{children}</span>;
}
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}
function NoteText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}

export function VisitSummaryContent({
  visit,
  allVisits,
  baseline,
}: {
  visit: ClinicalVisit;
  allVisits: ClinicalVisit[];
  baseline: PatientBaseline;
}) {
  const priorChain = sortByDateDesc(allVisits.filter((v) => v.date < visit.date));
  const prior = priorChain[0] ?? null;
  const affected = affectedDimensions(baseline, scoringInputsFromVisit(visit));

  return (
    <div className="space-y-5 text-sm">
      {visit.reasonNote && <p className="text-[13px] text-foreground">{visit.reasonNote}</p>}

      <Block label="Medication Changes">
        {visit.medicationChanges.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <div className="space-y-1 text-[13px]">
            {visit.medicationChanges.map((m) => (
              <div key={m.id}>
                <span className="font-medium">{m.medicationName}</span>
                <span className="text-muted-foreground"> · {m.change.replace("_", " ")}{m.detail ? ` · ${m.detail}` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </Block>

      {(visit.notes.subjective || visit.notes.objective || visit.notes.assessment || visit.notes.general) && (
        <Block label="Clinical Notes">
          <div className="space-y-3">
            {visit.notes.subjective && <NoteText label="Reported Symptoms">{visit.notes.subjective}</NoteText>}
            {visit.notes.objective && <NoteText label="Clinical Observations">{visit.notes.objective}</NoteText>}
            {visit.notes.assessment && <NoteText label="Assessment">{visit.notes.assessment}</NoteText>}
            {visit.notes.general && <NoteText label="General Notes">{visit.notes.general}</NoteText>}
          </div>
        </Block>
      )}

      <Block label="Measurements">
        {visit.measurements.length === 0 ? (
          <Empty>None recorded.</Empty>
        ) : (
          <div>
            {visit.measurements.map((m, i) => {
              const trend = measurementTrend(m, prior);
              return (
                <div key={m.id} className="flex items-center gap-3 h-7" style={{ borderTop: i === 0 ? "none" : "0.5px solid hsl(var(--border))" }}>
                  <span className="flex-1 text-[13px] text-muted-foreground truncate">{m.marker}</span>
                  <span className="text-[13px] font-semibold tabular-nums">{String(m.value)} <span className="text-[12px] font-normal text-muted-foreground">{m.unit}</span></span>
                  <span className="w-[90px] text-right text-[12px]" style={{ color: trend ? (trend.trend === "up" ? "#E8446A" : trend.trend === "down" ? "#0EA5A0" : "#9B8775") : "#C9BBA9" }}>
                    {trend ? `${trend.trend === "up" ? "↑" : trend.trend === "down" ? "↓" : "→"} ${trend.delta! > 0 ? "+" : ""}${trend.delta}` : "no prior"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Block>

      <Block label="Dimensions Affected">
        {affected.length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <div>
            {affected.map((a, i) => (
              <div key={a.dimension} className="py-2" style={{ borderTop: i === 0 ? "none" : "0.5px solid hsl(var(--border))" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium">{dimensionLabel(a.dimension)}</span>
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <span className={`tabular-nums ${scoreColorClass(a.from)}`}>{formatScore(a.from)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`font-semibold tabular-nums ${scoreColorClass(a.to)}`}>{formatScore(a.to)}</span>
                    <span className={`font-medium ${scoreColorClass(a.to)}`}>{scoreBand(a.to)}</span>
                    {a.delta !== 0 && <span style={{ color: a.delta > 0 ? "#E8446A" : "#0EA5A0" }}>{a.delta > 0 ? "↑" : "↓"}</span>}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
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
      </Block>

      <Block label="Plan">
        <div className="space-y-1.5 text-[13px]">
          <div><span className="text-muted-foreground">Tasks: </span>{visit.plan.tasks.length ? visit.plan.tasks.map((t) => t.title).join("; ") : <Empty>None</Empty>}</div>
          <div><span className="text-muted-foreground">Referrals: </span>{visit.plan.referrals.length ? visit.plan.referrals.map((r) => r.specialty).join("; ") : <Empty>None</Empty>}</div>
          <div><span className="text-muted-foreground">Prescriptions: </span>{visit.plan.prescriptions.length ? visit.plan.prescriptions.map((p) => p.medicationName).join("; ") : <Empty>None</Empty>}</div>
          <div><span className="text-muted-foreground">Follow-up: </span>{visit.plan.followUp ? `${VISIT_TYPE_META[visit.plan.followUp.visitType].label} in ${visit.plan.followUp.timeframe}` : <Empty>None</Empty>}</div>
        </div>
      </Block>
    </div>
  );
}
