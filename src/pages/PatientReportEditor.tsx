import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ZoomIn, ZoomOut, Printer, Save, X, Upload, FileText, Loader2, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceArea, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import { dimensionScore as computeDimensionScore } from "@/lib/dimensionScores";
import { scoreTone } from "@/lib/scoreColor";
import { cn } from "@/lib/utils";
import coverBg from "@/assets/report-cover-bg.jpg";
import logoIcon from "@/assets/foundation-clinic-icon.png";
import { getRiskFactorsForDimension } from "@/lib/reportRiskFactors";

// ─────────────────────────────────────────────────────────────────────────────
// Lab marker definitions per dimension
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

const MARKER_DEFS: Record<string, Marker> = {
  ldl_mmol_l: { key: "ldl_mmol_l", label: "LDL", unit: "mmol/L", refLow: 0, refHigh: 3.0, optLow: 0, optHigh: 2.6 },
  blood_pressure_systolic: { key: "blood_pressure_systolic", label: "BP Systolic", unit: "mmHg", refLow: 90, refHigh: 140, optLow: 100, optHigh: 120 },
  blood_pressure_diastolic: { key: "blood_pressure_diastolic", label: "BP Diastolic", unit: "mmHg", refLow: 60, refHigh: 90, optLow: 65, optHigh: 80 },
  hba1c_mmol_mol: { key: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refLow: 0, refHigh: 42, optLow: 0, optHigh: 36 },
  free_t4_pmol_l: { key: "free_t4_pmol_l", label: "Free T4", unit: "pmol/L", refLow: 12, refHigh: 22 },
  tsh_mu_l: { key: "tsh_mu_l", label: "TSH", unit: "mU/L", refLow: 0.4, refHigh: 4.0 },
  egfr: { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refLow: 60 },
  creatinine_umol_l: { key: "creatinine_umol_l", label: "Creatinine", unit: "µmol/L", refLow: 45, refHigh: 110 },
  cystatin_c: { key: "cystatin_c", label: "Cystatin C", unit: "mg/L", refLow: 0.5, refHigh: 1.0 },
  urine_acr_mg_mmol: { key: "urine_acr_mg_mmol", label: "Urine ACR", unit: "mg/mmol", refLow: 0, refHigh: 3 },
  alat_u_l: { key: "alat_u_l", label: "ALAT", unit: "U/L", refLow: 0, refHigh: 50 },
  gt_u_l: { key: "gt_u_l", label: "GT", unit: "U/L", refLow: 0, refHigh: 60 },
  afos_alp_u_l: { key: "afos_alp_u_l", label: "ALP", unit: "U/L", refLow: 35, refHigh: 105 },
  alat_asat_ratio: { key: "alat_asat_ratio", label: "ALAT/ASAT", unit: "" },
  vitamin_d_25oh_nmol_l: { key: "vitamin_d_25oh_nmol_l", label: "Vitamin D (25-OH)", unit: "nmol/L", refLow: 50, refHigh: 150, optLow: 75 },
  calcium_mmol_l: { key: "calcium_mmol_l", label: "Calcium", unit: "mmol/L", refLow: 2.15, refHigh: 2.55 },
  calcium_ionised_mmol_l: { key: "calcium_ionised_mmol_l", label: "Ionised Ca", unit: "mmol/L", refLow: 1.15, refHigh: 1.30 },
  phosphate_mmol_l: { key: "phosphate_mmol_l", label: "Phosphate", unit: "mmol/L", refLow: 0.8, refHigh: 1.5 },
  vitamin_b12_total_ng_l: { key: "vitamin_b12_total_ng_l", label: "Vitamin B12", unit: "ng/L", refLow: 200, refHigh: 900 },
  holotranscobalamin_pmol_l: { key: "holotranscobalamin_pmol_l", label: "Holo-TC", unit: "pmol/L", refLow: 35 },
  folate_ug_l: { key: "folate_ug_l", label: "Folate", unit: "µg/L", refLow: 4 },
  ferritin_ug_l: { key: "ferritin_ug_l", label: "Ferritin", unit: "µg/L", refLow: 30, refHigh: 400 },
  iron_serum_umol_l: { key: "iron_serum_umol_l", label: "Iron", unit: "µmol/L", refLow: 10, refHigh: 30 },
  transferrin_saturation_pct: { key: "transferrin_saturation_pct", label: "Transferrin Sat.", unit: "%", refLow: 20, refHigh: 50 },
  transferrin_g_l: { key: "transferrin_g_l", label: "Transferrin", unit: "g/L", refLow: 2.0, refHigh: 3.6 },
  fev1_percent: { key: "fev1_percent", label: "FEV1", unit: "%", refLow: 80 },
  fvc_percent: { key: "fvc_percent", label: "FVC", unit: "%", refLow: 80 },
  pef_percent: { key: "pef_percent", label: "PEF", unit: "%", refLow: 80 },
};

type ReportPage = {
  id: string;
  label: string;
  parents: string[];
  markerKeys: string[];
  hideLabs?: boolean;
  riskKeywords?: string[];
};

const REPORT_PAGES: ReportPage[] = [
  { id: "cardiovascular", label: "Cardiovascular", parents: ["cardiovascular"],
    markerKeys: ["ldl_mmol_l", "blood_pressure_systolic", "blood_pressure_diastolic", "hba1c_mmol_mol"] },
  { id: "cancer", label: "Cancer", parents: ["cancer_risk"], markerKeys: [] },
  { id: "hormones", label: "Hormones", parents: ["metabolic"],
    markerKeys: ["tsh_mu_l", "free_t4_pmol_l"],
    riskKeywords: ["thyroid", "hormone", "shift"] },
  { id: "immune_defence", label: "Immune Defence", parents: ["respiratory_immune"],
    markerKeys: [],
    riskKeywords: ["allerg", "biological", "chemical", "lymph", "immune"] },
  { id: "kidneys", label: "Kidneys", parents: ["metabolic", "cardiovascular"],
    markerKeys: ["creatinine_umol_l", "egfr", "cystatin_c", "urine_acr_mg_mmol"],
    riskKeywords: ["salt", "blood pressure", "water", "bmi", "waist"] },
  { id: "liver", label: "Liver", parents: ["digestion"],
    markerKeys: ["alat_u_l", "gt_u_l", "afos_alp_u_l", "alat_asat_ratio"],
    riskKeywords: ["alcohol", "red meat", "bmi", "abdomin"] },
  { id: "mental_health", label: "Mental Health", parents: ["brain_mental"],
    markerKeys: [], hideLabs: true,
    riskKeywords: ["stress", "gad", "phq", "sleep quality", "social", "work", "shift", "anxiety", "depress"] },
  { id: "musculoskeletal", label: "Musculoskeletal", parents: ["exercise_functional"],
    markerKeys: ["vitamin_d_25oh_nmol_l", "calcium_mmol_l", "calcium_ionised_mmol_l", "phosphate_mmol_l"],
    riskKeywords: ["musculoskeletal", "sedentary", "strength"] },
  { id: "nervous_system", label: "Nervous System", parents: ["brain_mental"],
    markerKeys: ["vitamin_b12_total_ng_l", "holotranscobalamin_pmol_l", "folate_ug_l"],
    riskKeywords: ["sense", "memory", "eyes", "ears", "neuro"] },
  { id: "physical_performance", label: "Physical Performance", parents: ["exercise_functional"],
    markerKeys: ["ferritin_ug_l", "iron_serum_umol_l", "transferrin_saturation_pct", "transferrin_g_l"],
    riskKeywords: ["met", "physical activity", "cardio", "sedentary", "recovery", "exercise", "strength"] },
  { id: "respiratory", label: "Respiratory", parents: ["respiratory_immune"],
    markerKeys: ["fev1_percent", "fvc_percent", "pef_percent"],
    riskKeywords: ["smok", "occupational", "lung", "respiratory"] },
  { id: "senses", label: "Senses", parents: ["brain_mental"],
    markerKeys: [], hideLabs: true,
    riskKeywords: ["eyes", "ears", "sense", "vision", "hearing"] },
  { id: "skin_mucous", label: "Skin & Mucous", parents: ["skin_oral_mucosal"],
    markerKeys: [], hideLabs: true },
  { id: "sleep", label: "Sleep", parents: ["brain_mental"],
    markerKeys: [], hideLabs: true,
    riskKeywords: ["sleep", "apnea", "insomnia", "fatigue"] },
  { id: "substances", label: "Substances", parents: ["brain_mental", "cardiovascular"],
    markerKeys: ["alat_u_l", "gt_u_l", "ldl_mmol_l", "blood_pressure_systolic"],
    riskKeywords: ["smok", "alcohol", "nicotine", "drug", "substance"] },
  { id: "weight_nutrition", label: "Weight & Nutrition", parents: ["metabolic"],
    markerKeys: ["hba1c_mmol_mol", "ldl_mmol_l"] },
];

const PAGE_BY_ID: Record<string, ReportPage> = Object.fromEntries(REPORT_PAGES.map((p) => [p.id, p]));

function markersForPage(pageId: string): Marker[] {
  const p = PAGE_BY_ID[pageId];
  if (!p) return [];
  return p.markerKeys.map((k) => MARKER_DEFS[k]).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers / tokens
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSIONS = HEALTH_TAXONOMY.map((d) => ({ key: d.key, label: d.label }));
const A4_W = 794;
const A4_H = 1123;

const RISK_LABEL = (s: number) => (s < 4 ? "Low" : s < 7 ? "Moderate" : "High");

// Status colors (the only allowed status palette)
const STATUS = {
  green: { ink: "#0E8A85", bg: "#E6F4F2", band: "rgba(14,138,133,0.10)" },
  amber: { ink: "#A86A1A", bg: "#FAEFDD", band: "rgba(168,106,26,0.10)" },
  red:   { ink: "#B0455F", bg: "#F6E0E5", band: "rgba(176,69,95,0.10)" },
  gray:  { ink: "#7C6F62", bg: "#F1EBE2", band: "rgba(124,111,98,0.10)" },
};
const statusFor = (s: number) => {
  const t = scoreTone(s);
  return STATUS[(t as keyof typeof STATUS) ?? "gray"] ?? STATUS.gray;
};

// Editorial palette (sheet)
const INK = "#1F1812";
const INK_DIM = "#6B5E51";
const INK_FAINT = "#9A8D7E";
const HAIR = "#E8E0D4";
const ESPRESSO = "#2E1F14";

const SERIF: React.CSSProperties = { fontFamily: 'Belleza, Georgia, serif', fontWeight: 400 };
const SANS: React.CSSProperties = { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' };
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' };

type PageId = string;

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

  const [reportTitle, setReportTitle] = useState("Health Report");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("Foundation Clinic Finland");
  const [language, setLanguage] = useState<"en" | "fi" | "sv">("en");
  const [objectives, setObjectives] = useState("");
  const [annualPlan, setAnnualPlan] = useState("");

  const [dimState, setDimState] = useState<Record<string, DimState>>({});

  const pagesScrollRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (profile?.full_name) {
      const n = profile.full_name.trim();
      setDoctorName(n.startsWith("Dr.") ? n : `Dr. ${n}`);
    }
  }, [profile]);

  useEffect(() => {
    if (!patient) return;
    const ctx = { patientId: patient.id, onboarding, labResults, healthCategories };
    const riskCtx = { onboarding, allergies, familyHistory, moles, patient };
    const dimScoreCache: Record<string, number> = {};
    const getDimScore = (k: string) =>
      dimScoreCache[k] ?? (dimScoreCache[k] = computeDimensionScore(k, ctx));

    const next: Record<string, DimState> = {};
    REPORT_PAGES.forEach((p) => {
      const score = p.parents.length
        ? p.parents.reduce((sum, k) => sum + getDimScore(k), 0) / p.parents.length
        : 0;
      const cat = healthCategories.find((h) => h.category.toLowerCase() === p.label.toLowerCase());
      const allMarkers = p.markerKeys;
      const allRisks = Array.from(
        new Set(p.parents.flatMap((k) => getRiskFactorsForDimension(riskCtx, k))),
      );
      const filtered = p.riskKeywords
        ? allRisks.filter((s) => p.riskKeywords!.some((kw) => s.toLowerCase().includes(kw.toLowerCase())))
        : allRisks;

      next[p.id] = {
        index: Number(score.toFixed(1)),
        showRisk: true,
        riskFactors: filtered.map((s) => `• ${s}`).join("\n"),
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
  }, [patient, onboarding, labResults, healthCategories, allergies, familyHistory, moles]);

  const pageList = useMemo(() => {
    return [
      { id: "cover", label: "Cover" },
      { id: "overview", label: "Health overview" },
      { id: "objectives", label: "Your objectives" },
      ...REPORT_PAGES.map((p) => ({ id: p.id, label: p.label, score: dimState[p.id]?.index ?? 0 })),
      { id: "annual", label: "Annual plan" },
    ];
  }, [dimState]);

  const scrollToPage = (pid: PageId) => {
    const el = pagesScrollRef.current?.querySelector(`[data-page="${pid}"]`) as HTMLElement | null;
    if (el && pagesScrollRef.current) {
      pagesScrollRef.current.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
    }
    setActivePage(pid);
  };

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

  if (loading || !patient) {
    return (
      <div className="rpt fixed inset-0 z-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(253,246,238,0.6)" }} />
      </div>
    );
  }

  const formattedDate = new Date(reportDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const ds = dimState[activePage];
  const isDimensionPage = !!ds && !!PAGE_BY_ID[activePage];

  return (
    <div className="rpt fixed inset-0 z-50 flex flex-col" style={SANS}>
      {/* TOP BAR */}
      <div className="rpt-top h-[52px] shrink-0 flex items-center justify-between px-5">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4" style={{ color: "rgba(253,246,238,0.55)" }} />
          <div className="flex items-baseline gap-2 min-w-0">
            <span style={{ ...SERIF, fontSize: 17, color: "rgba(253,246,238,0.95)" }} className="truncate">
              {reportTitle}
            </span>
            <span className="rpt-faint" style={{ fontSize: 12 }}>·</span>
            <span className="rpt-dim truncate" style={{ fontSize: 13 }}>{patient.full_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center" style={{ background: "rgba(253,246,238,0.04)", borderRadius: 9, padding: 2 }}>
            <button className="rpt-btn rpt-btn--icon" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="rpt-dim px-2" style={{ ...MONO, fontSize: 12, minWidth: 44, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="rpt-btn rpt-btn--icon" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <button className="rpt-btn rpt-btn--ghost" onClick={handlePreviewPdf}>
            <Printer className="h-3.5 w-3.5" /> Preview PDF
          </button>
          <button className="rpt-btn rpt-btn--ghost" onClick={() => handlePublish(true)} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> Save & exit
          </button>
          <button className="rpt-btn rpt-btn--primary" onClick={() => handlePublish(false)} disabled={saving}>
            <Upload className="h-3.5 w-3.5" /> Publish
          </button>
          <button className="rpt-btn rpt-btn--icon" onClick={() => navigate(`/patients/${patient.id}`)} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT — pages rail */}
        <aside className="rpt-pages w-[232px] shrink-0 flex flex-col">
          <div className="px-4 pt-5 pb-3 rpt-label">Report</div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-6 space-y-px">
              {pageList.map((p, i) => {
                const sc = (p as any).score as number | undefined;
                const st = sc != null ? statusFor(sc) : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => scrollToPage(p.id)}
                    className={cn("rpt-pageitem", activePage === p.id && "on")}
                  >
                    <span className="rpt-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate flex-1">{p.label}</span>
                    {st && (
                      <span style={{
                        width: 6, height: 6, borderRadius: 999, background: st.ink,
                        opacity: activePage === p.id ? 1 : 0.7,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* CENTER — stage */}
        <main ref={pagesScrollRef} className="rpt-stage flex-1 overflow-auto">
          <div
            id="report-print-area"
            ref={printRef}
            className="flex flex-col items-center py-10"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center", minWidth: A4_W }}
          >
            <CoverPage
              patient={patient}
              title={reportTitle}
              date={formattedDate}
              doctor={doctorName}
              clinic={clinicName}
              onClick={() => setActivePage("cover")}
              active={activePage === "cover"}
            />

            <OverviewPage
              patient={patient}
              dimState={dimState}
              date={formattedDate}
              doctor={doctorName}
              onClick={() => setActivePage("overview")}
              active={activePage === "overview"}
            />

            <FreeTextPage
              id="objectives"
              eyebrow="03 · Intentions"
              title="Your objectives"
              subtitle="Personal health goals for the year ahead"
              text={objectives}
              patientName={patient.full_name}
              onClick={() => setActivePage("objectives")}
              active={activePage === "objectives"}
            />

            {REPORT_PAGES.map((p, idx) => (
              <DimensionPage
                key={p.id}
                dimKey={p.id}
                dimLabel={p.label}
                pageNumber={4 + idx}
                state={dimState[p.id]}
                labResults={labResults}
                patientName={patient.full_name}
                onClick={() => setActivePage(p.id)}
                active={activePage === p.id}
              />
            ))}

            <FreeTextPage
              id="annual"
              eyebrow={`${String(4 + REPORT_PAGES.length).padStart(2, "0")} · Cadence`}
              title="Annual plan"
              subtitle="Care timeline and follow-up checklist"
              text={annualPlan}
              patientName={patient.full_name}
              variant="checklist"
              onClick={() => setActivePage("annual")}
              active={activePage === "annual"}
            />
          </div>
        </main>

        {/* RIGHT — editor */}
        <aside className="rpt-edit w-[296px] shrink-0 flex flex-col">
          <div className="px-5 pt-5 pb-3 rpt-label flex items-center justify-between">
            <span>Edit page</span>
            <span style={{ ...MONO, fontSize: 11, color: "rgba(253,246,238,0.35)" }}>
              {pageList.findIndex((p) => p.id === activePage) + 1} / {pageList.length}
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-5 pb-8 space-y-5">
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
                <p className="rpt-dim" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                  The overview composes itself from each dimension's index score. Edit any dimension page to change a risk level here.
                </p>
              )}
              {activePage === "objectives" && (
                <FieldText label="Objectives" value={objectives} onChange={setObjectives} rows={16} placeholder="Write the patient's personal health goals…" />
              )}
              {activePage === "annual" && (
                <FieldText label="Annual care plan" value={annualPlan} onChange={setAnnualPlan} rows={16} placeholder="Describe the annual plan…" />
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
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor fields
// ─────────────────────────────────────────────────────────────────────────────

function FieldText({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="rpt-label">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="rpt-input resize-none"
        style={{ lineHeight: 1.55 }}
      />
    </div>
  );
}

function FieldInput({ label, value, onChange, type = "text", disabled }: { label: string; value: string; onChange?: (v: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="rpt-label">{label}</div>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="rpt-input"
        style={disabled ? { opacity: 0.55 } : undefined}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <div className="rpt-label">{label}</div>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rpt-input"
          style={{ appearance: "none", paddingRight: 32 }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="h-3.5 w-3.5" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(253,246,238,0.45)", pointerEvents: "none" }} />
      </div>
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
    <div className="space-y-4">
      <FieldInput label="Report title" value={props.reportTitle} onChange={props.setReportTitle} />
      <FieldInput label="Patient name" value={props.patientName} disabled />
      <FieldInput label="Report date" value={props.reportDate} onChange={props.setReportDate} type="date" />
      <FieldInput label="Doctor" value={props.doctorName} onChange={props.setDoctorName} />
      <FieldInput label="Clinic" value={props.clinicName} onChange={props.setClinicName} />
      <FieldSelect
        label="Language"
        value={props.language}
        onChange={(v) => props.setLanguage(v as any)}
        options={[
          { value: "en", label: "English" },
          { value: "fi", label: "Finnish" },
          { value: "sv", label: "Swedish" },
        ]}
      />
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
  const markers = markersForPage(dimKey);
  const pageDef = PAGE_BY_ID[dimKey];
  const hideLabs = pageDef?.hideLabs ?? false;
  const availableMarkers = markers.filter((m) => labResults.some((l) => (l as any)[m.key] != null));

  return (
    <div className="space-y-5">
      <FieldInput
        label="Index value (0–10)"
        value={String(state.index)}
        onChange={(v) => onChange({ index: Math.max(0, Math.min(10, parseFloat(v) || 0)) })}
        type="number"
      />

      <div className="flex items-center justify-between">
        <span className="rpt-label">Show risk factors</span>
        <Switch checked={state.showRisk} onCheckedChange={(v) => onChange({ showRisk: v })} />
      </div>

      {state.showRisk && (
        <FieldText label="Risk factors" value={state.riskFactors} onChange={(v) => onChange({ riskFactors: v })} rows={6} />
      )}

      {!hideLabs && (
        <>
          <div className="space-y-2">
            <div className="rpt-label">Graphs to include</div>
            {availableMarkers.length === 0 ? (
              <p className="rpt-faint" style={{ fontSize: 12, fontStyle: "italic" }}>No lab data for this dimension</p>
            ) : (
              <div className="space-y-2 p-3" style={{ background: "rgba(253,246,238,0.03)", border: "1px solid rgba(253,246,238,0.08)", borderRadius: 9 }}>
                {availableMarkers.map((m) => {
                  const checked = state.selectedMarkers.includes(m.key);
                  return (
                    <label key={m.key} className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 12.5, color: "rgba(253,246,238,0.88)" }}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          onChange({
                            selectedMarkers: v
                              ? [...state.selectedMarkers, m.key]
                              : state.selectedMarkers.filter((k) => k !== m.key),
                          })
                        }
                        style={{ borderColor: "rgba(253,246,238,0.35)" }}
                      />
                      <span>{m.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {availableMarkers.length > 0 && (
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 12.5, color: "rgba(253,246,238,0.88)" }}>
                <Checkbox
                  checked={state.showRefIntervals}
                  onCheckedChange={(v) => onChange({ showRefIntervals: !!v })}
                  style={{ borderColor: "rgba(253,246,238,0.35)" }}
                />
                Show reference intervals
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 12.5, color: "rgba(253,246,238,0.88)" }}>
                <Checkbox
                  checked={state.showOptIntervals}
                  onCheckedChange={(v) => onChange({ showOptIntervals: !!v })}
                  style={{ borderColor: "rgba(253,246,238,0.35)" }}
                />
                Show optimal intervals
              </label>
            </div>
          )}
        </>
      )}

      <FieldText label="Summary" value={state.summary} onChange={(v) => onChange({ summary: v })} rows={6} placeholder="Doctor's interpretation…" />
      <FieldText label="Recommendations" value={state.recommendations} onChange={(v) => onChange({ recommendations: v })} rows={6} placeholder="Next steps…" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet pages
// ─────────────────────────────────────────────────────────────────────────────

const sheetBase: React.CSSProperties = {
  width: A4_W,
  minHeight: A4_H,
  background: "#FFFFFF",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
  marginBottom: 28,
  color: INK,
  position: "relative",
  overflow: "hidden",
  ...SANS,
};

function Sheet({ id, active, onClick, children, padding = "72px 80px 56px" }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode; padding?: string }) {
  return (
    <div
      data-page={id}
      onClick={onClick}
      style={{
        ...sheetBase,
        padding,
        outline: active ? `2px solid ${STATUS.amber.ink}` : "none",
        outlineOffset: 4,
        cursor: "pointer",
      }}
    >
      {children}
    </div>
  );
}

function SheetFooter({ patientName, pageNumber }: { patientName: string; pageNumber?: number | string }) {
  return (
    <div style={{
      position: "absolute", bottom: 32, left: 80, right: 80,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderTop: `1px solid ${HAIR}`, paddingTop: 12,
      fontSize: 9.5, color: INK_FAINT, letterSpacing: 0.4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <img src={logoIcon} alt="" style={{ height: 12, width: "auto", opacity: 0.65 }} />
        <span style={{ textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>Foundation Clinic</span>
      </div>
      <span>{patientName}</span>
      {pageNumber != null && <span style={MONO}>{String(pageNumber).padStart(2, "0")}</span>}
    </div>
  );
}

function StatusPill({ score }: { score: number }) {
  const st = statusFor(score);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px 3px 8px", borderRadius: 999,
      background: st.bg, color: st.ink,
      fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: st.ink }} />
      {RISK_LABEL(score)}
    </span>
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
      style={{ ...sheetBase, padding: 0, outline: active ? `2px solid ${STATUS.amber.ink}` : "none", outlineOffset: 4, cursor: "pointer" }}
    >
      {/* Full-bleed image */}
      <div style={{ position: "absolute", inset: 0 }}>
        <img src={coverBg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(31,24,18,0.10) 0%, rgba(31,24,18,0.02) 38%, rgba(31,24,18,0.70) 100%)" }} />
      </div>

      {/* White editorial card bottom-left */}
      <div style={{
        position: "absolute", left: 56, right: 56, bottom: 56,
        background: "#FFFFFF", padding: "40px 44px",
        borderRadius: 2,
        boxShadow: "0 18px 50px rgba(31,24,18,0.20)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
          <img src={logoIcon} alt="" style={{ height: 18 }} />
          <span style={{ ...SANS, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: INK }}>Foundation Clinic</span>
        </div>

        <div style={{ ...SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase", color: INK_FAINT, marginBottom: 14 }}>
          {title}
        </div>

        <h1 style={{ ...SERIF, fontSize: 52, lineHeight: 1.02, margin: 0, color: INK, letterSpacing: -0.5 }}>
          {patient.full_name}
        </h1>

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${HAIR}`, display: "flex", gap: 36, ...SANS, fontSize: 11.5, color: INK_DIM }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 4 }}>Issued</div>
            <div>{date}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 4 }}>Clinician</div>
            <div>{doctor || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 4 }}>Clinic</div>
            <div>{clinic}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewPage({
  patient, dimState, date, doctor, active, onClick,
}: {
  patient: Tables<"patients">; dimState: Record<string, DimState>;
  date: string; doctor: string;
  active: boolean; onClick: () => void;
}) {
  const scores = DIMENSIONS.map((d) => dimState[d.key]?.index ?? 0);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const highest = scores.length ? Math.max(...scores) : 0;
  const highestDim = DIMENSIONS[scores.indexOf(highest)]?.label ?? "—";

  return (
    <Sheet id="overview" active={active} onClick={onClick}>
      {/* Eyebrow + headline */}
      <div style={{ ...SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: INK_FAINT, marginBottom: 12 }}>
        02 · Composite
      </div>
      <h2 style={{ ...SERIF, fontSize: 38, lineHeight: 1.05, margin: 0, color: INK, letterSpacing: -0.3 }}>
        Health overview
      </h2>
      <p style={{ ...SANS, fontSize: 12, color: INK_DIM, marginTop: 10, marginBottom: 32, maxWidth: 520, lineHeight: 1.55 }}>
        A composed reading of {patient.full_name.split(",")[1]?.trim() || patient.full_name}'s health across nine clinical dimensions, drawn from baseline onboarding, lab results, and clinical assessment.
      </p>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}`, marginBottom: 32 }}>
        {[
          { l: "Composite index", v: avg.toFixed(1), s: "of 10" },
          { l: "Highest watch", v: highestDim, s: highest.toFixed(1) + " · " + RISK_LABEL(highest).toLowerCase() },
          { l: "Issued", v: date, s: doctor || "—" },
        ].map((c, i) => (
          <div key={i} style={{ padding: "18px 22px", borderLeft: i === 0 ? "none" : `1px solid ${HAIR}` }}>
            <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 6 }}>{c.l}</div>
            <div style={{ ...SERIF, fontSize: 24, color: INK, lineHeight: 1.1 }}>{c.v}</div>
            <div style={{ ...SANS, fontSize: 10.5, color: INK_DIM, marginTop: 3 }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* Dimension grid */}
      <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 12 }}>
        Nine dimensions
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: HAIR, border: `1px solid ${HAIR}` }}>
        {DIMENSIONS.map((d) => {
          const s = dimState[d.key]?.index ?? 0;
          const st = statusFor(s);
          return (
            <div key={d.key} style={{ background: "#FFFFFF", padding: "18px 16px", position: "relative", minHeight: 110 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ ...SANS, fontSize: 11, fontWeight: 600, color: INK, lineHeight: 1.3, paddingRight: 8 }}>{d.label}</div>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: st.ink }} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 18 }}>
                <span style={{ ...SERIF, fontSize: 30, color: INK, lineHeight: 1 }}>{s.toFixed(1)}</span>
                <span style={{ ...SANS, fontSize: 10, color: INK_FAINT }}>/ 10</span>
              </div>
              <div style={{ marginTop: 8, ...SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: st.ink }}>
                {RISK_LABEL(s)}
              </div>
            </div>
          );
        })}
      </div>

      <SheetFooter patientName={patient.full_name} pageNumber={2} />
    </Sheet>
  );
}

function FreeTextPage({
  id, eyebrow, title, subtitle, text, patientName, variant, active, onClick,
}: {
  id: string; eyebrow: string; title: string; subtitle: string; text: string; patientName: string;
  variant?: "checklist"; active: boolean; onClick: () => void;
}) {
  const lines = text.split(/\n+/).map((l) => l.replace(/^[•\-\d.\s]+/, "").trim()).filter(Boolean);
  return (
    <Sheet id={id} active={active} onClick={onClick}>
      <div style={{ ...SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: INK_FAINT, marginBottom: 12 }}>
        {eyebrow}
      </div>
      <h2 style={{ ...SERIF, fontSize: 38, lineHeight: 1.05, margin: 0, color: INK, letterSpacing: -0.3 }}>{title}</h2>
      <p style={{ ...SANS, fontSize: 12, color: INK_DIM, marginTop: 10, marginBottom: 36, maxWidth: 520, lineHeight: 1.55 }}>{subtitle}</p>

      {variant === "checklist" ? (
        lines.length === 0 ? (
          <p style={{ ...SANS, fontSize: 12, color: INK_FAINT, fontStyle: "italic" }}>Use the right panel to write the annual plan.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: `1px solid ${HAIR}` }}>
                <div style={{ ...MONO, fontSize: 10, color: INK_FAINT, width: 24, paddingTop: 3 }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${HAIR}`, flexShrink: 0, marginTop: 2 }} />
                <span style={{ ...SANS, fontSize: 12.5, color: INK, lineHeight: 1.55, flex: 1 }}>{l}</span>
              </div>
            ))}
          </div>
        )
      ) : lines.length === 0 ? (
        <p style={{ ...SANS, fontSize: 12, color: INK_FAINT, fontStyle: "italic" }}>Use the right panel to write objectives.</p>
      ) : (
        <div style={{ ...SERIF, fontSize: 17, lineHeight: 1.55, color: INK, columnCount: 1, maxWidth: 560 }}>
          {text.split(/\n\n+/).map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "14px 0 0" }}>{para}</p>
          ))}
        </div>
      )}

      <SheetFooter patientName={patientName} />
    </Sheet>
  );
}

function DimensionPage({
  dimKey, dimLabel, pageNumber, state, labResults, patientName, active, onClick,
}: {
  dimKey: string; dimLabel: string; pageNumber: number; state?: DimState;
  labResults: Tables<"patient_lab_results">[]; patientName: string;
  active: boolean; onClick: () => void;
}) {
  if (!state) return null;
  const st = statusFor(state.index);
  const hideLabs = PAGE_BY_ID[dimKey]?.hideLabs ?? false;
  const allMarkers = hideLabs ? [] : markersForPage(dimKey);
  const selected = allMarkers.filter((m) => state.selectedMarkers.includes(m.key));

  const latestRows = allMarkers.map((m) => {
    const row = labResults.find((l) => (l as any)[m.key] != null);
    return {
      label: m.label,
      value: row ? String((row as any)[m.key]) : "—",
      unit: m.unit,
      ref: m.refLow != null || m.refHigh != null ? `${m.refLow ?? ""}–${m.refHigh ?? ""}`.replace(/^–|–$/, "") : "—",
      date: row?.result_date ?? "—",
    };
  }).filter((r) => r.value !== "—");

  const riskItems = (state.riskFactors || "").split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean);

  return (
    <Sheet id={dimKey} active={active} onClick={onClick}>
      {/* Header band */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ ...SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: INK_FAINT, marginBottom: 10 }}>
            {String(pageNumber).padStart(2, "0")} · Dimension
          </div>
          <h2 style={{ ...SERIF, fontSize: 34, lineHeight: 1.05, margin: 0, color: INK, letterSpacing: -0.3 }}>{dimLabel}</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 4 }}>
            <span style={{ ...SERIF, fontSize: 48, color: INK, lineHeight: 1 }}>{state.index.toFixed(1)}</span>
            <span style={{ ...SANS, fontSize: 11, color: INK_FAINT }}>/ 10</span>
          </div>
          <div style={{ marginTop: 8 }}><StatusPill score={state.index} /></div>
        </div>
      </div>

      {/* Status band */}
      <div style={{ height: 3, background: HAIR, position: "relative", marginBottom: 28 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, state.index * 10)}%`, background: st.ink }} />
      </div>

      {/* Summary + Recommendations as two-column editorial */}
      {(state.summary || state.recommendations) && (
        <div style={{ display: "grid", gridTemplateColumns: state.summary && state.recommendations ? "1fr 1fr" : "1fr", gap: 32, marginBottom: 28 }}>
          {state.summary && (
            <div>
              <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 8 }}>Summary</div>
              <div style={{ ...SERIF, fontSize: 14, lineHeight: 1.55, color: INK, whiteSpace: "pre-wrap" }}>{state.summary}</div>
            </div>
          )}
          {state.recommendations && (
            <div>
              <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 8 }}>Recommendations</div>
              <div style={{ ...SANS, fontSize: 12, lineHeight: 1.6, color: INK, whiteSpace: "pre-wrap" }}>{state.recommendations}</div>
            </div>
          )}
        </div>
      )}

      {/* Risk factors */}
      {state.showRisk && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 10 }}>Risk factors</div>
          {riskItems.length === 0 ? (
            <p style={{ ...SANS, fontSize: 11.5, color: INK_FAINT, fontStyle: "italic" }}>None identified for this dimension.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
              {riskItems.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: i < 2 ? "none" : `1px solid ${HAIR}` }}>
                  <span style={{ width: 4, height: 4, borderRadius: 999, background: STATUS.amber.ink, marginTop: 8, flexShrink: 0 }} />
                  <span style={{ ...SANS, fontSize: 11.5, lineHeight: 1.5, color: INK }}>{it}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lab table */}
      {latestRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 10 }}>Laboratory</div>
          <table style={{ width: "100%", borderCollapse: "collapse", ...SANS, fontSize: 11.5 }}>
            <thead>
              <tr style={{ borderTop: `1px solid ${HAIR}`, borderBottom: `1px solid ${HAIR}` }}>
                <th style={{ textAlign: "left", padding: "8px 8px 8px 0", fontSize: 9, color: INK_FAINT, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Marker</th>
                <th style={{ textAlign: "right", padding: "8px", fontSize: 9, color: INK_FAINT, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Value</th>
                <th style={{ textAlign: "left", padding: "8px", fontSize: 9, color: INK_FAINT, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Unit</th>
                <th style={{ textAlign: "left", padding: "8px", fontSize: 9, color: INK_FAINT, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Reference</th>
                <th style={{ textAlign: "right", padding: "8px 0 8px 8px", fontSize: 9, color: INK_FAINT, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {latestRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${HAIR}` }}>
                  <td style={{ padding: "10px 8px 10px 0", color: INK }}>{r.label}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right", ...MONO, fontSize: 12, color: INK, fontWeight: 600 }}>{r.value}</td>
                  <td style={{ padding: "10px 8px", color: INK_DIM }}>{r.unit}</td>
                  <td style={{ padding: "10px 8px", ...MONO, color: INK_DIM, fontSize: 11 }}>{r.ref}</td>
                  <td style={{ padding: "10px 0 10px 8px", textAlign: "right", ...MONO, color: INK_DIM, fontSize: 10.5 }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trend charts */}
      {selected.length > 0 && (
        <div>
          <div style={{ ...SANS, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: INK_FAINT, marginBottom: 10 }}>Trends</div>
          <div style={{ display: "grid", gridTemplateColumns: selected.length > 2 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 16 }}>
            {selected.map((m) => (
              <MiniChart
                key={m.key}
                marker={m}
                labResults={labResults}
                showRef={state.showRefIntervals}
                showOpt={state.showOptIntervals}
                tone={st.ink}
              />
            ))}
          </div>
        </div>
      )}

      <SheetFooter patientName={patientName} pageNumber={pageNumber} />
    </Sheet>
  );
}

function MiniChart({ marker, labResults, showRef, showOpt, tone }: { marker: Marker; labResults: Tables<"patient_lab_results">[]; showRef: boolean; showOpt: boolean; tone: string }) {
  const data = useMemo(() => {
    return [...labResults]
      .filter((l) => (l as any)[marker.key] != null)
      .sort((a, b) => a.result_date.localeCompare(b.result_date))
      .map((l) => ({ date: l.result_date.slice(2, 7), value: Number((l as any)[marker.key]) }));
  }, [labResults, marker.key]);

  if (data.length === 0) return null;
  const latest = data[data.length - 1]?.value;

  return (
    <div style={{ borderTop: `1px solid ${HAIR}`, paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
        <div style={{ ...SANS, fontSize: 10.5, color: INK, fontWeight: 600 }}>{marker.label}</div>
        <div style={{ ...MONO, fontSize: 11, color: INK, fontWeight: 600 }}>
          {latest}<span style={{ ...SANS, fontSize: 9, color: INK_FAINT, fontWeight: 400, marginLeft: 3 }}>{marker.unit}</span>
        </div>
      </div>
      <div style={{ height: 70, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 3" stroke={HAIR} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: INK_FAINT }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: INK_FAINT }} axisLine={false} tickLine={false} width={22} />
            {showRef && marker.refLow != null && marker.refHigh != null && (
              <ReferenceArea y1={marker.refLow} y2={marker.refHigh} fill={STATUS.green.ink} fillOpacity={0.05} />
            )}
            {showOpt && marker.optLow != null && marker.optHigh != null && (
              <ReferenceArea y1={marker.optLow} y2={marker.optHigh} fill={STATUS.green.ink} fillOpacity={0.14} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={ESPRESSO}
              strokeWidth={1.25}
              dot={{ r: 2, fill: ESPRESSO, stroke: "none" }}
              activeDot={{ r: 3, fill: tone, stroke: "none" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
