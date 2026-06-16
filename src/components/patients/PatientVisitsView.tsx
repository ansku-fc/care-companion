import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Plus, Video, MapPin, Stethoscope } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { NewVisitDialog } from "./visits/NewVisitDialog";
import { isCarter } from "@/lib/patientClinicalData";

interface Props {
  patient: Tables<"patients">;
  appointments: Tables<"appointments">[];
  visitNotes: Tables<"visit_notes">[];
  onDataChanged: () => void;
}

type DimTone = "rose" | "amber" | "teal" | "neutral";

type LabRow = { name: string; value: string; status: "high" | "stable" | "low" };

type UpcomingVisit = {
  id: string;
  date: string;
  type: "Check-up" | "Consultation";
  title: string;
  withWhom: string;
  location: string;
  mode: "In-Person" | "Remote";
  note: string;
  dimensions: { label: string; tone?: DimTone }[];
  plan: string;
  preparation: string;
  openTasks: string[];
};

type PastVisit = {
  id: string;
  date: string;
  duration: string;
  type: string;
  title: string;
  withWhom: string;
  location: string;
  mode: "In-Person" | "Remote";
  summary: string;
  outcome: string;
  dimensions: { label: string; tone: DimTone }[];
  labs: LabRow[];
  nextSteps: string[];
  tasksCreated: string[];
};

const UPCOMING: UpcomingVisit[] = [
  {
    id: "u1",
    date: "Wed 24 Jun 2026 · 09:00",
    type: "Check-up",
    title: "Cardiovascular & Metabolic Review",
    withWhom: "Dr. Laine",
    location: "Helsinki, Bulevardi",
    mode: "In-Person",
    note: "Review LDL, HbA1c and liver enzymes following dose adjustment. Warfarin INR check included.",
    dimensions: [
      { label: "Cardiovascular Health" },
      { label: "Metabolic Health" },
      { label: "Liver Function" },
    ],
    plan: "Review trended cardio-metabolic markers since March visit. Confirm tolerance of recent Atorvastatin titration. Assess liver enzyme trajectory and decide on continued Warfarin therapy.",
    preparation: "Fasting required (10h). Bring current medication list. INR self-test if available.",
    openTasks: [
      "Order pre-visit labs (lipid panel, HbA1c, ALAT, ASAT, INR)",
      "Confirm appointment with patient 48h prior",
    ],
  },
  {
    id: "u2",
    date: "Thu 10 Sep 2026 · 10:00",
    type: "Check-up",
    title: "Quarterly Lab Draw & Review",
    withWhom: "Nurse Mäkinen",
    location: "Lab system",
    mode: "Remote",
    note: "Fasting labs. Results reviewed async by Dr. Laine within 48h.",
    dimensions: [
      { label: "Metabolic Health" },
      { label: "Cardiovascular Health" },
    ],
    plan: "Quarterly maintenance lab panel. No clinical consultation — results triaged by Dr. Laine and patient notified within 48 hours.",
    preparation: "Fasting required (10h). Lab opens 07:30.",
    openTasks: ["Send lab requisition to patient (1 week prior)"],
  },
  {
    id: "u3",
    date: "Tue 18 Nov 2026 · 09:30",
    type: "Consultation",
    title: "Annual Review — Full Health Assessment",
    withWhom: "Dr. Laine",
    location: "Helsinki, Bulevardi",
    mode: "In-Person",
    note: "Full-year review. All health dimensions assessed. Care plan updated for 2027.",
    dimensions: [{ label: "All dimensions" }],
    plan: "Comprehensive annual review across all nine health dimensions. Update long-term care plan for 2027, including any new screening, lifestyle goals, and medication changes.",
    preparation: "Fasting required. Allow 90 minutes. Bring updated symptom diary and any specialist letters since the last annual review.",
    openTasks: [
      "Compile annual report draft 2 weeks before visit",
      "Schedule pre-visit lab panel for early November",
    ],
  },
];

const PAST: PastVisit[] = [
  {
    id: "p1",
    date: "Wed 10 Jun 2026",
    duration: "45 min",
    type: "Check-up",
    title: "Cardiovascular & Liver Review",
    withWhom: "Dr. Laine",
    location: "Helsinki, Bulevardi",
    mode: "In-Person",
    summary:
      "LDL has risen to 4.9 mmol/l — third consecutive increase. ALAT elevated at 62 U/l, above reference. Warfarin dose held pending gastroenterology referral. HbA1c stable at 57 mmol/mol.",
    outcome: "Gastroenterology referral initiated. Warfarin prescription renewal pending.",
    dimensions: [
      { label: "Cardiovascular Health", tone: "rose" },
      { label: "Metabolic Health", tone: "amber" },
      { label: "Digestion / Liver", tone: "rose" },
    ],
    labs: [
      { name: "LDL", value: "4.9 mmol/l", status: "high" },
      { name: "ALAT", value: "62 U/l", status: "high" },
      { name: "HbA1c", value: "57 mmol/mol", status: "stable" },
    ],
    nextSteps: [
      "Follow-up consultation scheduled for 24 Jun 2026",
      "Gastroenterology specialist appointment to be booked within 2 weeks",
    ],
    tasksCreated: [
      "Initiate gastroenterology referral",
      "Hold Warfarin renewal pending specialist input",
      "Re-check ALAT in 4 weeks",
    ],
  },
  {
    id: "p2",
    date: "Mon 10 Mar 2026",
    duration: "30 min",
    type: "Consultation · Remote",
    title: "Medication Review & Diabetes Follow-up",
    withWhom: "Dr. Laine",
    location: "Video call",
    mode: "Remote",
    summary:
      "HbA1c improved from 59 to 57 mmol/mol following Metformin dose increase. Blood pressure well-controlled on Lisinopril 10mg. Patient reports fatigue in mornings — sleep hygiene discussed.",
    outcome: "Metformin dose maintained. Sleep diary recommended. Follow-up in 3 months.",
    dimensions: [
      { label: "Metabolic Health", tone: "amber" },
      { label: "Cardiovascular Health", tone: "teal" },
      { label: "Brain & Mental Health", tone: "amber" },
    ],
    labs: [
      { name: "HbA1c", value: "57 mmol/mol", status: "stable" },
      { name: "Blood pressure", value: "128/82 mmHg", status: "stable" },
    ],
    nextSteps: ["Follow-up review scheduled for 10 Jun 2026"],
    tasksCreated: [
      "Send patient sleep diary template",
      "Continue Metformin 500mg twice daily",
    ],
  },
  {
    id: "p3",
    date: "Thu 14 Nov 2025",
    duration: "60 min",
    type: "Check-up · In-Person",
    title: "Quarterly Labs & Annual Plan Review",
    withWhom: "Dr. Laine",
    location: "Helsinki, Bulevardi",
    mode: "In-Person",
    summary:
      "Full lab panel drawn. LDL 4.0 mmol/l — within target on Atorvastatin. Waist circumference 102cm, BMI 29.9 — lifestyle goals reviewed. No new symptoms. Patient satisfied with care plan.",
    outcome: "Care plan confirmed for Q1 2026. Next full review scheduled June 2026.",
    dimensions: [
      { label: "Cardiovascular Health", tone: "teal" },
      { label: "Metabolic Health", tone: "amber" },
      { label: "Cancer Risk", tone: "teal" },
    ],
    labs: [
      { name: "LDL", value: "4.0 mmol/l", status: "stable" },
      { name: "HbA1c", value: "59 mmol/mol", status: "high" },
      { name: "BMI", value: "29.9", status: "high" },
    ],
    nextSteps: ["Quarterly check-up scheduled for March 2026"],
    tasksCreated: ["Share updated lifestyle plan with patient"],
  },
  {
    id: "p4",
    date: "Fri 23 Aug 2025",
    duration: "15 min",
    type: "Consultation · Remote",
    title: "Warfarin Monitoring & INR Check",
    withWhom: "Nurse Mäkinen",
    location: "Phone",
    mode: "Remote",
    summary:
      "INR 2.4 — within therapeutic range. Patient reports occasional bruising, noted and monitored. No dietary changes affecting levels.",
    outcome: "Warfarin dose unchanged. Next INR check in 3 months.",
    dimensions: [{ label: "Cardiovascular Health", tone: "teal" }],
    labs: [{ name: "INR", value: "2.4", status: "stable" }],
    nextSteps: ["INR re-check scheduled for November 2025"],
    tasksCreated: ["Reminder to patient: log any new bruising"],
  },
];

const TONE_STYLES: Record<DimTone, { bg: string; fg: string }> = {
  rose: { bg: "#FBE4EA", fg: "#E8446A" },
  amber: { bg: "#FEF3C7", fg: "#D97706" },
  teal: { bg: "#E6F4F3", fg: "#0EA5A0" },
  neutral: { bg: "#F5F0EA", fg: "#6E5A48" },
};

function TypeChip({ type }: { type: string }) {
  const isConsult = /consultation/i.test(type);
  const bg = isConsult ? "#FEF3C7" : "#F5F0EA";
  const fg = isConsult ? "#92400E" : "#6E5A48";
  return (
    <span
      className="inline-flex items-center rounded-[4px] text-[11px] font-medium shrink-0"
      style={{ background: bg, color: fg, padding: "2px 6px" }}
    >
      {type}
    </span>
  );
}

function DimPill({ label, tone = "neutral", asLink = false }: { label: string; tone?: DimTone; asLink?: boolean }) {
  const s = TONE_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full text-[11px] font-medium ${asLink ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      style={{ background: s.bg, color: s.fg, padding: "2px 8px" }}
    >
      {label}
    </span>
  );
}

function ClickableCard({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-[12px] cursor-pointer transition-colors hover:bg-[#F9F7F4] hover:[border-color:#C9BBA9]"
      style={{ border: "1px solid #E7DCCD", padding: "20px" }}
    >
      <ArrowRight
        className="absolute top-4 right-4 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "#C9BBA9" }}
      />
      {children}
    </div>
  );
}

function UpcomingCard({ v, onOpen }: { v: UpcomingVisit; onOpen: () => void }) {
  return (
    <ClickableCard onClick={onOpen}>
      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="min-w-0">
          <div className="text-[14px] text-[#6E5A48] mb-1.5">{v.date}</div>
          <div className="text-[16px] font-medium text-[#2E1F14]">{v.title}</div>
        </div>
        <TypeChip type={v.type} />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[13px] text-[#6E5A48] flex-wrap">
        <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> {v.withWhom}</span>
        <span className="flex items-center gap-1">
          {v.mode === "Remote" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
          {v.location} · {v.mode}
        </span>
      </div>
      <p className="mt-3 text-[14px] text-[#6E5A48] leading-relaxed">{v.note}</p>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {v.dimensions.map((d) => <DimPill key={d.label} label={d.label} tone={d.tone} />)}
      </div>
    </ClickableCard>
  );
}

function PastCard({ v, onOpen }: { v: PastVisit; onOpen: () => void }) {
  return (
    <ClickableCard onClick={onOpen}>
      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="min-w-0">
          <div className="text-[14px] text-[#6E5A48] mb-1.5">{v.date}</div>
          <div className="text-[16px] font-medium text-[#2E1F14]">{v.title}</div>
        </div>
        <TypeChip type={v.type} />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[13px] text-[#6E5A48]">
        <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> {v.withWhom}</span>
      </div>
      <p className="mt-3 text-[14px] text-[#6E5A48] leading-relaxed">{v.summary}</p>
      <p className="mt-2 text-[14px] text-[#2E1F14]">
        <span className="text-[11px] uppercase tracking-wide text-[#6E5A48] mr-2">Outcome</span>
        {v.outcome}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {v.dimensions.map((d) => <DimPill key={d.label} label={d.label} tone={d.tone} />)}
      </div>
    </ClickableCard>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6E5A48] mb-2">{label}</div>
      <div className="text-[14px] text-[#2E1F14] leading-relaxed">{children}</div>
    </section>
  );
}

function LabStatusBadge({ status }: { status: LabRow["status"] }) {
  if (status === "high") return <span className="text-[#E8446A] text-[12px]">↑ High</span>;
  if (status === "low") return <span className="text-[#D97706] text-[12px]">↓ Low</span>;
  return <span className="text-[#0EA5A0] text-[12px]">→ Stable</span>;
}

function PastDetailView({ v, onBack }: { v: PastVisit; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Visits
      </button>

      <div className="bg-white rounded-[12px]" style={{ border: "1px solid #E7DCCD", padding: "24px" }}>
        <div className="flex items-center gap-2 text-[12px] text-[#6E5A48] mb-2">
          <TypeChip type={v.type} />
          <span>·</span>
          <span>{v.date}</span>
          <span>·</span>
          <span>{v.duration}</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#2E1F14] mb-1">{v.title}</h2>
        <div className="text-[13px] text-[#6E5A48]">
          {v.withWhom} · {v.location} · {v.mode}
        </div>
      </div>

      <div className="bg-white rounded-[12px] space-y-5" style={{ border: "1px solid #E7DCCD", padding: "24px" }}>
        <Section label="Clinical notes">{v.summary}</Section>
        <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
        <Section label="Outcome & actions">{v.outcome}</Section>
        <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
        <Section label="Health dimensions affected">
          <div className="flex flex-wrap gap-1.5">
            {v.dimensions.map((d) => <DimPill key={d.label} label={d.label} tone={d.tone} asLink />)}
          </div>
        </Section>
        {v.labs.length > 0 && (
          <>
            <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
            <Section label="Lab results reviewed">
              <div className="space-y-1.5">
                {v.labs.map((l) => (
                  <div key={l.name} className="flex items-center justify-between text-[14px]">
                    <span className="text-[#2E1F14]">{l.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#6E5A48] tabular-nums">{l.value}</span>
                      <LabStatusBadge status={l.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
        <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
        <Section label="Next steps">
          <ul className="space-y-1 list-disc pl-4">
            {v.nextSteps.map((s) => <li key={s}>{s}</li>)}
            {v.tasksCreated.map((s) => <li key={s} className="text-[#6E5A48]">{s}</li>)}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function UpcomingDetailView({ v, onBack }: { v: UpcomingVisit; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Visits
      </button>

      <div className="bg-white rounded-[12px]" style={{ border: "1px solid #E7DCCD", padding: "24px" }}>
        <div className="flex items-center gap-2 text-[12px] text-[#6E5A48] mb-2">
          <TypeChip type={v.type} />
          <span>·</span>
          <span>{v.date}</span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#2E1F14] mb-1">{v.title}</h2>
        <div className="text-[13px] text-[#6E5A48]">
          {v.withWhom} · {v.location} · {v.mode}
        </div>
      </div>

      <div className="bg-white rounded-[12px] space-y-5" style={{ border: "1px solid #E7DCCD", padding: "24px" }}>
        <Section label="Visit plan">{v.plan}</Section>
        <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
        <Section label="Preparation notes">{v.preparation}</Section>
        <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
        <Section label="Health dimensions to review">
          <div className="flex flex-wrap gap-1.5">
            {v.dimensions.map((d) => <DimPill key={d.label} label={d.label} tone={d.tone} asLink />)}
          </div>
        </Section>
        <div className="border-t" style={{ borderColor: "#F0EBE4" }} />
        <Section label="Open tasks related to this visit">
          <ul className="space-y-1 list-disc pl-4">
            {v.openTasks.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </Section>
      </div>
    </div>
  );
}

export function PatientVisitsView({ patient, onDataChanged }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [openUpcoming, setOpenUpcoming] = useState<UpcomingVisit | null>(null);
  const [openPast, setOpenPast] = useState<PastVisit | null>(null);
  const showDemo = isCarter(patient.id, patient.full_name);

  if (openUpcoming) return <UpcomingDetailView v={openUpcoming} onBack={() => setOpenUpcoming(null)} />;
  if (openPast) return <PastDetailView v={openPast} onBack={() => setOpenPast(null)} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#2E1F14]">Visits</h2>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Visit
        </Button>
      </div>

      {showDemo ? (
        <>
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[16px] font-semibold text-[#2E1F14]">Upcoming Visits</h3>
                <span className="text-[12px] text-[#6E5A48]">{UPCOMING.length}</span>
              </div>
              <span className="text-[11px] uppercase tracking-wide text-[#6E5A48]">Annual Health Plan 2026</span>
            </div>
            <div className="space-y-3">
              {UPCOMING.map((v) => <UpcomingCard key={v.id} v={v} onOpen={() => setOpenUpcoming(v)} />)}
            </div>
          </section>

          <section>
            <div className="flex items-baseline gap-2 mb-3">
              <h3 className="text-[16px] font-semibold text-[#2E1F14]">Visit History</h3>
              <span className="text-[12px] text-[#6E5A48]">{PAST.length}</span>
            </div>
            <div className="space-y-3">
              {PAST.map((v) => <PastCard key={v.id} v={v} onOpen={() => setOpenPast(v)} />)}
            </div>
          </section>
        </>
      ) : (
        <div
          className="bg-white rounded-[12px] flex items-center gap-3 text-[14px] text-[#6E5A48]"
          style={{ border: "1px solid #E7DCCD", padding: "20px" }}
        >
          <Calendar className="h-4 w-4" />
          No visits yet.
        </div>
      )}

      <NewVisitDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        patientId={patient.id}
        patientName={patient.full_name}
        onCreated={onDataChanged}
      />
    </div>
  );
}
