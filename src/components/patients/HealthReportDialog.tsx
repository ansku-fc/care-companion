import { useState, useRef, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, ZoomIn, ZoomOut, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const HEALTH_DIMENSIONS = [
  { key: "senses", label: "Senses" },
  { key: "nervous_system", label: "Nervous System" },
  { key: "physical_performance", label: "Physical Performance" },
  { key: "respiratory", label: "Respiratory" },
  { key: "hormones", label: "Hormones" },
  { key: "skin_mucous", label: "Skin & Mucous" },
  { key: "immunity", label: "Immunity" },
  { key: "nutrition", label: "Nutrition" },
  { key: "liver", label: "Liver" },
  { key: "mental_health", label: "Mental Health" },
  { key: "kidney", label: "Kidney" },
  { key: "substances", label: "Substances" },
  { key: "cardiovascular", label: "Cardiovascular" },
  { key: "cancer_risk", label: "Cancer Risk" },
  { key: "musculoskeletal", label: "Musculoskeletal" },
  { key: "sleep", label: "Sleep" },
];

interface HealthReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  radarData: { category: string; score: number }[];
}

function getRiskFactors(key: string, onboarding: Tables<"patient_onboarding"> | null): { label: string; value: string }[] {
  if (!onboarding) return [];
  const fmt = (v: any) => (v != null && v !== "" ? String(v) : "—");
  const bool = (v: any) => (v ? "Yes" : "No");

  const map: Record<string, () => { label: string; value: string }[]> = {
    senses: () => [
      { label: "Vision Acuity", value: fmt(onboarding.vision_acuity) },
      { label: "Vision Symptoms", value: bool(onboarding.symptom_vision) },
      { label: "Hearing Symptoms", value: bool(onboarding.symptom_hearing) },
      { label: "Smell Symptoms", value: bool(onboarding.symptom_smell) },
      { label: "Previous Illness", value: bool(onboarding.illness_senses) },
    ],
    nervous_system: () => [
      { label: "Neurological Symptoms", value: bool(onboarding.symptom_neurological) },
      { label: "Balance Issues", value: bool(onboarding.symptom_balance) },
      { label: "Previous Brain Damage", value: bool(onboarding.prev_brain_damage) },
      { label: "Genetic Predisposition", value: bool(onboarding.genetic_nervous_system) },
      { label: "Previous Illness", value: bool(onboarding.illness_neurological) },
    ],
    physical_performance: () => [
      { label: "Exercise (MET hrs/week)", value: fmt(onboarding.exercise_met_hours) },
      { label: "Mobility Restriction", value: bool(onboarding.symptom_mobility_restriction) },
      { label: "Joint Pain", value: bool(onboarding.symptom_joint_pain) },
      { label: "BMI", value: fmt(onboarding.bmi) },
    ],
    respiratory: () => [
      { label: "Respiratory Symptoms", value: bool(onboarding.symptom_respiratory) },
      { label: "Sleep Apnoea", value: bool(onboarding.symptom_sleep_apnoea) },
      { label: "Smoking", value: fmt(onboarding.smoking) },
    ],
    hormones: () => [
      { label: "Hormone Illness", value: bool(onboarding.illness_hormone) },
      { label: "Menstruation/Menopause Issues", value: bool(onboarding.symptom_menstruation_menopause) },
    ],
    skin_mucous: () => [
      { label: "Skin Rash", value: bool(onboarding.symptom_skin_rash) },
      { label: "Mucous Membrane Issues", value: bool(onboarding.symptom_mucous_membranes) },
      { label: "Skin Condition Score", value: fmt(onboarding.skin_condition) },
      { label: "Sun Exposure", value: bool(onboarding.sun_exposure) },
    ],
    immunity: () => [
      { label: "Immune/Allergy Symptoms", value: bool(onboarding.symptom_immune_allergies) },
      { label: "Infections/Year", value: fmt(onboarding.infections_per_year) },
      { label: "Immune Illness", value: bool(onboarding.illness_immune) },
    ],
    nutrition: () => [
      { label: "BMI", value: fmt(onboarding.bmi) },
      { label: "Waist Circumference (cm)", value: fmt(onboarding.waist_circumference_cm) },
      { label: "Fruits/Veg (g/day)", value: fmt(onboarding.fruits_vegetables_g_per_day) },
      { label: "Fish (g/day)", value: fmt(onboarding.fish_g_per_day) },
      { label: "Fiber (g/day)", value: fmt(onboarding.fiber_g_per_day) },
      { label: "Red Meat (g/day)", value: fmt(onboarding.red_meat_g_per_day) },
      { label: "Sugar (g/day)", value: fmt(onboarding.sugar_g_per_day) },
      { label: "Sodium (g/day)", value: fmt(onboarding.sodium_g_per_day) },
      { label: "GI Symptoms", value: bool(onboarding.symptom_gastrointestinal) },
    ],
    liver: () => [
      { label: "Liver Illness", value: bool(onboarding.illness_liver) },
      { label: "GI Illness", value: bool(onboarding.illness_gastrointestinal) },
    ],
    mental_health: () => [
      { label: "GAD-7 Score", value: fmt(onboarding.gad7_score) },
      { label: "Perceived Stress", value: fmt(onboarding.stress_perceived) },
      { label: "Job Strain", value: fmt(onboarding.job_strain_perceived) },
      { label: "Social Support", value: fmt(onboarding.social_support_perceived) },
      { label: "Mental Health Illness", value: bool(onboarding.illness_mental_health) },
    ],
    kidney: () => [
      { label: "Kidney Illness", value: bool(onboarding.illness_kidney) },
      { label: "Kidney Function Symptoms", value: bool(onboarding.symptom_kidney_function) },
    ],
    substances: () => [
      { label: "Alcohol (units/week)", value: fmt(onboarding.alcohol_units_per_week) },
      { label: "Smoking", value: fmt(onboarding.smoking) },
      { label: "Other Substances", value: bool(onboarding.other_substances) },
      { label: "Substance Use Score", value: fmt(onboarding.substance_use_perceived) },
    ],
    cardiovascular: () => [
      { label: "Waist-Hip Ratio", value: fmt(onboarding.waist_to_hip_ratio) },
      { label: "Exercise (MET hrs/week)", value: fmt(onboarding.exercise_met_hours) },
      { label: "Smoking", value: fmt(onboarding.smoking) },
      { label: "Genetic Predisposition", value: bool(onboarding.genetic_cardiovascular) },
      { label: "CV Illness", value: bool(onboarding.illness_cardiovascular) },
    ],
    cancer_risk: () => [
      { label: "Previous Cancer", value: bool(onboarding.prev_cancer) },
      { label: "Previous Precancerous", value: bool(onboarding.prev_precancerous) },
      { label: "Genetic Cancer Risk", value: bool(onboarding.genetic_cancer) },
      { label: "Genetic Melanoma Risk", value: bool(onboarding.genetic_melanoma) },
      { label: "Cancer Illness", value: bool(onboarding.illness_cancer) },
      { label: "Colorectal Screening", value: bool(onboarding.cancer_screening_colorectal) },
      { label: "Breast Screening", value: bool(onboarding.cancer_screening_breast) },
      { label: "Cervical Screening", value: bool(onboarding.cancer_screening_cervical) },
    ],
    musculoskeletal: () => [
      { label: "Joint Pain", value: bool(onboarding.symptom_joint_pain) },
      { label: "Mobility Restriction", value: bool(onboarding.symptom_mobility_restriction) },
      { label: "Osteoporotic Fracture", value: bool(onboarding.prev_osteoporotic_fracture) },
      { label: "Musculoskeletal Illness", value: bool(onboarding.illness_musculoskeletal) },
    ],
    sleep: () => [
      { label: "Sleep Hours/Night", value: fmt(onboarding.sleep_hours_per_night) },
      { label: "Sleep Quality", value: fmt(onboarding.sleep_quality) },
      { label: "Deep Sleep %", value: fmt(onboarding.deep_sleep_percent) },
      { label: "Insomnia", value: bool(onboarding.insomnia) },
      { label: "Sleep Apnoea", value: bool(onboarding.symptom_sleep_apnoea) },
    ],
  };
  return map[key]?.() ?? [];
}

function getLabMarkers(key: string): { dbKey: string; label: string; unit: string; refLow?: number; refHigh?: number; secondaryKey?: string; secondaryLabel?: string }[] {
  const map: Record<string, { dbKey: string; label: string; unit: string; refLow?: number; refHigh?: number; secondaryKey?: string; secondaryLabel?: string }[]> = {
    cardiovascular: [
      { dbKey: "ldl_mmol_l", label: "LDL", unit: "mmol/L", refLow: 0, refHigh: 3.0 },
      { dbKey: "blood_pressure_systolic", label: "Blood Pressure", unit: "mmHg", refLow: 60, refHigh: 140, secondaryKey: "blood_pressure_diastolic", secondaryLabel: "Diastolic" },
      { dbKey: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refLow: 0, refHigh: 42 },
    ],
    liver: [
      { dbKey: "alat_u_l", label: "ALAT", unit: "U/L" },
      { dbKey: "gt_u_l", label: "GT", unit: "U/L" },
      { dbKey: "afos_alp_u_l", label: "ALP", unit: "U/L" },
      { dbKey: "alat_asat_ratio", label: "ALAT/ASAT Ratio", unit: "" },
    ],
    kidney: [
      { dbKey: "egfr", label: "eGFR", unit: "mL/min" },
      { dbKey: "cystatin_c", label: "Cystatin C", unit: "mg/L" },
    ],
    hormones: [
      { dbKey: "tsh_mu_l", label: "TSH", unit: "mU/L" },
    ],
    respiratory: [
      { dbKey: "fev1_percent", label: "FEV1", unit: "%" },
      { dbKey: "fvc_percent", label: "FVC", unit: "%" },
      { dbKey: "pef_percent", label: "PEF", unit: "%" },
    ],
  };
  return map[key] ?? [];
}

function buildChartData(labResults: Tables<"patient_lab_results">[], marker: ReturnType<typeof getLabMarkers>[number]) {
  const sorted = [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date));
  if (marker.secondaryKey) {
    return sorted
      .filter(l => (l as any)[marker.dbKey] != null)
      .map(l => ({
        date: l.result_date,
        primary: Number((l as any)[marker.dbKey]),
        secondary: (l as any)[marker.secondaryKey!] != null ? Number((l as any)[marker.secondaryKey!]) : undefined,
      }));
  }
  return sorted
    .filter(l => (l as any)[marker.dbKey] != null)
    .map(l => ({ date: l.result_date, value: Number((l as any)[marker.dbKey]) }));
}

// Editable text area styled to blend into the A4 page
function InlineEdit({ value, onChange, placeholder, minH = "60px" }: {
  value: string; onChange: (v: string) => void; placeholder: string; minH?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none border-none bg-transparent outline-none text-[11px] leading-[1.6] text-[#1a1a1a] placeholder:text-[#bbb] focus:ring-0 p-0"
      style={{ minHeight: minH }}
    />
  );
}

export function HealthReportDialog({
  open, onOpenChange, patient, onboarding, labResults, healthCategories, radarData,
}: HealthReportDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);

  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [activePageKey, setActivePageKey] = useState<string>("overview");

  const scrollToPage = useCallback((key: string) => {
    const el = pagesContainerRef.current?.querySelector(`[data-page="${key}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePageKey(key);
    }
  }, []);

  const [overviewSummary, setOverviewSummary] = useState(patient.health_summary || "");
  const [overviewRecs, setOverviewRecs] = useState(patient.health_recommendations || "");

  const catMap = useMemo(() => {
    const m: Record<string, Tables<"patient_health_categories">> = {};
    healthCategories.forEach(c => { m[c.category.toLowerCase()] = c; });
    return m;
  }, [healthCategories]);

  const [dimTexts, setDimTexts] = useState<Record<string, { summary: string; recommendations: string }>>(() => {
    const init: Record<string, { summary: string; recommendations: string }> = {};
    HEALTH_DIMENSIONS.forEach(d => {
      const cat = catMap[d.label.toLowerCase()];
      init[d.key] = { summary: cat?.summary || "", recommendations: cat?.recommendations || "" };
    });
    return init;
  });

  const updateDimText = (key: string, field: "summary" | "recommendations", value: string) => {
    setDimTexts(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const latestLab = labResults[0];

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : null;

  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const handlePrint = () => {
    if (!printRef.current) return;
    const pages = printRef.current.querySelectorAll("[data-page]");
    let pagesHtml = "";
    pages.forEach(page => {
      // Clone and replace textareas with their values
      const clone = page.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("textarea").forEach(ta => {
        const div = document.createElement("div");
        div.style.cssText = "white-space:pre-wrap;font-size:11px;line-height:1.6;color:#1a1a1a;min-height:20px;";
        div.textContent = ta.value || ta.placeholder;
        if (!ta.value) div.style.color = "#bbb";
        ta.replaceWith(div);
      });
      pagesHtml += clone.outerHTML;
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Health Report - ${patient.full_name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; }
        [data-page] { width: 210mm; min-height: 297mm; padding: 20mm 25mm; page-break-after: always; }
        [data-page]:last-child { page-break-after: avoid; }
        h1 { font-size: 22px; margin-bottom: 2px; }
        h2 { font-size: 17px; margin-bottom: 6px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
        .date { font-size: 10px; color: #999; margin-bottom: 20px; }
        .section { margin-bottom: 14px; }
        .section-label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .risk-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .risk-low { background: #dcfce7; color: #166534; }
        .risk-mid { background: #fef9c3; color: #854d0e; }
        .risk-high { background: #fee2e2; color: #991b1b; }
        .dim-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 2px solid #e5e5e5; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
        th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #eee; }
        th { font-weight: 600; color: #666; font-size: 9px; text-transform: uppercase; }
        .lab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; margin-top: 6px; }
        .lab-item { padding: 6px 10px; border: 1px solid #e5e5e5; border-radius: 4px; }
        .lab-label { color: #666; font-size: 9px; }
        .lab-val { font-weight: 600; font-size: 13px; }
        .radar-placeholder { text-align: center; padding: 16px; color: #888; font-style: italic; font-size: 11px; border: 1px dashed #ddd; border-radius: 6px; margin-bottom: 14px; }
        .separator { height: 1px; background: #e5e5e5; margin: 14px 0; }
        @media print { body { padding: 0; } [data-page] { padding: 15mm 20mm; } }
      </style></head><body>${pagesHtml}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  // A4 dimensions in px at 96dpi: 794 x 1123
  const A4_W = 794;
  const A4_H = 1123;

  const pageStyle: React.CSSProperties = {
    width: A4_W,
    minHeight: A4_H,
    background: "white",
    boxShadow: "0 2px 16px rgba(0,0,0,0.13)",
    borderRadius: 4,
    padding: "60px 72px",
    marginBottom: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1a1a1a",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 rounded-none border-none bg-[#525659] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#3b3b3b] border-b border-[#2a2a2a] shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-medium text-white">
              Health Report — {patient.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <Button size="sm" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-none h-7 text-xs" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Body: Sidebar + Pages */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-56 shrink-0 bg-[#3b3b3b] border-r border-[#2a2a2a] flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => scrollToPage("overview")}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left",
                    activePageKey === "overview"
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/60 hover:bg-white/10 hover:text-white/90"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  Health Overview
                </button>
                {HEALTH_DIMENSIONS.map(dim => {
                  const score = radarData.find(d => d.category === dim.label)?.score ?? 0;
                  const dotColor = score <= 3 ? "bg-green-400" : score <= 6 ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <button
                      key={dim.key}
                      onClick={() => scrollToPage(dim.key)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left",
                        activePageKey === dim.key
                          ? "bg-white/15 text-white font-medium"
                          : "text-white/60 hover:bg-white/10 hover:text-white/90"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor)} />
                      {dim.label}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Pages */}
          <div ref={pagesContainerRef} className="flex-1 overflow-auto" style={{ background: "#525659" }}>
            <div
              ref={printRef}
              className="flex flex-col items-center py-8"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center", minWidth: A4_W }}
            >
            {/* Page 1: Overview */}
            <div data-page="overview" style={pageStyle}>
              <h1 style={{ fontSize: 22, marginBottom: 2 }}>{patient.full_name}</h1>
              <h2 style={{ fontSize: 14, fontWeight: 400, color: "#555", marginBottom: 4 }}>Health Report</h2>
              <p className="meta" style={{ color: "#666", fontSize: 11, marginBottom: 16 }}>
                {age ? `Age ${age}` : ""}{age && patient.gender ? " · " : ""}{patient.gender || ""}
                {patient.tier ? ` · ${patient.tier.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}` : ""}
              </p>
              <p className="date" style={{ fontSize: 10, color: "#999", marginBottom: 20 }}>Generated {generatedDate}</p>

              <div style={{ height: 1, background: "#e5e5e5", margin: "0 0 20px" }} />

              <div className="radar-placeholder" style={{ textAlign: "center", padding: 16, color: "#888", fontStyle: "italic", fontSize: 11, border: "1px dashed #ddd", borderRadius: 6, marginBottom: 20 }}>
                Health Dimension Risk Scores
                <div style={{ marginTop: 8, fontSize: 10, lineHeight: 1.8 }}>
                  {radarData.map(d => `${d.category}: ${d.score}/10`).join(" · ")}
                </div>
              </div>

              <div className="section" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Overall Summary</div>
                <InlineEdit value={overviewSummary} onChange={setOverviewSummary} placeholder="Write an overall health summary..." minH="80px" />
              </div>

              <div style={{ height: 1, background: "#f0f0f0", margin: "8px 0" }} />

              <div className="section" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Overall Recommendations</div>
                <InlineEdit value={overviewRecs} onChange={setOverviewRecs} placeholder="Write overall recommendations..." minH="80px" />
              </div>
            </div>

            {/* One page per dimension */}
            {HEALTH_DIMENSIONS.map(dim => {
              const score = radarData.find(d => d.category === dim.label)?.score ?? 0;
              const riskClass = score <= 3 ? "risk-low" : score <= 6 ? "risk-mid" : "risk-high";
              const riskBg = score <= 3 ? "#dcfce7" : score <= 6 ? "#fef9c3" : "#fee2e2";
              const riskColor = score <= 3 ? "#166534" : score <= 6 ? "#854d0e" : "#991b1b";
              const riskFactors = getRiskFactors(dim.key, onboarding);
              const labMarkers = getLabMarkers(dim.key);
              const texts = dimTexts[dim.key];

              return (
                <div key={dim.key} data-page={dim.key} style={pageStyle}>
                  {/* Header */}
                  <div className="dim-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e5e5e5", paddingBottom: 8 }}>
                    <h2 style={{ fontSize: 17, margin: 0 }}>{dim.label}</h2>
                    <span className={`risk-badge ${riskClass}`} style={{ display: "inline-block", padding: "2px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: riskBg, color: riskColor }}>
                      Risk: {score}/10
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="section" style={{ marginBottom: 14 }}>
                    <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Summary</div>
                    <InlineEdit value={texts.summary} onChange={v => updateDimText(dim.key, "summary", v)} placeholder={`Clinical summary for ${dim.label}...`} />
                  </div>

                  {/* Recommendations */}
                  <div className="section" style={{ marginBottom: 14 }}>
                    <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Recommendations</div>
                    <InlineEdit value={texts.recommendations} onChange={v => updateDimText(dim.key, "recommendations", v)} placeholder={`Recommendations for ${dim.label}...`} />
                  </div>

                  {/* Risk Factors Table */}
                  {riskFactors.length > 0 && (
                    <div className="section" style={{ marginBottom: 14 }}>
                      <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Risk Factors</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 4 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #ddd", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Factor</th>
                            <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #ddd", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riskFactors.map(f => (
                            <tr key={f.label}>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #f0f0f0" }}>{f.label}</td>
                              <td style={{ padding: "5px 8px", borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>{f.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Lab Charts */}
                  {labMarkers.length > 0 && (
                    <div className="section" style={{ marginBottom: 14 }}>
                      <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Lab Trends</div>
                      <div style={{ display: "grid", gridTemplateColumns: labMarkers.length === 1 ? "1fr" : "1fr 1fr", gap: 12 }}>
                        {labMarkers.map(m => {
                          const chartData = buildChartData(labResults, m);
                          const latestVal = (latestLab as any)?.[m.dbKey];
                          const hasSecondary = !!m.secondaryKey;
                          return (
                            <div key={m.dbKey} style={{ border: "1px solid #e5e5e5", borderRadius: 6, padding: "10px 12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 600 }}>{m.label} {m.unit && `(${m.unit})`}</span>
                                {latestVal != null && (
                                  <span style={{ fontSize: 13, fontWeight: 700 }}>{String(latestVal)}</span>
                                )}
                              </div>
                              {chartData.length > 0 ? (
                                <div style={{ height: 120 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                      <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                                      <YAxis tick={{ fontSize: 8 }} />
                                      <Tooltip contentStyle={{ fontSize: 10 }} />
                                      {m.refLow != null && m.refHigh != null && (
                                        <ReferenceArea y1={m.refLow} y2={m.refHigh} fill="#3b82f6" fillOpacity={0.08} />
                                      )}
                                      {hasSecondary ? (
                                        <>
                                          <Line type="monotone" dataKey="primary" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2.5 }} name={m.label} />
                                          <Line type="monotone" dataKey="secondary" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2.5 }} name={m.secondaryLabel} />
                                        </>
                                      ) : (
                                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2.5 }} name={m.label} />
                                      )}
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 10, fontStyle: "italic" }}>
                                  No data available
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Page footer */}
                  <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                    <span>{patient.full_name} — Health Report</span>
                    <span>{dim.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
