// Center column: the editable visit note. Reason and SOAP notes are always-live
// inline textareas (patch the draft per keystroke, no Edit button). Diagnoses &
// Prescriptions is a diagnosis-driven section (see DiagnosisPrescribingSection).
// Measurements is an expand-in-place adder. Dimensions Affected is derived.
//
// PERF: the derived "Dimensions Affected" is memoized on the SCORING-RELEVANT
// slices (diagnoses / medicationChanges / measurements) only — never on notes or
// reason, so typing in the always-live notes does not recompute scoring.
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { VISIT_TYPE_META, type VisitType } from "@/lib/episodes";
import {
  dimensionLabel,
  formatScore,
  scoreBand,
  affectedDimensions,
  scoringDiagnoses,
  type PatientBaseline,
  type DimensionKey,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import { useVisitForm } from "./VisitFormProvider";
import { SectionCard, SectionLabel, Row, AutoTextarea } from "./visitUi";
import { MeasurementEntryForm } from "./MeasurementEntryForm";
import { DiagnosisPrescribingSection } from "./DiagnosisPrescribingSection";
import type { BaselineDiagnosis } from "./VisitContextSidebar";

/** A standing medication the patient is already on (same source as the left
 *  sidebar Medications accordion). Dimensions feed derived scoring on change. */
export type CurrentMed = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  dimensions: DimensionKey[];
  /** ICD-10 of the diagnosis this medication treats — links it to a prompt. */
  diagnosisIcd10?: string;
};

/** A standing non-medication treatment the patient is already on (devices,
 *  therapies). Linked to a diagnosis by ICD-10, same as CurrentMed. */
export type CurrentTreatment = {
  id: string;
  name: string;
  note?: string;
  diagnosisIcd10?: string;
};

export function VisitWorkspace({
  baseline,
  currentMeds,
  currentTreatments,
  currentDiagnoses,
  allergies,
  onOpenMedHistory,
}: {
  baseline: PatientBaseline;
  currentMeds: CurrentMed[];
  currentTreatments: CurrentTreatment[];
  currentDiagnoses: BaselineDiagnosis[];
  allergies: string[];
  onOpenMedHistory: (icd10: string, diagnosisName: string) => void;
}) {
  const f = useVisitForm();
  const d = f.draft;

  // Scoring-relevant slices only — stable across note/reason edits.
  const affected = useMemo(
    () =>
      affectedDimensions(baseline, {
        // prescribingContexts included: resolving an existing diagnosis feeds scoring.
        diagnoses: scoringDiagnoses({ diagnoses: d.diagnoses, prescribingContexts: d.prescribingContexts }),
        medicationChanges: d.medicationChanges,
        measurements: d.measurements,
      }),
    [baseline, d.diagnoses, d.prescribingContexts, d.medicationChanges, d.measurements],
  );

  const [measureOpen, setMeasureOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Reason — always live */}
      <SectionCard>
        <SectionLabel>Reason for Visit</SectionLabel>
        <select
          value={d.reason}
          onChange={(e) => f.set("reason", e.target.value as VisitType)}
          className="w-full bg-transparent outline-none text-[13px] text-[#1F1611] py-1"
          style={{ borderBottom: "1px solid #E7DCCD" }}
        >
          {(Object.entries(VISIT_TYPE_META) as [VisitType, { label: string }][]).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        <AutoTextarea
          placeholder="Reason for the visit…"
          value={d.reasonNote ?? ""}
          onChange={(v) => f.set("reasonNote", v)}
          minHeight={48}
        />
      </SectionCard>

      {/* Clinical notes — always live SOAP fields */}
      <SectionCard>
        <SectionLabel>Clinical Notes</SectionLabel>
        <LiveNote label="Reported Symptoms" placeholder="What the patient reports — symptoms, concerns, changes and events since last visit…" value={d.notes.subjective} onChange={(v) => f.patchNotes({ subjective: v })} />
        <LiveNote label="Clinical Observations" placeholder="Physical findings, examination notes, clinical observations…" value={d.notes.objective} onChange={(v) => f.patchNotes({ objective: v })} />
        <LiveNote label="Assessment" placeholder="Overall clinical assessment and summary…" value={d.notes.assessment} onChange={(v) => f.patchNotes({ assessment: v })} />
        <LiveNote label="General Notes" placeholder="Any additional notes…" value={d.notes.general} onChange={(v) => f.patchNotes({ general: v })} />
      </SectionCard>

      {/* Diagnoses & Prescriptions — diagnosis-driven prescribing */}
      <DiagnosisPrescribingSection
        currentDiagnoses={currentDiagnoses}
        currentMeds={currentMeds}
        currentTreatments={currentTreatments}
        allergies={allergies}
        onOpenMedHistory={onOpenMedHistory}
      />

      {/* Measurements — expand-in-place adder */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <SectionLabel>Measurements</SectionLabel>
          <AddToggle open={measureOpen} onClick={() => setMeasureOpen((o) => !o)} />
        </div>
        {measureOpen && <MeasurementEntryForm onClose={() => setMeasureOpen(false)} />}
        {d.measurements.length === 0 ? (
          <Empty>No measurements recorded</Empty>
        ) : (
          d.measurements.map((m) => (
            <Row key={m.id} onRemove={() => f.removeMeasurement(m.id)}>
              <span className="text-[12px] font-medium text-[#1F1611]">{m.marker}</span>
              <span className="text-[12px] text-[#1F1611]"> {String(m.value)} {m.unit}</span>
            </Row>
          ))
        )}
      </SectionCard>

      {/* Dimensions affected — derived, read-only */}
      <SectionCard>
        <SectionLabel>Dimensions Affected This Visit</SectionLabel>
        {affected.length === 0 ? (
          <Empty>Tag diagnoses, medications or measurements to see affected dimensions.</Empty>
        ) : (
          <div className="mt-1 space-y-1.5">
            {affected.map((a) => (
              <div key={a.dimension} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-[#2E1F14]">{dimensionLabel(a.dimension)}</span>
                  <span className="text-[11px] text-[#6E5A48]">
                    {"  "}
                    {a.drivers.map((dr, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        <span style={{ color: dr.direction === "up" ? "#E8446A" : "#0EA5A0" }}>{dr.label}</span>
                      </span>
                    ))}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[12px] shrink-0">
                  <span className={`tabular-nums ${scoreColorClass(a.from)}`}>{formatScore(a.from)}</span>
                  <span className="text-[#9B8775]">→</span>
                  <span className={`font-semibold tabular-nums ${scoreColorClass(a.to)}`}>{formatScore(a.to)}</span>
                  <span className={`font-medium ${scoreColorClass(a.to)}`}>{scoreBand(a.to)}</span>
                  {a.delta !== 0 && <span style={{ color: a.delta > 0 ? "#E8446A" : "#0EA5A0" }}>{a.delta > 0 ? "↑" : "↓"}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------------- small bits ---------------- */

function AddToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
    >
      <Plus className="h-3 w-3" /> Add
    </button>
  );
}

function LiveNote({ label, placeholder, value, onChange }: { label: string; placeholder: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[#9B8775] mb-0.5">{label}</div>
      <AutoTextarea placeholder={placeholder} value={value ?? ""} onChange={onChange} minHeight={48} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] italic text-[#9B8775] mt-1">{children}</p>;
}
