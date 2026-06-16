import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Video, MapPin, Stethoscope } from "lucide-react";
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

type UpcomingVisit = {
  date: string; // display
  type: "Check-up" | "Consultation";
  title: string;
  withWhom: string;
  location: string;
  mode: "In-Person" | "Remote";
  note: string;
  dimensions: string[];
};

type PastVisit = {
  date: string;
  type: string;
  title: string;
  withWhom: string;
  summary: string;
  outcome: string;
  dimensions: { label: string; tone: DimTone }[];
};

const UPCOMING: UpcomingVisit[] = [
  {
    date: "Wed 24 Jun 2026 · 09:00",
    type: "Check-up",
    title: "Cardiovascular & Metabolic Review",
    withWhom: "Dr. Laine",
    location: "Helsinki, Bulevardi",
    mode: "In-Person",
    note: "Review LDL, HbA1c and liver enzymes following dose adjustment. Warfarin INR check included.",
    dimensions: ["Cardiovascular Health", "Metabolic Health", "Liver Function"],
  },
  {
    date: "Thu 10 Sep 2026 · 10:00",
    type: "Check-up",
    title: "Quarterly Lab Draw & Review",
    withWhom: "Nurse Mäkinen",
    location: "Lab system",
    mode: "Remote",
    note: "Fasting labs. Results reviewed async by Dr. Laine within 48h.",
    dimensions: ["Metabolic Health", "Cardiovascular Health"],
  },
  {
    date: "Tue 18 Nov 2026 · 09:30",
    type: "Consultation",
    title: "Annual Review — Full Health Assessment",
    withWhom: "Dr. Laine",
    location: "Helsinki, Bulevardi",
    mode: "In-Person",
    note: "Full-year review. All health dimensions assessed. Care plan updated for 2027.",
    dimensions: ["All dimensions"],
  },
];

const PAST: PastVisit[] = [
  {
    date: "Wed 10 Jun 2026",
    type: "Check-up",
    title: "Cardiovascular & Liver Review",
    withWhom: "Dr. Laine",
    summary:
      "LDL has risen to 4.9 mmol/l — third consecutive increase. ALAT elevated at 62 U/l, above reference. Warfarin dose held pending gastroenterology referral. HbA1c stable at 57 mmol/mol.",
    outcome: "Gastroenterology referral initiated. Warfarin prescription renewal pending.",
    dimensions: [
      { label: "Cardiovascular Health", tone: "rose" },
      { label: "Metabolic Health", tone: "amber" },
      { label: "Digestion / Liver", tone: "rose" },
    ],
  },
  {
    date: "Mon 10 Mar 2026",
    type: "Consultation · Remote",
    title: "Medication Review & Diabetes Follow-up",
    withWhom: "Dr. Laine",
    summary:
      "HbA1c improved from 59 to 57 mmol/mol following Metformin dose increase. Blood pressure well-controlled on Lisinopril 10mg. Patient reports fatigue in mornings — sleep hygiene discussed.",
    outcome: "Metformin dose maintained. Sleep diary recommended. Follow-up in 3 months.",
    dimensions: [
      { label: "Metabolic Health", tone: "amber" },
      { label: "Cardiovascular Health", tone: "teal" },
      { label: "Brain & Mental Health", tone: "amber" },
    ],
  },
  {
    date: "Thu 14 Nov 2025",
    type: "Check-up · In-Person",
    title: "Quarterly Labs & Annual Plan Review",
    withWhom: "Dr. Laine",
    summary:
      "Full lab panel drawn. LDL 4.0 mmol/l — within target on Atorvastatin. Waist circumference 102cm, BMI 29.9 — lifestyle goals reviewed. No new symptoms. Patient satisfied with care plan.",
    outcome: "Care plan confirmed for Q1 2026. Next full review scheduled June 2026.",
    dimensions: [
      { label: "Cardiovascular Health", tone: "teal" },
      { label: "Metabolic Health", tone: "amber" },
      { label: "Cancer Risk", tone: "teal" },
    ],
  },
  {
    date: "Fri 23 Aug 2025",
    type: "Consultation · Remote",
    title: "Warfarin Monitoring & INR Check",
    withWhom: "Nurse Mäkinen",
    summary:
      "INR 2.4 — within therapeutic range. Patient reports occasional bruising, noted and monitored. No dietary changes affecting levels.",
    outcome: "Warfarin dose unchanged. Next INR check in 3 months.",
    dimensions: [{ label: "Cardiovascular Health", tone: "teal" }],
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
      className="inline-flex items-center rounded-[4px] text-[11px] font-medium"
      style={{ background: bg, color: fg, padding: "2px 6px" }}
    >
      {type}
    </span>
  );
}

function DimPill({ label, tone = "neutral" }: { label: string; tone?: DimTone }) {
  const s = TONE_STYLES[tone];
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg, padding: "2px 8px" }}
    >
      {label}
    </span>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[16px] font-semibold text-[#2E1F14]">{label}</h3>
        <span className="text-[12px] text-[#6E5A48]">{count}</span>
      </div>
    </div>
  );
}

function UpcomingCard({ v }: { v: UpcomingVisit }) {
  return (
    <div
      className="bg-white rounded-[12px]"
      style={{ border: "1px solid #E7DCCD", padding: "20px" }}
    >
      <div className="flex items-start justify-between gap-3">
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
        {v.dimensions.map((d) => <DimPill key={d} label={d} />)}
      </div>
    </div>
  );
}

function PastCard({ v }: { v: PastVisit }) {
  return (
    <div
      className="bg-white rounded-[12px]"
      style={{ border: "1px solid #E7DCCD", padding: "20px" }}
    >
      <div className="flex items-start justify-between gap-3">
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
    </div>
  );
}

export function PatientVisitsView({ patient, onDataChanged }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const showDemo = isCarter(patient.id, patient.full_name);

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
              {UPCOMING.map((v, i) => <UpcomingCard key={i} v={v} />)}
            </div>
          </section>

          <section>
            <SectionHeader label="Visit History" count={PAST.length} />
            <div className="space-y-3">
              {PAST.map((v, i) => <PastCard key={i} v={v} />)}
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
