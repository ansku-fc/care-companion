// Left rail: baseline the clinician carries into the visit so the form only has
// to capture the delta. The Dimension Baseline shows ALL 9 canonical dimensions
// with their CURRENT derived score (patient baseline + this visit's tagged
// inputs so far) — nothing is manually scored or stored. Sections are collapsible
// accordions; "Visit History" opens a read-only summary.
import { useState } from "react";
import { Pill, Stethoscope, ChevronRight } from "lucide-react";
import {
  DIMENSION_KEYS,
  dimensionLabel,
  formatScore,
  scoreBand,
  fromLabel,
  computeDimensionScores,
  scoringInputsFromVisit,
  type ClinicalVisit,
  type PatientBaseline,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SectionLabel } from "./visitUi";
import { useVisitForm } from "./VisitFormProvider";

/** Raw baseline diagnosis. `dimension` is the legacy label as stored on the
 *  patient record; the canonical key + colour are derived at render. */
export type BaselineDiagnosis = { name: string; icd10: string; dimension: string | null };

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#6E5A48]">
      {n}
    </span>
  );
}

function TriggerLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <span className="flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775]">
      {children}
      {typeof count === "number" && <CountBadge n={count} />}
    </span>
  );
}

export function VisitContextSidebar({
  patientName,
  baseline,
  visits,
  meds,
  allergies,
  diagnoses,
  onOpenVisit,
}: {
  patientName: string;
  baseline: PatientBaseline;
  visits: ClinicalVisit[];
  meds: string[];
  allergies: string[];
  diagnoses: BaselineDiagnosis[];
  onOpenVisit: (visit: ClinicalVisit) => void;
}) {
  const { draft } = useVisitForm();
  const [showAllVisits, setShowAllVisits] = useState(false);
  // Live derived scores: patient baseline + this visit's tagged inputs so far.
  const scores = computeDimensionScores(baseline, scoringInputsFromVisit(draft));
  const visibleVisits = showAllVisits ? visits : visits.slice(0, 4);

  return (
    <aside className="w-[280px] shrink-0 overflow-y-auto p-5 space-y-5" style={{ borderRight: "1px solid #E7DCCD" }}>
      <div>
        <SectionLabel>Patient Context</SectionLabel>
        <p className="text-[15px] font-semibold text-[#2E1F14] mt-1">{patientName}</p>
      </div>

      <Accordion type="multiple" defaultValue={["baseline", "diagnoses"]} className="border-t border-[#F0EBE4]">
        {/* Dimension Baseline — all 9, live derived score */}
        <AccordionItem value="baseline" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-2.5 hover:no-underline">
            <TriggerLabel>Dimension Baseline</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div>
              {DIMENSION_KEYS.map((key, i) => {
                const score = scores[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between h-7"
                    style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                  >
                    <span className="text-[11px] text-[#9B8775] truncate">{dimensionLabel(key)}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[12px] font-semibold tabular-nums ${scoreColorClass(score)}`}>
                        {formatScore(score)}
                      </span>
                      <span className={`text-[10px] font-medium ${scoreColorClass(score)}`}>
                        {scoreBand(score)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Current Diagnoses */}
        <AccordionItem value="diagnoses" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-2.5 hover:no-underline">
            <TriggerLabel count={diagnoses.length}>Current Diagnoses</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            {diagnoses.length === 0 ? (
              <p className="text-[12px] italic text-[#9B8775]">No current diagnoses recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {diagnoses.map((d) => {
                  const key = d.dimension ? fromLabel(d.dimension) : null;
                  const score = key ? scores[key] : null;
                  return (
                    <div key={`${d.name}-${d.icd10}`} className="flex items-start gap-1.5">
                      <Stethoscope className="h-3 w-3 mt-0.5 text-[#9B8775] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[12px] text-[#2E1F14]">
                          {d.name}
                          <span className="ml-1.5 text-[10px] font-mono text-[#9B8775]">{d.icd10}</span>
                        </div>
                        {key && (
                          <span className={`text-[10px] font-medium ${scoreColorClass(score)}`}>
                            {dimensionLabel(key)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Medications */}
        <AccordionItem value="meds" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-2.5 hover:no-underline">
            <TriggerLabel count={meds.length}>Medications</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
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
          </AccordionContent>
        </AccordionItem>

        {/* Allergies */}
        <AccordionItem value="allergies" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-2.5 hover:no-underline">
            <TriggerLabel count={allergies.length}>Allergies</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Visit History — clickable, opens a read-only summary */}
      <section>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">
          Visit History
          <CountBadge n={visits.length} />
        </div>
        {visits.length === 0 ? (
          <p className="text-[12px] italic text-[#9B8775]">No previous visits.</p>
        ) : (
          <div className="space-y-0.5">
            {visibleVisits.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onOpenVisit(v)}
                className="w-full text-left flex items-center gap-1.5 rounded-md px-1.5 py-1.5 -mx-1.5 hover:bg-[#F0EBE4] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[#2E1F14]">
                    {new Date(v.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="text-[11px] text-[#9B8775] truncate">
                    {v.reasonNote || VISIT_TYPE_META[v.reason].label}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#C9BBA9] shrink-0" />
              </button>
            ))}
            {visits.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllVisits((v) => !v)}
                className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14] transition-colors mt-1 px-1.5"
              >
                {showAllVisits ? "Show less" : `See all ${visits.length}`}
              </button>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
