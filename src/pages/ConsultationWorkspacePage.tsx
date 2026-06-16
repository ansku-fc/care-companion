import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pill, AlertCircle, ClipboardList, ChevronDown, ChevronRight } from "lucide-react";

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
  minHeight = 80,
}: {
  placeholder: string;
  minHeight?: number;
}) {
  return (
    <textarea
      placeholder={placeholder}
      className="w-full resize-none bg-transparent outline-none text-[14px] font-normal text-[#1F1611] placeholder:text-[#C9BBA9] leading-relaxed"
      style={{ minHeight, border: "none" }}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
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

export default function ConsultationWorkspacePage() {
  const navigate = useNavigate();
  const [medsOpen, setMedsOpen] = useState(false);
  // Acute migraine visit — pre-select Brain & Mental Health
  const [selectedDims, setSelectedDims] = useState<Set<string>>(
    new Set(["Brain & Mental Health"]),
  );

  const toggleDim = (d: string) => {
    setSelectedDims((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#F9F7F4", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
            className="h-8 px-4 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#2E1F14" }}
          >
            End Consultation
          </button>
        </div>
      </header>

      {/* Three columns */}
      <div className="flex-1 min-h-0 flex">
        {/* LEFT — Patient context */}
        <aside
          className="w-[280px] shrink-0 overflow-y-auto p-5 space-y-6"
          style={{ borderRight: "1px solid #E7DCCD" }}
        >
          <SectionLabel>Patient Context</SectionLabel>

          {/* Health dimensions */}
          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Health Dimensions</div>
            <div>
              {DIMENSIONS.map((d, i) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between h-7"
                  style={{
                    borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4",
                  }}
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

          {/* Medications */}
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

          {/* Allergies */}
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

          {/* Last visit */}
          <section>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775] mb-2">Last Visit</div>
            <button className="text-[12px] text-[#6E5A48] hover:text-[#2E1F14] text-left transition-colors">
              10 Jun 2026 · Cardiovascular & Liver Review
            </button>
          </section>
        </aside>

        {/* CENTRE — Consultation workspace */}
        <main className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
          <div className="max-w-[820px] mx-auto">
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#9B8775]">Consultation Note</div>
              <div className="text-[12px] text-[#9B8775] mt-0.5">Mäkinen, Aino · Tue 17 Jun 2026 · 11:00</div>
            </div>

            <div className="space-y-2">
              {/* SUBJECTIVE */}
              <Card>
                <SectionLabel>Subjective</SectionLabel>
                <AutoTextarea placeholder="What does the patient report? Symptoms, concerns, changes since last visit..." />
              </Card>

              {/* OBJECTIVE */}
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

              {/* ASSESSMENT */}
              <Card>
                <SectionLabel>Assessment</SectionLabel>
                <p className="text-[12px] italic text-[#9B8775]">
                  Select the health dimensions relevant to this visit, then add your findings for each.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ALL_DIMENSIONS.map((d) => {
                    const active = selectedDims.has(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDim(d)}
                        className="rounded-full text-[11px] font-medium transition-colors"
                        style={{
                          padding: "4px 10px",
                          background: active ? "#2E1F14" : "#F5F0EA",
                          color: active ? "#FFFFFF" : "#9B8775",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                {selectedDims.size > 0 && (
                  <div className="mt-3 space-y-3">
                    {[...selectedDims].map((d) => (
                      <div key={d}>
                        <div className="text-[12px] font-medium text-[#6E5A48] mb-1">{d}</div>
                        <AutoTextarea
                          placeholder="Findings and clinical interpretation..."
                          minHeight={60}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* PLAN */}
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

        {/* RIGHT — Actions */}
        <aside
          className="w-[320px] shrink-0 overflow-y-auto p-5 space-y-5"
          style={{ borderLeft: "1px solid #E7DCCD" }}
        >
          <div>
            <SectionLabel>Actions</SectionLabel>
            <p className="text-[12px] text-[#9B8775] mt-1">Tasks and actions from this consultation</p>
          </div>

          <div
            className="rounded-[8px] flex flex-col items-center justify-center text-center py-8 px-4"
            style={{ border: "1px dashed #E7DCCD", background: "#FFFFFF" }}
          >
            <ClipboardList className="h-8 w-8 mb-2" style={{ color: "#E7DCCD" }} />
            <p className="text-[12px] text-[#9B8775]">
              Actions added during the consultation will appear here.
            </p>
          </div>

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
