// Diagnosis-driven prescribing — the merged center section. The doctor diagnoses
// first; each diagnosis becomes a prompt. The prompt's options depend on whether
// the diagnosis already has a CURRENT linked medication:
//
//  • Existing diagnosis WITH a current med → show the current med(s) with
//    Change / Stop / Add another; NO "No medication needed" (it's already
//    treated, so the prompt is considered resolved and off the attention badge).
//  • New diagnosis, or existing with no current med → Prescribe / No medication
//    needed (a genuine treat-or-not decision).
//
// Raw: linkedDiagnosisId on each rx/change, noMedication flags, prescribing
// contexts, and the med→diagnosis link (diagnosisIcd10) on current meds. Derived:
// the grouping (diagnosisPrescribing, visit-only) + the current-med linkage and
// resolution composed here (needs the baseline regimen, which isn't on the draft).
import { useState } from "react";
import { Plus, ChevronDown, AlertCircle, AlertTriangle, Check, Activity } from "lucide-react";
import { diagnosisPrescribing, type DiagnosisRxGroup, type MedicationChangeKind } from "@/lib/visits";
import { useVisitForm } from "./VisitFormProvider";
import { SectionCard, SectionLabel, Row } from "./visitUi";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { DiagnosisEntryForm } from "./DiagnosisEntryForm";
import { PrescriptionForm, TreatmentForm, uid } from "@/components/visits/forms";
import { prescriptionFromForm } from "./planAdapters";
import { medicationAllergyConflict } from "@/lib/drugAllergy";
import type { CurrentMed, CurrentTreatment } from "./VisitWorkspace";
import type { BaselineDiagnosis } from "./VisitContextSidebar";

const CHANGE_LABEL: Record<MedicationChangeKind, string> = {
  started: "Started",
  stopped: "Stopped",
  dose_changed: "Dose changed",
  continued: "Continued",
};

const TREATMENT_CHANGE_LABEL: Record<"started" | "stopped" | "continued", string> = {
  started: "Treatment",
  stopped: "Treatment stopped",
  continued: "Treatment updated",
};

type SavePrescription = (
  m: { id: string; name: string; atc?: string; dose: string; frequency: string; time: string },
  basedOnId: string | null,
) => void;

export function DiagnosisPrescribingSection({
  currentDiagnoses,
  currentMeds,
  currentTreatments,
  allergies,
  onOpenMedHistory,
}: {
  currentDiagnoses: BaselineDiagnosis[];
  currentMeds: CurrentMed[];
  currentTreatments: CurrentTreatment[];
  allergies: string[];
  onOpenMedHistory: (icd10: string, diagnosisName: string) => void;
}) {
  const f = useVisitForm();
  const d = f.draft;
  const dp = diagnosisPrescribing(d);

  const [sectionOpen, setSectionOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<string[]>(["current", "new"]);
  const [addDxOpen, setAddDxOpen] = useState(false);

  const savePrescription: (diagnosisId: string) => SavePrescription = (diagnosisId) => (m, basedOnId) => {
    if (basedOnId) {
      const med = currentMeds.find((c) => c.id === basedOnId);
      const parts: string[] = [];
      if (med && m.dose && m.dose !== med.dose) parts.push(`${med.dose} → ${m.dose}`);
      if (med && m.frequency && m.frequency !== med.frequency) parts.push(`${med.frequency} → ${m.frequency}`);
      f.addMedicationChange({
        id: uid(),
        medicationName: m.name,
        atc: m.atc,
        change: parts.length ? "dose_changed" : "continued",
        detail: parts.join(", ") || undefined,
        dimensions: med?.dimensions ?? [],
        linkedDiagnosisId: diagnosisId,
      });
    } else {
      f.addPrescription({ ...prescriptionFromForm(m), linkedDiagnosisId: diagnosisId });
    }
  };

  const stopCurrentMed = (diagnosisId: string, med: CurrentMed, reason?: string) => {
    const trimmed = reason?.trim();
    f.addMedicationChange({
      id: uid(),
      medicationName: med.name,
      change: "stopped",
      detail: `was ${med.dose} · ${med.frequency}`,
      dimensions: med.dimensions,
      linkedDiagnosisId: diagnosisId,
      discontinueReason: trimmed || undefined,
    });
  };

  const addTreatment = (diagnosisId: string, t: { name: string; note?: string }) => {
    f.addTreatment({
      id: uid(),
      name: t.name,
      change: "started",
      note: t.note,
      linkedDiagnosisId: diagnosisId,
    });
  };

  const stopTreatment = (diagnosisId: string, t: CurrentTreatment, reason?: string) => {
    const trimmed = reason?.trim();
    f.addTreatment({
      id: uid(),
      name: t.name,
      change: "stopped",
      linkedDiagnosisId: diagnosisId,
      discontinueReason: trimmed || undefined,
    });
  };

  const changeTreatment = (diagnosisId: string, t: CurrentTreatment, note: string) => {
    f.addTreatment({
      id: uid(),
      name: t.name,
      change: "continued",
      note: note.trim() || undefined,
      linkedDiagnosisId: diagnosisId,
    });
  };

  const setNoMed = (g: DiagnosisRxGroup, value: boolean) => {
    if (g.source === "new") f.updateDiagnosis(g.id, { noMedication: value });
    else f.updatePrescribingContext(g.id, { noMedication: value });
  };
  // Mark an existing condition clinically resolved this visit (raw flag on the
  // prescribing context) — feeds derived scoring as a resolved diagnosis.
  const markResolved = (g: DiagnosisRxGroup, value: boolean) => {
    if (g.source === "existing") f.updatePrescribingContext(g.id, { resolved: value });
    else f.updateDiagnosis(g.id, { status: value ? "resolved" : "active" });
  };
  const removePrompt = (g: DiagnosisRxGroup) => {
    g.prescriptions.forEach((p) => f.removePrescription(p.id));
    g.changes.forEach((c) => f.removeMedicationChange(c.id));
    g.treatments.forEach((t) => f.removeTreatment(t.id));
    if (g.source === "new") f.removeDiagnosis(g.id);
    else f.removePrescribingContext(g.id);
  };

  // Compose the visit-derived groups with the baseline regimen linkage, split by
  // source: existing → "Current diagnoses", new-this-visit → "New diagnoses".
  // Attention status applies only to new diagnoses (a genuine prescribe decision).
  const rows = dp.groups.map((g) => {
    const linkedCurrent = g.icd10 ? currentMeds.filter((m) => m.diagnosisIcd10 === g.icd10) : [];
    const linkedTreatments = g.icd10 ? currentTreatments.filter((t) => t.diagnosisIcd10 === g.icd10) : [];
    const isNew = g.source === "new";
    const pending = isNew && !g.resolved; // g.resolved = noMedication || has this-visit meds/treatments
    const accent = g.markedResolved ? "#0E8A85" : isNew ? (pending ? "#B45309" : "#0EA5A0") : "#E7DCCD";
    return { g, linkedCurrent, linkedTreatments, hasCurrentMed: linkedCurrent.length > 0, accent, pending };
  });
  const existingRows = rows.filter((r) => r.g.source === "existing");
  const newRows = rows.filter((r) => r.g.source === "new");
  const pendingCount = newRows.filter((r) => r.pending).length;

  const renderPrompt = (r: typeof rows[number]) => (
    <DiagnosisPrompt
      key={r.g.id}
      g={r.g}
      linkedCurrent={r.linkedCurrent}
      linkedTreatments={r.linkedTreatments}
      currentMeds={currentMeds}
      allergies={allergies}
      hasCurrentMed={r.hasCurrentMed}
      accent={r.accent}
      defaultExpanded={r.pending}
      onPrescribe={savePrescription(r.g.id)}
      onStop={(med, reason) => stopCurrentMed(r.g.id, med, reason)}
      onAddTreatment={(t) => addTreatment(r.g.id, t)}
      onStopTreatment={(t, reason) => stopTreatment(r.g.id, t, reason)}
      onChangeTreatment={(t, note) => changeTreatment(r.g.id, t, note)}
      onSetNoMed={(v) => setNoMed(r.g, v)}
      onMarkResolved={(v) => markResolved(r.g, v)}
      onRemove={() => removePrompt(r.g)}
      onRemoveChange={(id) => f.removeMedicationChange(id)}
      onRemovePrescription={(id) => f.removePrescription(id)}
      onRemoveTreatment={(id) => f.removeTreatment(id)}
      onHistory={() => onOpenMedHistory(r.g.icd10, r.g.name)}
    />
  );

  return (
    <SectionCard>
      {/* Section header — closed by default; attention badge stays visible. */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setSectionOpen((o) => !o)} aria-expanded={sectionOpen} className="flex items-center gap-1.5">
          <ChevronDown className={`h-3.5 w-3.5 text-[#9B8775] transition-transform ${sectionOpen ? "" : "-rotate-90"}`} />
          <SectionLabel>Diagnoses, prescriptions &amp; treatments</SectionLabel>
          {pendingCount > 0 ? (
            <span
              className="ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: "#FBECDD", color: "#B45309" }}
              title={`${pendingCount} new diagnosis${pendingCount === 1 ? "" : "es"} awaiting a prescribing decision`}
            >
              <AlertCircle className="h-3 w-3" />
              {pendingCount} awaiting
            </span>
          ) : newRows.length > 0 ? (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#0EA5A0]">
              <Check className="h-3 w-3" /> all resolved
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => { setSectionOpen(true); setSubOpen((s) => (s.includes("new") ? s : [...s, "new"])); setAddDxOpen(true); }}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {sectionOpen && (
        <Accordion type="multiple" value={subOpen} onValueChange={setSubOpen} className="mt-1">
          {/* Current diagnoses — all of the patient's existing conditions. */}
          <AccordionItem value="current" className="border-[#F0EBE4]">
            <AccordionTrigger className="py-2 hover:no-underline">
              <SubLabel count={existingRows.length}>Current diagnoses</SubLabel>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              {existingRows.length === 0 ? (
                <p className="text-[12px] italic text-[#9B8775]">No current diagnoses.</p>
              ) : (
                <div className="space-y-2">{existingRows.map(renderPrompt)}</div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* New diagnoses — recorded this visit via the add flow. */}
          <AccordionItem value="new" className="border-[#F0EBE4]">
            <AccordionTrigger className="py-2 hover:no-underline">
              <SubLabel count={newRows.length}>New diagnoses</SubLabel>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              {addDxOpen ? (
                <DiagnosisEntryForm currentDiagnoses={currentDiagnoses} onClose={() => setAddDxOpen(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddDxOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline mb-1.5"
                >
                  <Plus className="h-3 w-3" /> Add diagnosis
                </button>
              )}
              {newRows.length === 0 ? (
                <p className="text-[12px] italic text-[#9B8775]">No new diagnoses recorded this visit.</p>
              ) : (
                <div className="space-y-2">{newRows.map(renderPrompt)}</div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </SectionCard>
  );
}

/** Sub-accordion eyebrow label (forces body font over the global h3 display rule). */
function SubLabel({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#6E5A48]">
        {count}
      </span>
    </span>
  );
}

type PromptForm =
  | null
  | { mode: "change"; med: CurrentMed }
  | { mode: "stop"; med: CurrentMed }
  | { mode: "add" }
  | { mode: "prescribe" }
  | { mode: "treatment" }
  | { mode: "treatmentChange"; treatment: CurrentTreatment }
  | { mode: "treatmentStop"; treatment: CurrentTreatment };

function DiagnosisPrompt({
  g,
  linkedCurrent,
  linkedTreatments,
  currentMeds,
  allergies,
  hasCurrentMed,
  accent,
  defaultExpanded,
  onPrescribe,
  onStop,
  onAddTreatment,
  onStopTreatment,
  onChangeTreatment,
  onSetNoMed,
  onMarkResolved,
  onRemove,
  onRemoveChange,
  onRemovePrescription,
  onRemoveTreatment,
  onHistory,
}: {
  g: DiagnosisRxGroup;
  linkedCurrent: CurrentMed[];
  linkedTreatments: CurrentTreatment[];
  currentMeds: CurrentMed[];
  allergies: string[];
  hasCurrentMed: boolean;
  /** Left-border status accent. Only new diagnoses carry status; existing is neutral. */
  accent: string;
  /** Expanded on mount — pending new diagnoses auto-open so they can be actioned. */
  defaultExpanded: boolean;
  onPrescribe: SavePrescription;
  onStop: (med: CurrentMed, reason?: string) => void;
  onAddTreatment: (t: { name: string; note?: string }) => void;
  onStopTreatment: (t: CurrentTreatment, reason?: string) => void;
  onChangeTreatment: (t: CurrentTreatment, note: string) => void;
  onSetNoMed: (value: boolean) => void;
  onMarkResolved: (value: boolean) => void;
  onRemove: () => void;
  onRemoveChange: (id: string) => void;
  onRemovePrescription: (id: string) => void;
  onRemoveTreatment: (id: string) => void;
  onHistory: () => void;
}) {
  const hasCurrentTreatment = linkedTreatments.length > 0;
  // "No treatment needed" was chosen AND nothing else is linked → actions hidden.
  const resolvedNoTreatment = !hasCurrentMed && !hasCurrentTreatment && g.noMedication;
  const pending = g.source === "new" && !g.resolved;
  const [form, setForm] = useState<PromptForm>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actedOn = (medName: string) => g.changes.some((c) => c.medicationName === medName);
  const treatmentActedOn = (name: string) => g.treatments.some((t) => t.name === name);
  const commit: SavePrescription = (m, basedOnId) => {
    onPrescribe(m, basedOnId);
    setForm(null);
  };

  // Compact summary shown in the collapsed header.
  const medCount = linkedCurrent.length + g.prescriptions.length;
  const txCount = linkedTreatments.length + g.treatments.filter((t) => t.change === "started").length;
  const anyConflict = linkedCurrent.some((m) => !!medicationAllergyConflict({ name: m.name }, allergies));
  const summary = (() => {
    if (resolvedNoTreatment) return "No treatment needed";
    const parts: string[] = [];
    if (medCount > 0) parts.push(`${medCount} medication${medCount === 1 ? "" : "s"}`);
    if (txCount > 0) parts.push(`${txCount} treatment${txCount === 1 ? "" : "s"}`);
    if (parts.length) return parts.join(" · ");
    return pending ? "Awaiting prescribing decision" : "No current management";
  })();

  return (
    <div
      className="group relative rounded-[8px] p-2.5"
      style={{ border: "1px solid #E7DCCD", borderLeft: `2px solid ${accent}`, background: "#FFFDFB" }}
    >
      {/* Compact header — a single line (name + ICD + summary); click toggles the
          full detail. Name ellipses before the meta so the row never wraps. */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
        >
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#9B8775] transition-transform ${expanded ? "" : "-rotate-90"}`} />
          <span className="text-[12px] font-medium text-[#1F1611] truncate min-w-0">{g.name}</span>
          {g.icd10 && <span className="text-[10px] font-mono text-[#9B8775] shrink-0">{g.icd10}</span>}
          {g.markedResolved && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium shrink-0 rounded-full px-1.5 py-0.5" style={{ background: "#E6F4F3", color: "#0E8A85" }}>
              <Check className="h-3 w-3" /> Resolved
            </span>
          )}
          {!expanded && !g.markedResolved && (
            <span className="text-[10px] shrink-0 whitespace-nowrap" style={{ color: pending ? "#B45309" : "#9B8775" }}>· {summary}</span>
          )}
          {!expanded && anyConflict && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium shrink-0" style={{ color: "#B45309" }}>
              <AlertTriangle className="h-3 w-3" /> allergy
            </span>
          )}
        </button>
        <button type="button" onClick={onRemove} aria-label="Remove" className="opacity-0 group-hover:opacity-100 transition-opacity text-[#C9BBA9] hover:text-[#2E1F14] shrink-0">
          ✕
        </button>
      </div>

      {expanded && (
        <>
          {/* Current medication(s) — each row carries its own History/Change/Stop. */}
          {hasCurrentMed && (
            <div className="mt-1.5 space-y-1">
              {linkedCurrent
                .filter((med) => !(form?.mode === "change" && form.med.id === med.id))
                .map((med) => {
                const done = actedOn(med.name);
                const conflict = medicationAllergyConflict({ name: med.name }, allergies);
                return (
                  <div key={med.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-[12px]">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-[#9B8775]">Current</span>
                      <span className="ml-1.5 font-medium text-[#1F1611]">{med.name}</span>
                      <span className="text-[#9B8775]"> {med.dose} · {med.frequency}</span>
                      {conflict && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium align-middle" style={{ color: "#B45309" }} title={conflict.reason}>
                          <AlertTriangle className="h-3 w-3" /> {conflict.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={onHistory} className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14] hover:underline">
                        History
                      </button>
                      {done ? (
                        <span className="text-[10px] text-[#9B8775]">acted on this visit</span>
                      ) : (
                        <>
                          <button type="button" onClick={() => setForm({ mode: "change", med })} className="text-[11px] font-medium text-primary hover:underline">
                            Change
                          </button>
                          <button type="button" onClick={() => setForm({ mode: "stop", med })} className="text-[11px] font-medium text-[#B45309] hover:underline">
                            Stop
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current treatment(s) — each row carries its own History/Change/Stop,
              mirroring the medication rows (full management, item-level actions). */}
          {hasCurrentTreatment && (
            <div className="mt-1.5 space-y-1">
              {linkedTreatments
                .filter((t) => !(form?.mode === "treatmentChange" && form.treatment.id === t.id))
                .map((t) => {
                const done = treatmentActedOn(t.name);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-[12px]">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#9B8775]">
                        <Activity className="h-3 w-3" /> Treatment
                      </span>
                      <span className="ml-1.5 font-medium text-[#1F1611]">{t.name}</span>
                      {t.note && <span className="text-[#9B8775]"> · {t.note}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={onHistory} className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14] hover:underline">
                        History
                      </button>
                      {done ? (
                        <span className="text-[10px] text-[#9B8775]">acted on this visit</span>
                      ) : (
                        <>
                          <button type="button" onClick={() => setForm({ mode: "treatmentChange", treatment: t })} className="text-[11px] font-medium text-primary hover:underline">
                            Change
                          </button>
                          <button type="button" onClick={() => setForm({ mode: "treatmentStop", treatment: t })} className="text-[11px] font-medium text-[#B45309] hover:underline">
                            Stop
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions recorded this visit (changes + new prescriptions + treatments). */}
          {g.changes.map((mc) => (
            <Row key={mc.id} onRemove={() => onRemoveChange(mc.id)}>
              <span className="text-[11px] font-medium text-[#B45309]">{CHANGE_LABEL[mc.change]}</span>
              <span className="text-[12px] text-[#1F1611]"> · {mc.medicationName}</span>
              {mc.detail && <span className="text-[11px] text-[#9B8775]"> {mc.detail}</span>}
              {mc.discontinueReason && <span className="text-[11px] italic text-[#9B8775]"> — {mc.discontinueReason}</span>}
            </Row>
          ))}
          {g.prescriptions.map((p) => (
            <Row key={p.id} onRemove={() => onRemovePrescription(p.id)}>
              <span className="text-[11px] font-medium text-[#0EA5A0]">New</span>
              <span className="text-[12px] text-[#1F1611]"> · {p.medicationName}</span>
              <span className="text-[11px] text-[#9B8775]"> {[p.dose, p.frequency, p.time].filter(Boolean).join(" · ")}</span>
            </Row>
          ))}
          {g.treatments.map((t) => (
            <Row key={t.id} onRemove={() => onRemoveTreatment(t.id)}>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: t.change === "stopped" ? "#B45309" : "#0EA5A0" }}>
                <Activity className="h-3 w-3" /> {TREATMENT_CHANGE_LABEL[t.change]}
              </span>
              <span className="text-[12px] text-[#1F1611]"> · {t.name}</span>
              {t.note && <span className="text-[11px] text-[#9B8775]"> {t.note}</span>}
              {t.discontinueReason && <span className="text-[11px] italic text-[#9B8775]"> — {t.discontinueReason}</span>}
            </Row>
          ))}

          {/* "No treatment needed" — only meaningful for new/untreated diagnoses
              (the flag is stored as noMedication, now broader than drugs). */}
          {!hasCurrentMed && !hasCurrentTreatment && g.noMedication && (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6E5A48]">
                <Check className="h-3 w-3 text-[#0EA5A0]" /> No treatment needed
              </span>
              <button type="button" onClick={() => onSetNoMed(false)} className="text-[10px] font-medium text-[#9B8775] hover:text-[#2E1F14]">
                Undo
              </button>
            </div>
          )}

          {/* Inline medication stop form — free-text discontinuation reason (raw). */}
          {form?.mode === "stop" && (
            <InlineNoteForm
              title={`Stop ${form.med.name}`}
              label="Reason for discontinuation"
              placeholder="e.g. switched due to cough, no longer indicated, adverse effect…"
              confirmLabel="Stop medication"
              confirmColor="#B45309"
              onConfirm={(reason) => { onStop(form.med, reason); setForm(null); }}
              onCancel={() => setForm(null)}
            />
          )}

          {/* Inline treatment stop form. */}
          {form?.mode === "treatmentStop" && (
            <InlineNoteForm
              title={`Stop ${form.treatment.name}`}
              label="Reason for discontinuation"
              placeholder="e.g. poor tolerance, no longer indicated…"
              confirmLabel="Stop treatment"
              confirmColor="#B45309"
              onConfirm={(reason) => { onStopTreatment(form.treatment, reason); setForm(null); }}
              onCancel={() => setForm(null)}
            />
          )}

          {/* Inline treatment change form — records an adjustment note. */}
          {form?.mode === "treatmentChange" && (
            <InlineNoteForm
              title={`Change ${form.treatment.name}`}
              label="Adjustment / note"
              placeholder="e.g. increase pressure to 12 cmH₂O, switch to nasal mask…"
              confirmLabel="Save change"
              confirmColor="#2E1F14"
              requireText
              onConfirm={(note) => { onChangeTreatment(form.treatment, note); setForm(null); }}
              onCancel={() => setForm(null)}
            />
          )}

          {/* Inline prescription form (two-mode). Pre-fills the current med for Change. */}
          {form && (form.mode === "change" || form.mode === "add" || form.mode === "prescribe") && (
            <div className="mt-2">
              <PrescriptionForm
                currentMeds={currentMeds}
                changeTarget={form.mode === "change" ? form.med : undefined}
                allergies={allergies}
                onSave={commit}
                onCancel={() => setForm(null)}
              />
            </div>
          )}

          {/* Inline add-treatment form — catalog dropdown + optional note. */}
          {form?.mode === "treatment" && (
            <div className="mt-2">
              <TreatmentForm
                onSave={(t) => { onAddTreatment(t); setForm(null); }}
                onCancel={() => setForm(null)}
              />
            </div>
          )}

          {/* Resolved state for an existing condition (teal), with undo. */}
          {g.source === "existing" && g.markedResolved && (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "#0E8A85" }}>
                <Check className="h-3 w-3" /> Marked resolved this visit
              </span>
              <button type="button" onClick={() => onMarkResolved(false)} className="text-[10px] font-medium text-[#9B8775] hover:text-[#2E1F14]">
                Undo
              </button>
            </div>
          )}

          {/* Actions row — medication action depends on current regimen; "Add
              treatment" is always available; "No treatment needed" only when the
              diagnosis has nothing linked yet; existing conditions can be marked
              resolved. */}
          {!form && !resolvedNoTreatment && (
            <div className="mt-1.5 flex items-center gap-3 flex-wrap">
              {hasCurrentMed ? (
                <button type="button" onClick={() => setForm({ mode: "add" })} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Add medication
                </button>
              ) : (
                <button type="button" onClick={() => setForm({ mode: "prescribe" })} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Prescribe
                </button>
              )}
              <button type="button" onClick={() => setForm({ mode: "treatment" })} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                <Activity className="h-3 w-3" /> Add treatment
              </button>
              {!hasCurrentMed && !hasCurrentTreatment && g.changes.length + g.prescriptions.length + g.treatments.length === 0 && (
                <button type="button" onClick={() => onSetNoMed(true)} className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14]">
                  No treatment needed
                </button>
              )}
              {g.source === "existing" && !g.markedResolved && (
                <button type="button" onClick={() => onMarkResolved(true)} className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14]">
                  Mark resolved
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Inline free-text form reused for medication/treatment stop + treatment change:
 *  a titled textarea + confirm/cancel. `requireText` gates confirm when non-empty
 *  input is mandatory (e.g. a change note); stop reasons stay optional. */
function InlineNoteForm({
  title,
  label,
  placeholder,
  confirmLabel,
  confirmColor,
  requireText = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  confirmColor: string;
  requireText?: boolean;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2 rounded-[8px] p-2.5" style={{ border: "1px solid #E7DCCD", background: "#FDF6EE" }}>
      <div className="text-[11px] font-medium" style={{ color: confirmColor }}>{title}</div>
      <label className="mt-1.5 block text-[10px] font-medium uppercase tracking-wide text-[#9B8775]">{label}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        autoFocus
        placeholder={placeholder}
        className="mt-1 w-full resize-none rounded-[6px] border border-[#E7DCCD] bg-white px-2 py-1.5 text-[12px] text-[#1F1611] placeholder:text-[#C9BBA9] focus:outline-none focus:ring-1 focus:ring-[#B45309]"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={requireText && !text.trim()}
          onClick={() => onConfirm(text)}
          className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
          style={{ background: confirmColor }}
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-[11px] font-medium text-[#9B8775] hover:text-[#2E1F14]">
          Cancel
        </button>
      </div>
    </div>
  );
}
