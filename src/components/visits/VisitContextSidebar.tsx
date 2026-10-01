// Left rail — now a compact INDEX of triggers only (no inline charts/summaries).
// Patient-context accordions (Dimension Baseline, Diagnoses, Medications,
// Allergies), a searchable Labs marker list, and a Visit History list — all
// collapsible accordions, collapsed by default. Clicking a lab marker opens its
// chart in the Detail panel; clicking a past visit opens its summary there. The
// richer detail lives in the fourth column (VisitDetailPanel), not here.
import { useMemo, useState } from "react";
import { Pill, Stethoscope, ChevronRight, AlertTriangle } from "lucide-react";
import {
  DIMENSION_KEYS,
  dimensionLabel,
  formatScore,
  scoreBand,
  fromLabel,
  computeDimensionScores,
  scoringDiagnoses,
  type ClinicalVisit,
  type PatientBaseline,
  type DimensionKey,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { SectionLabel } from "./visitUi";
import { useVisitForm } from "./VisitFormProvider";
import { sortByLabel } from "./Combobox";
import type { CurrentMed } from "./VisitWorkspace";
import type { LabSeries } from "@/lib/labs";

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
    // Radix Accordion.Header renders an <h3>, which the global h1–h3 rule styles
    // in the display font (Belleza). Force the body font (Plus Jakarta Sans) so
    // these eyebrow headers match the right rail's exactly.
    <span
      className="flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
      {typeof count === "number" && <CountBadge n={count} />}
    </span>
  );
}

/** Searchable marker list (cmdk). Clicking a row opens that marker's chart in
 *  the Detail panel. Sorted alphabetically by label. */
function LabsSearchList({ labs, onOpenLab }: { labs: LabSeries[]; onOpenLab: (markerKey: string) => void }) {
  if (labs.length === 0) return <p className="text-[12px] italic text-[#9B8775]">No lab data recorded.</p>;
  return (
    <Command className="rounded-[8px] border border-[#E7DCCD] bg-white">
      <CommandInput placeholder="Search markers…" className="h-9 text-[12px]" />
      <CommandList className="max-h-[220px]">
        <CommandEmpty className="py-4 text-center text-[12px] text-[#9B8775]">No markers.</CommandEmpty>
        <CommandGroup>
          {sortByLabel(labs).map((s) => {
            const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
            const latest = pts.length ? pts[pts.length - 1] : null;
            return (
              <CommandItem
                key={s.key}
                value={s.label}
                onSelect={() => onOpenLab(s.key)}
                className="text-[12px] cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="truncate text-[#2E1F14]">{s.label}</span>
                {latest && (
                  <span className="shrink-0 text-[11px] tabular-nums text-[#9B8775]">
                    {latest.value}
                    {s.unit ? ` ${s.unit}` : ""}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function VisitContextSidebar({
  patientName,
  baseline,
  visits,
  currentMeds,
  allergies,
  diagnoses,
  labs,
  onOpenLab,
  onOpenVisit,
  onOpenDimension,
  onOpenMedHistory,
}: {
  patientName: string;
  baseline: PatientBaseline;
  visits: ClinicalVisit[];
  currentMeds: CurrentMed[];
  allergies: string[];
  diagnoses: BaselineDiagnosis[];
  labs: LabSeries[];
  onOpenLab: (markerKey: string) => void;
  onOpenVisit: (visitId: string) => void;
  onOpenDimension: (dimensionKey: DimensionKey) => void;
  onOpenMedHistory: (icd10: string, diagnosisName: string) => void;
}) {
  const { draft } = useVisitForm();
  const [showAllVisits, setShowAllVisits] = useState(false);
  // Bidirectional med↔diagnosis index (raw links from diagnosisIcd10). Derived.
  const diagNameByIcd = useMemo(() => new Map(diagnoses.map((d) => [d.icd10, d.name])), [diagnoses]);
  const medsByIcd = useMemo(() => {
    const m = new Map<string, CurrentMed[]>();
    for (const med of currentMeds) {
      if (!med.diagnosisIcd10) continue;
      const arr = m.get(med.diagnosisIcd10) ?? [];
      arr.push(med);
      m.set(med.diagnosisIcd10, arr);
    }
    return m;
  }, [currentMeds]);
  // Live derived scores: patient baseline + this visit's tagged inputs so far.
  // Memoized on the SCORING-RELEVANT slices only, so typing in the center's
  // always-live notes (which don't feed scoring) never recomputes these.
  const scores = useMemo(
    () =>
      computeDimensionScores(baseline, {
        // prescribingContexts included: resolving an existing diagnosis lifts its score.
        diagnoses: scoringDiagnoses({ diagnoses: draft.diagnoses, prescribingContexts: draft.prescribingContexts }),
        medicationChanges: draft.medicationChanges,
        measurements: draft.measurements,
      }),
    [baseline, draft.diagnoses, draft.prescribingContexts, draft.medicationChanges, draft.measurements],
  );
  const visibleVisits = showAllVisits ? visits : visits.slice(0, 4);

  return (
    <aside className="w-[280px] shrink-0 overflow-y-auto p-5 space-y-5" style={{ borderRight: "1px solid #E7DCCD" }}>
      {/* Equal-height intro band so the first accordion header lines up with the
          right rail's first group header across the page. */}
      <div className="min-h-[44px]">
        <SectionLabel>Patient Context</SectionLabel>
        <p className="text-[15px] font-semibold text-[#2E1F14] mt-1">{patientName}</p>
      </div>

      <Accordion type="multiple" defaultValue={[]} className="border-t border-[#F0EBE4]">
        {/* Dimensions — all 9, live derived score; click a row to open its trend */}
        <AccordionItem value="baseline" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-3 hover:no-underline">
            <TriggerLabel>Dimensions</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div>
              {DIMENSION_KEYS.map((key, i) => {
                const score = scores[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onOpenDimension(key)}
                    title="Open trend"
                    className="w-full text-left flex items-center justify-between h-7 rounded-md -mx-1.5 px-1.5 hover:bg-[#F0EBE4] transition-colors"
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
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Current Diagnoses */}
        <AccordionItem value="diagnoses" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-3 hover:no-underline">
            <TriggerLabel count={diagnoses.length}>Current Diagnoses</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            {diagnoses.length === 0 ? (
              <p className="text-[12px] italic text-[#9B8775]">No current diagnoses recorded.</p>
            ) : (
              <div className="space-y-0.5">
                {diagnoses.map((d) => {
                  const key = d.dimension ? fromLabel(d.dimension) : null;
                  const score = key ? scores[key] : null;
                  const linkedMeds = medsByIcd.get(d.icd10) ?? [];
                  return (
                    <button
                      key={`${d.name}-${d.icd10}`}
                      type="button"
                      onClick={() => onOpenMedHistory(d.icd10, d.name)}
                      title="Open medication & treatment history"
                      className="w-full text-left flex items-start gap-1.5 rounded-md -mx-1.5 px-1.5 py-1 hover:bg-[#F0EBE4] transition-colors"
                    >
                      <Stethoscope className="h-3 w-3 mt-0.5 text-[#9B8775] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-[#2E1F14]">
                          {d.name}
                          <span className="ml-1.5 text-[10px] font-mono text-[#9B8775]">{d.icd10}</span>
                        </div>
                        {linkedMeds.length > 0 && (
                          <div className="text-[10px] text-[#9B8775] truncate">
                            {linkedMeds.map((m) => m.name).join(", ")}
                          </div>
                        )}
                        {key && (
                          <span className={`text-[10px] font-medium ${scoreColorClass(score)}`}>
                            {dimensionLabel(key)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Medications — each shows the diagnosis it treats; click opens history */}
        <AccordionItem value="meds" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-3 hover:no-underline">
            <TriggerLabel count={currentMeds.length}>Medications</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            {currentMeds.length === 0 ? (
              <p className="text-[12px] italic text-[#9B8775]">No baseline medications recorded.</p>
            ) : (
              <div className="space-y-0.5">
                {currentMeds.map((m) => {
                  const diagName = m.diagnosisIcd10 ? diagNameByIcd.get(m.diagnosisIcd10) : undefined;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!m.diagnosisIcd10}
                      onClick={() => m.diagnosisIcd10 && onOpenMedHistory(m.diagnosisIcd10, diagName ?? m.name)}
                      title={m.diagnosisIcd10 ? "Open medication & treatment history" : undefined}
                      className="w-full text-left flex items-start gap-1.5 rounded-md -mx-1.5 px-1.5 py-1 hover:bg-[#F0EBE4] transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <Pill className="h-3 w-3 mt-0.5 text-[#9B8775] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-[#2E1F14] truncate">
                          {m.name}
                          <span className="text-[#9B8775]"> {m.dose}</span>
                        </div>
                        {diagName && (
                          <div className="text-[10px] text-[#9B8775] truncate">
                            — {diagName}
                            {m.diagnosisIcd10 && <span className="ml-1 font-mono">{m.diagnosisIcd10}</span>}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Allergies */}
        <AccordionItem value="allergies" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-3 hover:no-underline">
            <TriggerLabel count={allergies.length}>Allergies</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            {allergies.length === 0 ? (
              <p className="text-[12px] italic text-[#9B8775]">No known allergies recorded.</p>
            ) : (
              // Safety-critical: pink fill + red border + ⚠, using the app's danger
              // token (#E8446A), matching how allergy conflicts flag in prescribing.
              <div className="rounded-[8px] p-2.5" style={{ background: "#FCEAEE", border: "1px solid #F2B8C2" }}>
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#E8446A" }} />
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "#FFFFFF", border: "1px solid #F2B8C2", color: "#8A1B38" }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Labs — searchable marker list; a click opens the chart in the Detail panel */}
        <AccordionItem value="labs" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-3 hover:no-underline">
            <TriggerLabel count={labs.length}>Labs</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <LabsSearchList labs={labs} onOpenLab={onOpenLab} />
          </AccordionContent>
        </AccordionItem>

        {/* Visit History — collapsed accordion; a click opens the summary in the Detail panel */}
        <AccordionItem value="visit-history" className="border-[#F0EBE4]">
          <AccordionTrigger className="py-3 hover:no-underline">
            <TriggerLabel count={visits.length}>Visit History</TriggerLabel>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            {visits.length === 0 ? (
              <p className="text-[12px] italic text-[#9B8775]">No previous visits.</p>
            ) : (
              <div className="space-y-0.5">
                {visibleVisits.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onOpenVisit(v.id)}
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
                    onClick={() => setShowAllVisits((s) => !s)}
                    className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14] transition-colors mt-1 px-1.5"
                  >
                    {showAllVisits ? "Show less" : `See all ${visits.length}`}
                  </button>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
