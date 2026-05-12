import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ZoomIn, ZoomOut, Printer, Save, X, Upload, FileText, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceArea, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import { dimensionScore as computeDimensionScore } from "@/lib/dimensionScores";
import { scoreTone } from "@/lib/scoreColor";
import { cn } from "@/lib/utils";
import coverBg from "@/assets/report-cover-bg.jpg";
import logoFull from "@/assets/foundation-clinic-logo.png";
import logoIcon from "@/assets/foundation-clinic-icon.png";
import { getRiskFactorsForDimension } from "@/lib/reportRiskFactors";

// ─────────────────────────────────────────────────────────────────────────────
// Lab marker definitions per dimension (id → patient_lab_results column)
// ─────────────────────────────────────────────────────────────────────────────

type Marker = {
  key: string;
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  optLow?: number;
  optHigh?: number;
};

const DIMENSION_MARKERS: Record<string, Marker[]> = {
  cardiovascular: [
    { key: "ldl_mmol_l", label: "LDL", unit: "mmol/L", refLow: 0, refHigh: 3.0, optLow: 0, optHigh: 2.6 },
    { key: "blood_pressure_systolic", label: "BP Systolic", unit: "mmHg", refLow: 90, refHigh: 140, optLow: 100, optHigh: 120 },
    { key: "blood_pressure_diastolic", label: "BP Diastolic", unit: "mmHg", refLow: 60, refHigh: 90, optLow: 65, optHigh: 80 },
    { key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refLow: 0, refHigh: 42, optLow: 0, optHigh: 36 },
  ],
  metabolic: [
    { key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refLow: 0, refHigh: 42, optLow: 0, optHigh: 36 },
    { key: "free_t4_pmol_l", label: "Free T4", unit: "pmol/L", refLow: 12, refHigh: 22 },
    { key: "tsh_mu_l", label: "TSH", unit: "mU/L", refLow: 0.4, refHigh: 4.0 },
    { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refLow: 60 },
    { key: "creatinine_umol_l", label: "Creatinine", unit: "µmol/L", refLow: 45, refHigh: 110 },
  ],
  brain_mental: [],
  exercise_functional: [],
  digestion: [
    { key: "alat_u_l", label: "ALAT", unit: "U/L", refLow: 0, refHigh: 50 },
    { key: "gt_u_l", label: "GT", unit: "U/L", refLow: 0, refHigh: 60 },
    { key: "afos_alp_u_l", label: "ALP", unit: "U/L", refLow: 35, refHigh: 105 },
    { key: "alat_asat_ratio", label: "ALAT/ASAT", unit: "" },
  ],
  respiratory_immune: [
    { key: "fev1_percent", label: "FEV1", unit: "%", refLow: 80 },
    { key: "fvc_percent", label: "FVC", unit: "%", refLow: 80 },
    { key: "pef_percent", label: "PEF", unit: "%", refLow: 80 },
  ],
  cancer_risk: [],
  skin_oral_mucosal: [],
  reproductive_sexual: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Risk factor extraction per dimension (from onboarding)
// ─────────────────────────────────────────────────────────────────────────────

// Risk factor extraction is now provided by getRiskFactorsForDimension
// in src/lib/reportRiskFactors.ts (see PART 1 of the spec).

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSIONS = HEALTH_TAXONOMY.map((d) => ({ key: d.key, label: d.label }));
const A4_W = 794;
const A4_H = 1123;
const RISK_LABEL = (s: number) => (s < 4 ? "LOW" : s < 7 ? "MEDIUM" : "HIGH");
const TONE_HEX = (t: ReturnType<typeof scoreTone>) =>
  t === "green" ? "#0EA5A0" : t === "amber" ? "#D97706" : t === "red" ? "#E8446A" : "#9CA3AF";

type PageId = string; // "cover" | "overview" | "objectives" | dim.key | "annual"

interface DimState {
  index: number;
  showRisk: boolean;
  riskFactors: string;
  selectedMarkers: string[];
  showRefIntervals: boolean;
  showOptIntervals: boolean;
  summary: string;
  recommendations: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PatientReportEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [onboarding, setOnboarding] = useState<Tables<"patient_onboarding"> | null>(null);
  const [labResults, setLabResults] = useState<Tables<"patient_lab_results">[]>([]);
  const [healthCategories, setHealthCategories] = useState<Tables<"patient_health_categories">[]>([]);
  const [allergies, setAllergies] = useState<Tables<"patient_allergies">[]>([]);
  const [familyHistory, setFamilyHistory] = useState<Tables<"patient_family_history">[]>([]);
  const [moles, setMoles] = useState<Tables<"patient_moles">[]>([]);

  const [zoom, setZoom] = useState(0.7);
  const [activePage, setActivePage] = useState<PageId>("cover");
  const [saving, setSaving] = useState(false);

  // Editable cover/global state
  const [reportTitle, setReportTitle] = useState("Health Report");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("Foundation Clinic Finland");
  const [language, setLanguage] = useState<"en" | "fi" | "sv">("en");
  const [objectives, setObjectives] = useState("");
  const [annualPlan, setAnnualPlan] = useState("");

  // Per-dimension state
  const [dimState, setDimState] = useState<Record<string, DimState>>({});

  const pagesScrollRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ─── Load data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [pRes, obRes, lrRes, hcRes, alRes, fhRes, mRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase.from("patient_onboarding").select("*").eq("patient_id", id).maybeSingle(),
        supabase.from("patient_lab_results").select("*").eq("patient_id", id).order("result_date", { ascending: false }),
        supabase.from("patient_health_categories").select("*").eq("patient_id", id),
        supabase.from("patient_allergies").select("*").eq("patient_id", id).eq("status", "active"),
        supabase.from("patient_family_history").select("*").eq("patient_id", id),
        supabase.from("patient_moles").select("*").eq("patient_id", id),
      ]);
      if (cancelled) return;
      if (pRes.data) setPatient(pRes.data);
      setOnboarding(obRes.data ?? null);
      setLabResults(lrRes.data ?? []);
      setHealthCategories(hcRes.data ?? []);
      setAllergies(alRes.data ?? []);
      setFamilyHistory(fhRes.data ?? []);
      setMoles(mRes.data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Doctor name from logged-in profile
  useEffect(() => {
    if (profile?.full_name) {
      const n = profile.full_name.trim();
      setDoctorName(n.startsWith("Dr.") ? n : `Dr. ${n}`);
    }
  }, [profile]);

  // Initialize per-dimension state once data is loaded
  useEffect(() => {
    if (!patient) return;
    const ctx = { patientId: patient.id, onboarding, labResults, healthCategories };
    const next: Record<string, DimState> = {};
    DIMENSIONS.forEach((d) => {
      const score = computeDimensionScore(d.key, ctx);
      const cat = healthCategories.find((h) => h.category.toLowerCase() === d.label.toLowerCase());
      const allMarkers = (DIMENSION_MARKERS[d.key] ?? []).map((m) => m.key);
      next[d.key] = {
        index: score,
        showRisk: true,
        riskFactors: getRiskFactorsForDimension({ onboarding, allergies, familyHistory, moles, patient }, d.key).map((s) => `• ${s}`).join("\n"),
        selectedMarkers: allMarkers,
        showRefIntervals: true,
        showOptIntervals: false,
        summary: cat?.summary ?? "",
        recommendations: cat?.recommendations ?? "",
      };
    });
    setDimState(next);
    setObjectives(patient.health_summary ?? "");
    setAnnualPlan(patient.health_recommendations ?? "");
  }, [patient, onboarding, labResults, healthCategories]);

  // ─── Page list ─────────────────────────────────────────────────────────
  const pageList = useMemo(() => {
    const dims = DIMENSIONS.filter((d) => {
      // Only include dimensions that have data
      const ds = dimState[d.key];
      if (!ds) return false;
      const hasMarkers = (DIMENSION_MARKERS[d.key] ?? []).some((m) =>
        labResults.some((l) => (l as any)[m.key] != null),
      );
      return hasMarkers || ds.summary || ds.recommendations || ds.riskFactors;
    });
    return [
      { id: "cover", label: "Cover", color: "#1f2937" },
      { id: "overview", label: "Health Overview", color: "#3b82f6" },
      { id: "objectives", label: "Your Objectives", color: "#8b5cf6" },
      ...dims.map((d) => {
        const s = dimState[d.key]?.index ?? 0;
        return { id: d.key, label: d.label, color: TONE_HEX(scoreTone(s)) };
      }),
      { id: "annual", label: "Annual Plan", color: "#10b981" },
    ];
  }, [dimState, labResults]);

  const scrollToPage = (pid: PageId) => {
    const el = pagesScrollRef.current?.querySelector(`[data-page="${pid}"]`) as HTMLElement | null;
    if (el && pagesScrollRef.current) {
      pagesScrollRef.current.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
    }
    setActivePage(pid);
  };

  // ─── Save ──────────────────────────────────────────────────────────────
  const handlePublish = async (exit = false) => {
    if (!user || !patient) return;
    setSaving(true);
    const { error } = await supabase.from("health_reports").insert({
      patient_id: patient.id,
      created_by: user.id,
      title: `${reportTitle} — ${patient.full_name}`,
      status: "published",
      overview_summary: objectives,
      overview_recommendations: annualPlan,
      dimension_texts: { ...dimState, __cover: { reportTitle, reportDate, doctorName, clinicName, language } } as any,
    } as any);
    setSaving(false);
    if (error) { toast.error("Failed to save report"); return; }
    toast.success(exit ? "Report saved" : "Report published");
    if (exit) navigate(`/patients/${patient.id}`);
  };

  // ─── Print ─────────────────────────────────────────────────────────────
  const handlePreviewPdf = () => {
    const style = document.createElement("style");
    style.id = "report-print-style";
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #report-print-area, #report-print-area * { visibility: visible !important; }
        #report-print-area {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important;
          background: #fff !important;
          transform: none !important;
        }
        #report-print-area [data-page] {
          page-break-after: always !important;
          box-shadow: none !important;
          margin: 0 !important;
          border-radius: 0 !important;
        }
        #report-print-area [data-page]:last-child { page-break-after: auto !important; }
        @page { size: A4; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    const cleanup = () => {
      const el = document.getElementById("report-print-style");
      if (el) el.remove();
      window.onafterprint = null;
    };
    window.onafterprint = cleanup;
    window.print();
    setTimeout(cleanup, 2000);
  };

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading || !patient) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex items-center justify-center text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const formattedDate = new Date(reportDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const ds = dimState[activePage];
  const isDimensionPage = !!ds && DIMENSIONS.some((d) => d.key === activePage);

  return (
    <div className="fixed inset-0 z-50 bg-[#2a2a2a] flex flex-col text-white">
      {/* TOP BAR */}
      <div className="h-12 shrink-0 flex items-center justify-between px-4 bg-[#1a1a1a] border-b border-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4 text-white/70" />
          <h1 className="text-sm font-medium truncate">
            {reportTitle} — {patient.full_name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Select value={String(Math.round(zoom * 100))} onValueChange={(v) => setZoom(Number(v) / 100)}>
              <SelectTrigger className="h-7 w-[68px] bg-transparent border-none text-xs text-white/80 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-white/80 hover:text-white hover:bg-white/10" onClick={handlePreviewPdf}>
            <Printer className="h-3.5 w-3.5" /> Preview PDF
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90" onClick={() => handlePublish(false)} disabled={saving}>
            <Upload className="h-3.5 w-3.5" /> Publish
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white" onClick={() => handlePublish(true)} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> Save & Exit
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => navigate(`/patients/${patient.id}`)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT — page list */}
        <div className="w-[220px] shrink-0 bg-[#1f1f1f] border-r border-black/40 flex flex-col">
          <div className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">Pages</div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-4 space-y-0.5">
              {pageList.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => scrollToPage(p.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs text-left transition-colors",
                    activePage === p.id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90",
                  )}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="truncate">{i + 1}. {p.label}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER — preview */}
        <div ref={pagesScrollRef} className="flex-1 overflow-auto bg-[#3a3a3a]">
          <div
            id="report-print-area"
            ref={printRef}
            className="flex flex-col items-center py-8"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center", minWidth: A4_W }}
          >
            {/* COVER */}
            <CoverPage
              patient={patient}
              title={reportTitle}
              date={formattedDate}
              doctor={doctorName}
              clinic={clinicName}
              onClick={() => setActivePage("cover")}
              active={activePage === "cover"}
            />

            {/* OVERVIEW */}
            <OverviewPage
              patient={patient}
              dimState={dimState}
              onClick={() => setActivePage("overview")}
              active={activePage === "overview"}
            />

            {/* OBJECTIVES */}
            <FreeTextPage
              id="objectives"
              title="Your Objectives"
              subtitle="Personal health goals for the year ahead"
              text={objectives}
              patientName={patient.full_name}
              onClick={() => setActivePage("objectives")}
              active={activePage === "objectives"}
            />

            {/* DIMENSION PAGES */}
            {pageList
              .filter((p) => DIMENSIONS.some((d) => d.key === p.id))
              .map((p) => (
                <DimensionPage
                  key={p.id}
                  dimKey={p.id}
                  dimLabel={p.label}
                  state={dimState[p.id]}
                  labResults={labResults}
                  patientName={patient.full_name}
                  onClick={() => setActivePage(p.id)}
                  active={activePage === p.id}
                />
              ))}

            {/* ANNUAL PLAN */}
            <FreeTextPage
              id="annual"
              title="Annual Plan"
              subtitle="Care timeline & follow-up checklist"
              text={annualPlan}
              patientName={patient.full_name}
              variant="checklist"
              onClick={() => setActivePage("annual")}
              active={activePage === "annual"}
            />
          </div>
        </div>

        {/* RIGHT — editor */}
        <div className="w-[280px] shrink-0 bg-[#1f1f1f] border-l border-black/40 flex flex-col text-white/90">
          <div className="px-4 py-3 border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Edit page
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4 text-xs">
              {activePage === "cover" && (
                <CoverEditor
                  reportTitle={reportTitle} setReportTitle={setReportTitle}
                  patientName={patient.full_name}
                  reportDate={reportDate} setReportDate={setReportDate}
                  doctorName={doctorName} setDoctorName={setDoctorName}
                  clinicName={clinicName} setClinicName={setClinicName}
                  language={language} setLanguage={setLanguage}
                />
              )}
              {activePage === "overview" && (
                <p className="text-white/60 leading-relaxed">
                  Overview is auto-generated from each dimension's index score. Edit individual dimension pages to update risk levels.
                </p>
              )}
              {activePage === "objectives" && (
                <FieldText label="Objectives" value={objectives} onChange={setObjectives} rows={14} placeholder="Write the patient's personal health goals…" />
              )}
              {activePage === "annual" && (
                <FieldText label="Annual care plan" value={annualPlan} onChange={setAnnualPlan} rows={14} placeholder="Describe the annual plan…" />
              )}
              {isDimensionPage && ds && (
                <DimensionEditor
                  dimKey={activePage}
                  state={ds}
                  labResults={labResults}
                  onChange={(patch) => setDimState((prev) => ({ ...prev, [activePage]: { ...prev[activePage], ...patch } }))}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Right-panel editors
// ─────────────────────────────────────────────────────────────────────────────

function FieldText({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-white/70">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 text-xs resize-none focus-visible:ring-white/30"
      />
    </div>
  );
}

function FieldInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-white/70">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 bg-white/5 border-white/15 text-white placeholder:text-white/30 text-xs focus-visible:ring-white/30"
      />
    </div>
  );
}

function CoverEditor(props: {
  reportTitle: string; setReportTitle: (v: string) => void;
  patientName: string;
  reportDate: string; setReportDate: (v: string) => void;
  doctorName: string; setDoctorName: (v: string) => void;
  clinicName: string; setClinicName: (v: string) => void;
  language: "en" | "fi" | "sv"; setLanguage: (v: "en" | "fi" | "sv") => void;
}) {
  return (
    <div className="space-y-3">
      <FieldInput label="Report title" value={props.reportTitle} onChange={props.setReportTitle} />
      <div className="space-y-1.5">
        <Label className="text-[11px] text-white/70">Patient name</Label>
        <Input value={props.patientName} disabled className="h-8 bg-white/5 border-white/10 text-white/60 text-xs" />
      </div>
      <FieldInput label="Report date" value={props.reportDate} onChange={props.setReportDate} type="date" />
      <FieldInput label="Doctor" value={props.doctorName} onChange={props.setDoctorName} />
      <FieldInput label="Clinic" value={props.clinicName} onChange={props.setClinicName} />
      <div className="space-y-1.5">
        <Label className="text-[11px] text-white/70">Language</Label>
        <Select value={props.language} onValueChange={(v) => props.setLanguage(v as any)}>
          <SelectTrigger className="h-8 bg-white/5 border-white/15 text-white text-xs focus:ring-white/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fi">Finnish</SelectItem>
            <SelectItem value="sv">Swedish</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DimensionEditor({
  dimKey, state, labResults, onChange,
}: {
  dimKey: string;
  state: DimState;
  labResults: Tables<"patient_lab_results">[];
  onChange: (patch: Partial<DimState>) => void;
}) {
  const markers = DIMENSION_MARKERS[dimKey] ?? [];
  const availableMarkers = markers.filter((m) => labResults.some((l) => (l as any)[m.key] != null));

  return (
    <div className="space-y-4">
      <FieldInput
        label="Index value (0–10)"
        value={String(state.index)}
        onChange={(v) => onChange({ index: Math.max(0, Math.min(10, parseFloat(v) || 0)) })}
        type="number"
      />

      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-white/70">Show risk factors</Label>
        <Switch checked={state.showRisk} onCheckedChange={(v) => onChange({ showRisk: v })} />
      </div>

      {state.showRisk && (
        <FieldText label="Risk factors" value={state.riskFactors} onChange={(v) => onChange({ riskFactors: v })} rows={5} />
      )}

      <div className="space-y-1.5">
        <Label className="text-[11px] text-white/70">Graphs to include</Label>
        {availableMarkers.length === 0 ? (
          <p className="text-[11px] text-white/40 italic">No lab data for this dimension</p>
        ) : (
          <div className="space-y-1.5 rounded border border-white/10 p-2 bg-white/5">
            {availableMarkers.map((m) => {
              const checked = state.selectedMarkers.includes(m.key);
              return (
                <label key={m.key} className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      onChange({
                        selectedMarkers: v
                          ? [...state.selectedMarkers, m.key]
                          : state.selectedMarkers.filter((k) => k !== m.key),
                      })
                    }
                    className="border-white/40 data-[state=checked]:bg-primary"
                  />
                  <span>{m.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
          <Checkbox
            checked={state.showRefIntervals}
            onCheckedChange={(v) => onChange({ showRefIntervals: !!v })}
            className="border-white/40 data-[state=checked]:bg-primary"
          />
          Show reference intervals
        </label>
        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
          <Checkbox
            checked={state.showOptIntervals}
            onCheckedChange={(v) => onChange({ showOptIntervals: !!v })}
            className="border-white/40 data-[state=checked]:bg-primary"
          />
          Show optimal intervals
        </label>
      </div>

      <FieldText label="Summary" value={state.summary} onChange={(v) => onChange({ summary: v })} rows={5} placeholder="Doctor's interpretation…" />
      <FieldText label="Recommendations" value={state.recommendations} onChange={(v) => onChange({ recommendations: v })} rows={5} placeholder="Next steps…" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page components (preview)
// ─────────────────────────────────────────────────────────────────────────────

const pageBase: React.CSSProperties = {
  width: A4_W,
  minHeight: A4_H,
  background: "white",
  boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
  marginBottom: 24,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  color: "#1a1a1a",
  position: "relative",
  overflow: "hidden",
};

function PageFrame({ id, active, onClick, children, padding = "60px 64px" }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode; padding?: string }) {
  return (
    <div
      data-page={id}
      onClick={onClick}
      style={{ ...pageBase, padding, outline: active ? "3px solid #3b82f6" : "none", outlineOffset: 2, cursor: "pointer" }}
    >
      {children}
    </div>
  );
}

function PageFooter({ patientName, pageNumber }: { patientName: string; pageNumber?: number }) {
  return (
    <div style={{ position: "absolute", bottom: 24, left: 64, right: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 10, fontSize: 9, color: "#999" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <img src={logoIcon} alt="" style={{ height: 14, width: "auto" }} />
        <span>Foundation Clinic</span>
      </div>
      <span>{patientName} — Health Report</span>
      {pageNumber != null && <span>p. {pageNumber}</span>}
    </div>
  );
}

function CoverPage({
  patient, title, date, doctor, clinic, active, onClick,
}: {
  patient: Tables<"patients">; title: string; date: string; doctor: string; clinic: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <div
      data-page="cover"
      onClick={onClick}
      style={{ ...pageBase, padding: 0, outline: active ? "3px solid #3b82f6" : "none", outlineOffset: 2, cursor: "pointer" }}
    >
      <div style={{ position: "relative", width: "100%", height: A4_H, overflow: "hidden" }}>
        <img src={coverBg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.65) 100%)" }} />

        {/* Top left — clinic logo + name */}
        <div style={{ position: "absolute", top: 40, left: 48, display: "flex", alignItems: "center", gap: 10, color: "white" }}>
          <img src={logoIcon} alt="" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>FOUNDATION CLINIC</span>
        </div>

        {/* Top right — logo mark */}
        <div style={{ position: "absolute", top: 40, right: 48 }}>
          <img src={logoIcon} alt="" style={{ height: 32, filter: "brightness(0) invert(1)", opacity: 0.85 }} />
        </div>

        {/* Bottom left — title block */}
        <div style={{ position: "absolute", bottom: 56, left: 48, right: 48, color: "white" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.85, marginBottom: 14, textTransform: "uppercase" }}>{title}</div>
          <h1 style={{ fontSize: 42, fontWeight: 300, lineHeight: 1.1, margin: 0, marginBottom: 24 }}>{patient.full_name}</h1>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.7 }}>
            <div>{date}</div>
            <div>{doctor}</div>
            <div>{clinic}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewPage({
  patient, dimState, active, onClick,
}: {
  patient: Tables<"patients">; dimState: Record<string, DimState>;
  active: boolean; onClick: () => void;
}) {
  return (
    <PageFrame id="overview" active={active} onClick={onClick}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 4 }}>Health Overview</h2>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 28 }}>
        Summary of {patient.full_name}'s health across nine clinical dimensions.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {DIMENSIONS.map((d) => {
          const s = dimState[d.key]?.index ?? 0;
          const tone = scoreTone(s);
          const color = TONE_HEX(tone);
          const risk = RISK_LABEL(s);
          return (
            <div key={d.key} style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 16, background: "#fafafa", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderTopLeftRadius: 10, borderTopRightRadius: 10 }} />
              <div style={{ fontSize: 11, color: "#444", fontWeight: 500, marginTop: 6, marginBottom: 14, lineHeight: 1.3, minHeight: 28 }}>{d.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color }}>{s.toFixed(1)}</span>
                <span style={{ fontSize: 10, color: "#888" }}>/ 10</span>
              </div>
              <div style={{ marginTop: 6, display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, background: `${color}22`, color }}>
                {risk}
              </div>
            </div>
          );
        })}
      </div>

      <PageFooter patientName={patient.full_name} pageNumber={2} />
    </PageFrame>
  );
}

function FreeTextPage({
  id, title, subtitle, text, patientName, variant, active, onClick,
}: {
  id: string; title: string; subtitle: string; text: string; patientName: string;
  variant?: "checklist"; active: boolean; onClick: () => void;
}) {
  const lines = text.split(/\n+/).filter(Boolean);
  return (
    <PageFrame id={id} active={active} onClick={onClick}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 28 }}>{subtitle}</p>

      {variant === "checklist" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lines.length === 0 ? (
            <p style={{ fontSize: 12, color: "#bbb", fontStyle: "italic" }}>Use the right panel to write the annual plan.</p>
          ) : (
            lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", border: "1px solid #e5e5e5", borderRadius: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid #d0d0d0", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.5 }}>{l}</span>
              </div>
            ))
          )}
        </div>
      ) : lines.length === 0 ? (
        <p style={{ fontSize: 12, color: "#bbb", fontStyle: "italic" }}>Use the right panel to write objectives.</p>
      ) : (
        <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#1a1a1a" }}>{text}</div>
      )}

      <PageFooter patientName={patientName} />
    </PageFrame>
  );
}

function DimensionPage({
  dimKey, dimLabel, state, labResults, patientName, active, onClick,
}: {
  dimKey: string; dimLabel: string; state?: DimState;
  labResults: Tables<"patient_lab_results">[]; patientName: string;
  active: boolean; onClick: () => void;
}) {
  if (!state) return null;
  const tone = scoreTone(state.index);
  const color = TONE_HEX(tone);
  const allMarkers = DIMENSION_MARKERS[dimKey] ?? [];
  const selected = allMarkers.filter((m) => state.selectedMarkers.includes(m.key));

  // Latest values per marker
  const latestRows = allMarkers.map((m) => {
    const row = labResults.find((l) => (l as any)[m.key] != null);
    return {
      label: m.label,
      value: row ? `${(row as any)[m.key]} ${m.unit}` : "—",
      ref: m.refLow != null || m.refHigh != null ? `${m.refLow ?? ""}–${m.refHigh ?? ""}`.replace(/^–|–$/, "") : "—",
      date: row?.result_date ?? "—",
    };
  }).filter((r) => r.value !== "—");

  return (
    <PageFrame id={dimKey} active={active} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e5e5e5", paddingBottom: 12, marginBottom: 18 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{dimLabel}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, padding: "3px 8px", borderRadius: 10, background: `${color}22`, color }}>
            {RISK_LABEL(state.index)}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color }}>{state.index.toFixed(1)}</span>
            <span style={{ fontSize: 10, color: "#888" }}>/10</span>
          </div>
        </div>
      </div>

      {state.summary && (
        <div style={{ marginBottom: 14, padding: 12, background: "#f8f9fb", borderRadius: 6, borderLeft: `3px solid ${color}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Summary</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{state.summary}</div>
        </div>
      )}
      {state.recommendations && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fffaf5", borderRadius: 6, borderLeft: `3px solid #D97706` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Recommendations</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{state.recommendations}</div>
        </div>
      )}

      {state.showRisk && state.riskFactors && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Risk Factors</div>
          <div style={{ fontSize: 11, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#333" }}>{state.riskFactors}</div>
        </div>
      )}

      {latestRows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Lab Values</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Factor</th>
                <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Value</th>
                <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Reference</th>
                <th style={{ textAlign: "left", padding: "6px 4px", fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {latestRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={{ padding: "6px 4px" }}>{r.label}</td>
                  <td style={{ padding: "6px 4px", fontWeight: 600 }}>{r.value}</td>
                  <td style={{ padding: "6px 4px", color: "#666" }}>{r.ref}</td>
                  <td style={{ padding: "6px 4px", color: "#666" }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {selected.map((m) => (
            <MiniChart
              key={m.key}
              marker={m}
              labResults={labResults}
              showRef={state.showRefIntervals}
              showOpt={state.showOptIntervals}
            />
          ))}
        </div>
      )}

      <PageFooter patientName={patientName} />
    </PageFrame>
  );
}

function MiniChart({ marker, labResults, showRef, showOpt }: { marker: Marker; labResults: Tables<"patient_lab_results">[]; showRef: boolean; showOpt: boolean }) {
  const data = useMemo(() => {
    return [...labResults]
      .filter((l) => (l as any)[marker.key] != null)
      .sort((a, b) => a.result_date.localeCompare(b.result_date))
      .map((l) => ({ date: l.result_date.slice(2, 7), value: Number((l as any)[marker.key]) }));
  }, [labResults, marker.key]);

  if (data.length === 0) return null;

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 10, color: "#444", fontWeight: 600, marginBottom: 2 }}>{marker.label}</div>
      <div style={{ fontSize: 9, color: "#888", marginBottom: 4 }}>{marker.unit}</div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "#888" }} axisLine={false} tickLine={false} width={24} />
            {showRef && marker.refLow != null && marker.refHigh != null && (
              <ReferenceArea y1={marker.refLow} y2={marker.refHigh} fill="#0EA5A0" fillOpacity={0.08} />
            )}
            {showOpt && marker.optLow != null && marker.optHigh != null && (
              <ReferenceArea y1={marker.optLow} y2={marker.optHigh} fill="#0EA5A0" fillOpacity={0.18} />
            )}
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
