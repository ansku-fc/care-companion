// Phase 1: the visit workspace — a compact, read-only overview that fits one
// screen. It shows what's been captured this visit as short previews / lists;
// ALL data entry happens in the right-hand drawer (opened via onOpen). Dimension
// scores remain derived (see derive.ts); nothing here is manually scored.
import { Pencil, Plus } from "lucide-react";
import { VISIT_TYPE_META } from "@/lib/episodes";
import {
  dimensionLabel,
  formatScore,
  scoreBand,
  affectedDimensions,
  scoringInputsFromVisit,
  type DimensionKey,
  type MedicationChangeKind,
  type PatientBaseline,
} from "@/lib/visits";
import { scoreColorClass } from "@/lib/scoreColor";
import { useVisitForm } from "./VisitFormProvider";
import { SectionCard, SectionLabel, Row } from "./visitUi";
import type { DrawerRequest } from "./VisitDrawer";

const MED_CHANGE_LABELS: Record<MedicationChangeKind, string> = {
  started: "Started",
  stopped: "Stopped",
  dose_changed: "Dose changed",
  continued: "Continued",
};

export function VisitWorkspace({
  baseline,
  onOpen,
}: {
  baseline: PatientBaseline;
  onOpen: (request: DrawerRequest) => void;
}) {
  const f = useVisitForm();
  const d = f.draft;
  const affected = affectedDimensions(baseline, scoringInputsFromVisit(d));

  return (
    <div className="space-y-3">
      {/* Reason */}
      <SectionCard>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <SectionLabel>Reason for Visit</SectionLabel>
            <p className="text-[13px] text-[#1F1611] mt-1 truncate">
              <span className="font-medium">{VISIT_TYPE_META[d.reason].label}</span>
              {d.reasonNote ? <span className="text-[#6E5A48]"> — {d.reasonNote}</span> : <span className="text-[#C9BBA9]"> — no note</span>}
            </p>
          </div>
          <EditButton onClick={() => onOpen({ kind: "reason" })} />
        </div>
      </SectionCard>

      {/* Clinical notes — compact previews, click to edit in drawer */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <SectionLabel>Clinical Notes</SectionLabel>
          <EditButton onClick={() => onOpen({ kind: "notes" })} />
        </div>
        <div className="mt-1 space-y-1.5">
          <NotePreview label="Reported Symptoms" text={d.notes.subjective} onClick={() => onOpen({ kind: "notes", focus: "subjective" })} />
          <NotePreview label="Clinical Observations" text={d.notes.objective} onClick={() => onOpen({ kind: "notes", focus: "objective" })} />
          <NotePreview label="Assessment" text={d.notes.assessment} onClick={() => onOpen({ kind: "notes", focus: "assessment" })} />
          {d.notes.general && <NotePreview label="General" text={d.notes.general} onClick={() => onOpen({ kind: "notes", focus: "general" })} />}
        </div>
      </SectionCard>

      {/* Medication changes */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <SectionLabel>Medication Changes</SectionLabel>
          <AddButton onClick={() => onOpen({ kind: "medication" })} />
        </div>
        {d.medicationChanges.length === 0 ? (
          <Empty>No changes recorded</Empty>
        ) : (
          d.medicationChanges.map((m) => (
            <Row key={m.id} onRemove={() => f.removeMedicationChange(m.id)}>
              <span className="text-[12px] font-medium text-[#1F1611]">{m.medicationName}</span>
              <span className="text-[11px] text-[#9B8775]"> · {MED_CHANGE_LABELS[m.change]}{m.dimensions.length ? ` · ${m.dimensions.map(dimensionLabel).join(", ")}` : ""}</span>
            </Row>
          ))
        )}
      </SectionCard>

      {/* Diagnoses + measurements */}
      <div className="grid grid-cols-2 gap-3">
        <SectionCard>
          <div className="flex items-center justify-between">
            <SectionLabel>Diagnoses</SectionLabel>
            <AddButton onClick={() => onOpen({ kind: "diagnosis" })} />
          </div>
          {d.diagnoses.length === 0 ? (
            <Empty>No diagnoses recorded</Empty>
          ) : (
            d.diagnoses.map((dx) => (
              <Row key={dx.id} onRemove={() => f.removeDiagnosis(dx.id)}>
                <span className="text-[12px] font-medium text-[#1F1611]">{dx.name}</span>
                {dx.icd10 && <span className="ml-1 text-[10px] font-mono text-[#9B8775]">{dx.icd10}</span>}
                <span className="text-[11px] text-[#9B8775]"> · {dx.status}</span>
              </Row>
            ))
          )}
        </SectionCard>

        <SectionCard>
          <div className="flex items-center justify-between">
            <SectionLabel>Measurements</SectionLabel>
            <AddButton onClick={() => onOpen({ kind: "measurement" })} />
          </div>
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
      </div>

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

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14] transition-colors shrink-0"
    >
      <Pencil className="h-3 w-3" /> Edit
    </button>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
    >
      <Plus className="h-3 w-3" /> Add
    </button>
  );
}

function NotePreview({ label, text, onClick }: { label: string; text?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left group">
      <span className="text-[10px] uppercase tracking-wide text-[#9B8775]">{label}</span>
      <p className={`text-[12px] leading-snug line-clamp-2 ${text ? "text-[#1F1611]" : "text-[#C9BBA9] italic"} group-hover:text-[#2E1F14]`}>
        {text || `Add ${label.toLowerCase()}…`}
      </p>
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] italic text-[#9B8775] mt-1">{children}</p>;
}
