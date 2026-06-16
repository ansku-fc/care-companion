import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pill, ClipboardList, ChevronDown, ChevronRight, Flag } from "lucide-react";

type Tone = "rose" | "amber" | "teal";

const DIMENSIONS: { label: string; score: number; band: "HIGH" | "MEDIUM" | "LOW"; tone: Tone }[] = [
  { label: "Cardiovascular Health", score: 9.6, band: "HIGH", tone: "rose" },
  { label: "Metabolic Health", score: 7.8, band: "HIGH", tone: "rose" },
  { label: "Digestion", score: 7.3, band: "HIGH", tone: "rose" },
  { label: "Cancer Risk", score: 6.3, band: "MEDIUM", tone: "amber" },
  { label: "Exercise & Functional", score: 4.0, band: "MEDIUM", tone: "amber" },
  { label: "Brain & Mental Health", score: 2.8, band: "LOW", tone: "teal" },
  { label: "Respiratory & Immune", score: 2.8, band: "LOW", tone: "teal" },
  { label: "Skin, Oral & Mucosal", score: 2.8, band: "LOW", tone: "teal" },
  { label: "Reproductive & Sexual", score: 2.8, band: "LOW", tone: "teal" },
];

const MEDICATIONS = [
  "Lisinopril · 10mg · Morning",
  "Atorvastatin · 20mg · Evening",
  "Warfarin · 5mg · Daily",
  "Metformin · 500mg · Twice daily",
];

const ALLERGIES = ["NSAIDs", "Penicillin", "Tree nuts"];

const ALL_DIMENSIONS = [
  "Cardiovascular Health",
  "Metabolic Health",
  "Brain & Mental Health",
  "Exercise & Functional Capacity",
  "Digestion",
  "Cancer Risk",
  "Respiratory & Immune Health",
  "Skin, Oral & Mucosal Health",
  "Reproductive & Sexual Health",
];

const TONE_COLOR: Record<Tone, string> = {
  rose: "#E8446A",
  amber: "#D97706",
  teal: "#0EA5A0",
};

type Finding = { text: string; flagged: boolean };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775]">
      {children}
    </div>
  );
}

function GhostButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors h-8 px-3 " +
        className
      }
      style={{ border: "1px solid #E7DCCD" }}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-[8px] flex flex-col gap-2"
      style={{ border: "1px solid #E7DCCD", padding: "16px" }}
    >
      {children}
    </div>
  );
}

function AutoTextarea({
  placeholder,
  value,
  onChange,
  minHeight = 80,
  bordered = false,
}: {
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  minHeight?: number;
  bordered?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange?.(e.target.value);
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
      className="w-full resize-none bg-transparent outline-none text-[14px] font-normal text-[#1F1611] placeholder:text-[#C9BBA9] leading-relaxed py-1"
      style={{ minHeight, border: "none", borderBottom: bordered ? "1px solid #E7DCCD" : "none" }}
    />
  );
}

function VitalInput({ label, suffix }: { label: string; suffix: string }) {
  return (
    <div className="inline-flex items-baseline gap-1.5 text-[13px] text-[#6E5A48]">
      <span className="uppercase tracking-wide text-[11px] text-[#9B8775]">{label}</span>
      <input
        className="w-12 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      />
      <span className="text-[11px] text-[#9B8775]">{suffix}</span>
    </div>
  );
}

function FlagToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2 group"
    >
      <span
        className="relative inline-flex items-center w-8 h-[18px] rounded-full transition-colors duration-150"
        style={{ background: on ? "#E8446A" : "#E7DCCD" }}
      >
        <span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-150"
          style={{ left: on ? "16px" : "2px" }}
        />
      </span>
      <span className="text-[12px] text-[#6E5A48] inline-flex items-center gap-1">
        <Flag className="h-3 w-3" style={{ color: on ? "#E8446A" : "#C9BBA9" }} />
        Flag for review
      </span>
    </button>
  );
}

function FindingBlock({
  dimension,
  finding,
  pendingRemoval,
  onChange,
  onFlag,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
}: {
  dimension: string;
  finding: Finding;
  pendingRemoval: boolean;
  onChange: (t: string) => void;
  onFlag: (v: boolean) => void;
  onRequestRemove: () => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
}) {
  return (
    <div
      className="animate-accordion-down overflow-hidden pt-2"
      style={{ borderTop: "1px dashed #F0EBE4" }}
    >
      <div className="text-[12px] font-semibold text-[#6E5A48] mb-1 flex items-center justify-between">
        <span>{dimension}</span>
        <button
          type="button"
          onClick={onRequestRemove}
          className="text-[11px] text-[#C9BBA9] hover:text-[#E8446A] transition-colors"
        >
          Remove
        </button>
      </div>
      <AutoTextarea
        placeholder="Findings and clinical interpretation..."
        value={finding.text}
        onChange={onChange}
        minHeight={56}
        bordered
      />
      <div className="flex items-center justify-between mt-2">
        <FlagToggle on={finding.flagged} onChange={onFlag} />
      </div>

      {pendingRemoval && (
        <div
          className="mt-2 rounded-[6px] p-2 flex items-center justify-between gap-3 animate-fade-in"
          style={{ background: "#FBE4EA" }}
        >
          <span className="text-[12px] text-[#6E5A48]">
            Remove findings for {dimension}? This can't be undone.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCancelRemove}
              className="text-[12px] font-medium text-[#6E5A48] hover:text-[#2E1F14] px-2 py-1"
            >
              Keep
            </button>
            <button
              onClick={onConfirmRemove}
              className="text-[12px] font-medium text-white px-2 py-1 rounded-[4px]"
              style={{ background: "#E8446A" }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultationWorkspacePage() {
  const navigate = useNavigate();
  const [medsOpen, setMedsOpen] = useState(false);

  // Pre-populate Brain & Mental Health for Mäkinen, Aino
  const [findings, setFindings] = useState<Record<string, Finding>>({
    "Brain & Mental Health": {
      text:
        "Persistent migraine, 3rd episode this month. Consider prophylaxis — discuss topiramate or propranolol options with patient.",
      flagged: true,
    },
  });
  // Preserve insertion order
  const [order, setOrder] = useState<string[]>(["Brain & Mental Health"]);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const selectedDims = order;

  const toggleDim = (d: string) => {
    if (findings[d]) {
      // Trying to deselect
      if (findings[d].text.trim().length > 0) {
        setPendingRemove(d);
      } else {
        removeDim(d);
      }
    } else {
      setFindings((prev) => ({ ...prev, [d]: { text: "", flagged: false } }));
      setOrder((prev) => [...prev, d]);
      setShowValidation(false);
    }
  };

  const removeDim = (d: string) => {
    setFindings((prev) => {
      const next = { ...prev };
      delete next[d];
      return next;
    });
    setOrder((prev) => prev.filter((x) => x !== d));
    setPendingRemove(null);
  };

  const updateFinding = (d: string, patch: Partial<Finding>) => {
    setFindings((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  };

  const onEndConsultation = () => {
    if (selectedDims.length === 0) {
      setShowValidation(true);
      return;
    }
    navigate(-1);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#F9F7F4", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <header
        className="h-14 shrink-0 flex items-center justify-between px-6 bg-white"
        style={{ borderBottom: "1px solid #E7DCCD" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> End Consultation
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-semibold text-[#2E1F14]">Mäkinen, Aino</span>
          <span className="text-[14px] text-[#9B8775]">· Consultation · 11:00–11:30</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-[6px] text-[13px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors">
            Save draft
          </button>
          <button
            onClick={onEndConsultation}
            className="h-8 px-4 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#2E1F14" }}
          >
            End Consultation
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* LEFT — Patient context */}
        <aside
          className="w-[280px] shrink-0 overflow-y-auto p-5 space-y-6"
          style={{ borderRight: "1px solid #E7DCCD" }}
        >
          <SectionLabel>Patient Context</SectionLabel>

          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Health Dimensions</div>
            <div>
              {DIMENSIONS.map((d, i) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between h-7"
                  style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
                >
                  <span className="text-[11px] text-[#9B8775]">{d.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: TONE_COLOR[d.tone] }}>
                      {d.score.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: TONE_COLOR[d.tone] }}>
                      {d.band}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <button
              onClick={() => setMedsOpen((v) => !v)}
              className="w-full flex items-center justify-between mb-2"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775]">Medications</span>
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-medium text-[#6E5A48]"
                  style={{ background: "#F0EBE4", padding: "0 5px" }}
                >
                  {MEDICATIONS.length}
                </span>
              </div>
              {medsOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#9B8775]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#9B8775]" />
              )}
            </button>
            {medsOpen && (
              <div className="space-y-1">
                {MEDICATIONS.map((m) => (
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
            <div className="flex flex-wrap gap-2">
              {ALLERGIES.map((a) => (
                <div key={a} className="inline-flex items-center gap-1.5 text-[12px] text-[#1F1611]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#E8446A" }} />
                  {a}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Last Visit</div>
            <button className="text-[12px] text-[#6E5A48] hover:text-[#2E1F14] text-left transition-colors">
              10 Jun 2026 · Cardiovascular & Liver Review
            </button>
          </section>
        </aside>

        {/* CENTRE */}
        <main className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
          <div className="max-w-[820px] mx-auto">
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775]">Consultation Note</div>
              <div className="text-[12px] text-[#9B8775] mt-0.5">
                Mäkinen, Aino · Tue 17 Jun 2026 · 11:00
              </div>
            </div>

            <div className="space-y-2">
              <Card>
                <SectionLabel>Subjective</SectionLabel>
                <AutoTextarea placeholder="What does the patient report? Symptoms, concerns, changes since last visit..." />
              </Card>

              <Card>
                <SectionLabel>Objective</SectionLabel>
                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-1">
                  <div className="inline-flex items-baseline gap-1.5 text-[13px] text-[#6E5A48]">
                    <span className="uppercase tracking-wide text-[11px] text-[#9B8775]">BP</span>
                    <input
                      className="w-12 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
                      style={{ borderBottom: "1px solid #E7DCCD" }}
                    />
                    <span className="text-[#9B8775]">/</span>
                    <input
                      className="w-12 text-center bg-transparent outline-none text-[14px] text-[#1F1611] py-0.5"
                      style={{ borderBottom: "1px solid #E7DCCD" }}
                    />
                    <span className="text-[11px] text-[#9B8775]">mmHg</span>
                  </div>
                  <VitalInput label="HR" suffix="bpm" />
                  <VitalInput label="Weight" suffix="kg" />
                  <VitalInput label="Temp" suffix="°C" />
                </div>
                <div className="mt-3">
                  <AutoTextarea
                    placeholder="Note any lab values discussed or physical findings..."
                    minHeight={60}
                  />
                </div>
              </Card>

              <Card>
                <SectionLabel>Assessment</SectionLabel>
                <p className="text-[12px] italic text-[#9B8775]">
                  Select the health dimensions relevant to this visit, then add your findings for each.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_DIMENSIONS.map((d) => {
                    const active = !!findings[d];
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDim(d)}
                        className="rounded-full text-[11px] font-medium"
                        style={{
                          padding: "4px 10px",
                          background: active ? "#2E1F14" : "#F5F0EA",
                          color: active ? "#FFFFFF" : "#9B8775",
                          border: active ? "1px solid #2E1F14" : "1px solid #E7DCCD",
                          transition: "background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                {selectedDims.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {selectedDims.map((d) => (
                      <FindingBlock
                        key={d}
                        dimension={d}
                        finding={findings[d]}
                        pendingRemoval={pendingRemove === d}
                        onChange={(text) => updateFinding(d, { text })}
                        onFlag={(flagged) => updateFinding(d, { flagged })}
                        onRequestRemove={() => {
                          if (findings[d].text.trim()) setPendingRemove(d);
                          else removeDim(d);
                        }}
                        onConfirmRemove={() => removeDim(d)}
                        onCancelRemove={() => setPendingRemove(null)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {showValidation && (
                <div
                  className="text-[12px] animate-fade-in px-1"
                  style={{ color: "#D97706" }}
                >
                  No dimensions tagged yet — findings won't be linked to the health overview.
                </div>
              )}

              <Card>
                <SectionLabel>Plan</SectionLabel>
                <AutoTextarea placeholder="Overall plan, patient instructions, follow-up..." />
                <div className="flex flex-wrap gap-2 mt-2">
                  <GhostButton>+ Add task</GhostButton>
                  <GhostButton>+ Referral</GhostButton>
                  <GhostButton>+ Lab order</GhostButton>
                  <GhostButton>+ Follow-up</GhostButton>
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* RIGHT */}
        <aside
          className="w-[320px] shrink-0 overflow-y-auto p-5 space-y-5"
          style={{ borderLeft: "1px solid #E7DCCD" }}
        >
          <div>
            <SectionLabel>Actions</SectionLabel>
            <p className="text-[12px] text-[#9B8775] mt-1">Tasks and actions from this consultation</p>
          </div>

          {/* Dimensions tagged — live */}
          <section className="space-y-2">
            <SectionLabel>Dimensions Tagged</SectionLabel>
            {selectedDims.length === 0 ? (
              <div
                className="rounded-[8px] flex flex-col items-center justify-center text-center py-6 px-4"
                style={{ border: "1px dashed #E7DCCD", background: "#FFFFFF" }}
              >
                <ClipboardList className="h-7 w-7 mb-2" style={{ color: "#E7DCCD" }} />
                <p className="text-[12px] text-[#9B8775]">
                  Tag dimensions in the Assessment to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDims.map((d) => {
                  const f = findings[d];
                  return (
                    <div
                      key={d}
                      className="rounded-[8px] p-3 bg-white animate-fade-in"
                      style={{ border: "1px solid #E7DCCD" }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: f.flagged ? "#E8446A" : "#C9BBA9" }}
                          />
                          <span className="text-[12px] font-medium text-[#2E1F14] truncate">{d}</span>
                        </div>
                        {f.flagged && (
                          <span
                            className="text-[10px] font-medium uppercase tracking-wide shrink-0"
                            style={{ color: "#E8446A" }}
                          >
                            Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#6E5A48] truncate">
                        {f.text.trim() ? f.text : <span className="italic text-[#C9BBA9]">No findings yet</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <SectionLabel>Tasks to Create</SectionLabel>
            <GhostButton className="w-full">+ Add task manually</GhostButton>
          </section>

          <section className="space-y-2">
            <SectionLabel>Referrals</SectionLabel>
            <GhostButton className="w-full">+ Initiate referral</GhostButton>
          </section>

          <section className="space-y-2">
            <SectionLabel>Follow-up Visit</SectionLabel>
            <GhostButton className="w-full">+ Schedule follow-up</GhostButton>
          </section>
        </aside>
      </div>
    </div>
  );
}
