// Left rail: baseline the clinician carries into the visit so the form only has
// to capture the delta. Baseline dimension scores come from the patient's most
// recent prior visit (via the repository), not from anything typed today.
import { Pill } from "lucide-react";
import { dimensionLabel, formatScore, scoreBand, type ClinicalVisit } from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { SectionLabel } from "./visitUi";

export function VisitContextSidebar({
  patientName,
  lastVisit,
  meds,
  allergies,
}: {
  patientName: string;
  lastVisit: ClinicalVisit | null;
  meds: string[];
  allergies: string[];
}) {
  const baseline = lastVisit?.dimensionUpdates ?? [];
  return (
    <aside className="w-[280px] shrink-0 overflow-y-auto p-5 space-y-6" style={{ borderRight: "1px solid #E7DCCD" }}>
      <div>
        <SectionLabel>Patient Context</SectionLabel>
        <p className="text-[15px] font-semibold text-[#2E1F14] mt-1">{patientName}</p>
      </div>

      <section>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">
          Dimension Baseline
        </div>
        {baseline.length === 0 ? (
          <p className="text-[12px] italic text-[#9B8775]">No prior dimension scores on record.</p>
        ) : (
          <div>
            {baseline.map((d, i) => (
              <div
                key={d.dimension}
                className="flex items-center justify-between h-7"
                style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
              >
                <span className="text-[11px] text-[#9B8775] truncate">{dimensionLabel(d.dimension)}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[12px] font-semibold tabular-nums ${scoreColorClass(d.newScore)}`}>
                    {formatScore(d.newScore)}
                  </span>
                  <span className={`text-[10px] font-medium ${scoreColorClass(d.newScore)}`}>
                    {scoreBand(d.newScore)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Medications</div>
        {meds.length === 0 ? (
          <p className="text-[12px] italic text-[#9B8775]">No baseline medications recorded.</p>
        ) : (
          <div className="space-y-1">
            {meds.map((m) => (
              <div key={m} className="text-[12px] text-[#2E1F14] flex items-start gap-1.5">
                <Pill className="h-3 w-3 mt-0.5 text-[#9B8775] shrink-0" />
                <span>{m}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Allergies</div>
        {allergies.length === 0 ? (
          <p className="text-[12px] italic text-[#9B8775]">No known allergies recorded.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allergies.map((a) => (
              <div key={a} className="inline-flex items-center gap-1.5 text-[12px] text-[#1F1611]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#E8446A" }} />
                {a}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Last Visit</div>
        {lastVisit ? (
          <p className="text-[12px] text-[#6E5A48]">
            {new Date(lastVisit.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}
            {lastVisit.reasonNote || VISIT_TYPE_META[lastVisit.reason].label}
          </p>
        ) : (
          <p className="text-[12px] italic text-[#9B8775]">No previous visits.</p>
        )}
      </section>
    </aside>
  );
}
