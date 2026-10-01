// Medication & treatment history for a diagnosis, shown in the fourth Detail
// panel (same card pattern as lab / dimension / visit cards). Derived via
// medicationHistoryForDiagnosis: current regimen + current treatments + a dated
// timeline of past medication changes AND non-medication treatments for the
// diagnosis. Shows the patient's allergies as context and a ⚠ on any current
// medication that conflicts, reading the SAME allergy data the left-rail uses.
import { X, AlertTriangle, Activity } from "lucide-react";
import { medicationHistoryForDiagnosis, type MedicationChangeKind } from "@/lib/visits";
import type { ClinicalVisit } from "@/lib/visits";
import { medicationAllergyConflict } from "@/lib/drugAllergy";
import type { CurrentMed, CurrentTreatment } from "./VisitWorkspace";

const CHANGE_LABEL: Record<MedicationChangeKind, string> = {
  started: "Started",
  stopped: "Stopped",
  dose_changed: "Dose changed",
  continued: "Continued",
};
// Timeline entry-type colours: teal marks where something was BEGUN (same teal
// the lab charts use for optimal/active bands); the amber marks discontinuation.
// Other kinds (dose changed / continued) keep the amber default.
const TEAL_INK = "#0E8A85";
const CHANGE_COLOR = (change: MedicationChangeKind): string => (change === "started" ? TEAL_INK : "#B45309");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function MedHistoryCard({
  icd10,
  diagnosisName,
  visits,
  currentMeds,
  currentTreatments,
  allergies,
  onClose,
}: {
  icd10: string;
  diagnosisName: string;
  visits: ClinicalVisit[];
  currentMeds: CurrentMed[];
  currentTreatments: CurrentTreatment[];
  allergies: string[];
  onClose: () => void;
}) {
  const hist = medicationHistoryForDiagnosis(icd10, visits, currentMeds, currentTreatments);
  const rows = [...hist.timeline].reverse(); // most recent first
  // Group consecutive entries that share a date so the date is shown ONCE per
  // group (entries listed beneath it) rather than repeated on every row.
  const byDate: { date: string; items: typeof rows }[] = [];
  for (const e of rows) {
    const last = byDate[byDate.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else byDate.push({ date: e.date, items: [e] });
  }

  return (
    <div className="rounded-[8px] p-3" style={{ border: "1px solid #E7DCCD", background: "#FFFDFB" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B8775]">Medication &amp; treatment history</span>
          <div className="text-[12px] font-semibold text-[#1F1611] truncate">
            {diagnosisName}
            {icd10 && <span className="ml-1 text-[10px] font-mono font-normal text-[#9B8775]">{icd10}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] text-[#9B8775] hover:bg-[#F0EBE4] hover:text-[#2E1F14] transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {allergies.length > 0 && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-[6px] px-2 py-1" style={{ background: "#FCEAEE", border: "1px solid #F2B8C2" }}>
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#E8446A" }} />
          <span className="text-[10px] font-medium" style={{ color: "#8A1B38" }}>Allergies: {allergies.join(", ")}</span>
        </div>
      )}

      {/* Current regimen */}
      <div className="mt-3 pt-3 border-t border-[#F0EBE4]">
        <div className="text-[10px] font-medium uppercase tracking-wide text-[#9B8775] mb-1.5">Current</div>
        {hist.current.length === 0 ? (
          <p className="text-[11px] italic text-[#9B8775]">No current medication for this diagnosis.</p>
        ) : (
          <div className="space-y-1">
            {hist.current.map((m) => {
              const conflict = medicationAllergyConflict({ name: m.name }, allergies);
              return (
                <div key={m.name} className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span>
                    <span className="font-medium text-[#1F1611]">{m.name}</span>
                    <span className="text-[#9B8775]"> {m.dose} · {m.frequency}</span>
                  </span>
                  {conflict && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium shrink-0" style={{ color: "#B45309" }} title={conflict.reason}>
                      <AlertTriangle className="h-3 w-3" /> {conflict.tag}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current treatments (non-medication) */}
      {hist.currentTreatments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#F0EBE4]">
          <div className="text-[10px] font-medium uppercase tracking-wide text-[#9B8775] mb-1.5">Current treatments</div>
          <div className="space-y-1">
            {hist.currentTreatments.map((t) => (
              <div key={t.name} className="flex items-baseline gap-1.5 text-[12px]">
                <Activity className="h-3 w-3 shrink-0 text-[#9B8775]" />
                <span>
                  <span className="font-medium text-[#1F1611]">{t.name}</span>
                  {t.note && <span className="text-[#9B8775]"> · {t.note}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline — medications + treatments, grouped by date (date shown once). */}
      <div className="mt-3 pt-3 border-t border-[#F0EBE4]">
        <div className="text-[10px] font-medium uppercase tracking-wide text-[#9B8775] mb-1.5">Medication history</div>
        {byDate.length === 0 ? (
          <p className="text-[11px] italic text-[#9B8775]">No prior changes recorded.</p>
        ) : (
          <div className="space-y-2.5">
            {byDate.map((grp) => (
              <div key={grp.date}>
                <div className="text-[10px] font-medium text-[#9B8775] mb-0.5">{fmtDate(grp.date)}</div>
                <div className="space-y-1 pl-2">
                  {grp.items.map((e, i) => (
                    <div key={`${e.medicationName}-${i}`} className="text-[11px] leading-snug">
                      <span className="font-medium" style={{ color: CHANGE_COLOR(e.change) }}>{CHANGE_LABEL[e.change]}</span>
                      <span className="text-[#1F1611]"> · {e.medicationName}</span>
                      {e.isTreatment && (
                        <Activity className="inline h-3 w-3 ml-1 align-text-bottom text-[#9B8775]" />
                      )}
                      {e.detail && <span className="text-[#9B8775]"> {e.detail}</span>}
                      {e.discontinueReason && (
                        <span className="block text-[10px] italic text-[#9B8775]">{e.discontinueReason}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
