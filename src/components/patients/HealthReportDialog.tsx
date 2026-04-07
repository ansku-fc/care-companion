import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, ZoomIn, ZoomOut, FileText, Save, CalendarDays, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";

// Use 9 main dimensions for the report
const HEALTH_DIMENSIONS = HEALTH_TAXONOMY.map((m) => ({ key: m.key, label: m.label }));

interface HealthReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  radarData: { category: string; score: number }[];
  appointments?: Tables<"appointments">[];
  draftId?: string | null;
  onDraftSaved?: () => void;
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  follow_up: "Follow-up",
  procedure: "Procedure",
  check_up: "Check-up",
  urgent: "Urgent",
};

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
    // Metabolic sub-dimensions
    metabolic: () => [
      { label: "BMI", value: fmt(onboarding.bmi) },
      { label: "Weight (kg)", value: fmt(onboarding.weight_kg) },
      { label: "Height (cm)", value: fmt(onboarding.height_cm) },
      { label: "Waist Circumference (cm)", value: fmt(onboarding.waist_circumference_cm) },
      { label: "Waist-Hip Ratio", value: fmt(onboarding.waist_to_hip_ratio) },
      { label: "Endocrine / Hormone Illness", value: bool(onboarding.illness_hormone) },
      { label: "Kidney Illness", value: bool(onboarding.illness_kidney) },
      { label: "Kidney Function Symptoms", value: bool(onboarding.symptom_kidney_function) },
    ],
    endocrine: () => [
      { label: "Hormone Illness", value: bool(onboarding.illness_hormone) },
      { label: "Menstruation/Menopause", value: bool(onboarding.symptom_menstruation_menopause) },
    ],
    kidneys: () => [
      { label: "Kidney Illness", value: bool(onboarding.illness_kidney) },
      { label: "Kidney Function Symptoms", value: bool(onboarding.symptom_kidney_function) },
    ],
    body_composition: () => [
      { label: "BMI", value: fmt(onboarding.bmi) },
      { label: "Weight (kg)", value: fmt(onboarding.weight_kg) },
      { label: "Height (cm)", value: fmt(onboarding.height_cm) },
      { label: "Waist Circumference (cm)", value: fmt(onboarding.waist_circumference_cm) },
      { label: "Waist-Hip Ratio", value: fmt(onboarding.waist_to_hip_ratio) },
    ],
    metabolism: () => [
      { label: "BMI", value: fmt(onboarding.bmi) },
      { label: "Exercise (MET hrs/week)", value: fmt(onboarding.exercise_met_hours) },
    ],
  };
  return map[key]?.() ?? [];
}

// Metabolic sub-dimension definitions for report
const METABOLIC_SUB_DIMS = [
  { key: "endocrine", label: "2.1 Endocrine System" },
  { key: "kidneys", label: "2.2 Kidneys" },
  { key: "body_composition", label: "2.3 Body Composition" },
  { key: "nutrition", label: "2.4 Nutrition" },
  { key: "metabolism", label: "2.5 Metabolism" },
];

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
    // Metabolic sub-dimensions
    endocrine: [
      { dbKey: "free_t4_pmol_l", label: "Free T4", unit: "pmol/L", refLow: 12, refHigh: 22 },
      { dbKey: "tsh_mu_l", label: "TSH", unit: "mU/L", refLow: 0.4, refHigh: 4.0 },
    ],
    kidneys: [
      { dbKey: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refLow: 60 },
      { dbKey: "creatinine_umol_l", label: "Creatinine", unit: "µmol/L", refLow: 45, refHigh: 110 },
      { dbKey: "cystatin_c", label: "Cystatin C", unit: "mg/L", refHigh: 1.03 },
      { dbKey: "calcium_mmol_l", label: "Calcium", unit: "mmol/L", refLow: 2.15, refHigh: 2.55 },
      { dbKey: "potassium_mmol_l", label: "Potassium", unit: "mmol/L", refLow: 3.5, refHigh: 5.0 },
      { dbKey: "magnesium_mmol_l", label: "Magnesium", unit: "mmol/L", refLow: 0.7, refHigh: 1.0 },
      { dbKey: "sodium_mmol_l", label: "Sodium", unit: "mmol/L", refLow: 136, refHigh: 145 },
      { dbKey: "urine_acr_mg_mmol", label: "Urine ACR", unit: "mg/mmol", refHigh: 3.0 },
    ],
    nutrition: [
      { dbKey: "holotranscobalamin_pmol_l", label: "Holotranscobalamin", unit: "pmol/L", refLow: 50 },
      { dbKey: "vitamin_b12_total_ng_l", label: "Vitamin B12", unit: "ng/L", refLow: 200, refHigh: 900 },
      { dbKey: "vitamin_d_25oh_nmol_l", label: "Vitamin D", unit: "nmol/L", refLow: 75 },
      { dbKey: "folate_ug_l", label: "Folate", unit: "µg/L", refLow: 5.9 },
      { dbKey: "iron_serum_umol_l", label: "Iron (serum)", unit: "µmol/L", refLow: 10, refHigh: 30 },
      { dbKey: "ferritin_ug_l", label: "Ferritin", unit: "µg/L", refLow: 30, refHigh: 300 },
      { dbKey: "transferrin_saturation_pct", label: "Transferrin Sat.", unit: "%", refLow: 20, refHigh: 50 },
      { dbKey: "total_protein_g_l", label: "Total Protein", unit: "g/L", refLow: 64, refHigh: 83 },
      { dbKey: "prealbumin_g_l", label: "Prealbumin", unit: "g/L", refLow: 0.2, refHigh: 0.4 },
    ],
    metabolism: [
      { dbKey: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol", refLow: 0, refHigh: 42 },
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
  open, onOpenChange, patient, onboarding, labResults, healthCategories, radarData, appointments = [], draftId, onDraftSaved,
}: HealthReportDialogProps) {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  const [saving, setSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);

  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [activePageKey, setActivePageKey] = useState<string>("overview");

  const scrollToPage = useCallback((key: string) => {
    const el = pagesContainerRef.current?.querySelector(`[data-page="${key}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePageKey(key);
    }
  }, []);

  const catMap = useMemo(() => {
    const m: Record<string, Tables<"patient_health_categories">> = {};
    healthCategories.forEach(c => { m[c.category.toLowerCase()] = c; });
    return m;
  }, [healthCategories]);

  const defaultDimTexts = useMemo(() => {
    const init: Record<string, { summary: string; recommendations: string }> = {};
    HEALTH_DIMENSIONS.forEach(d => {
      const cat = catMap[d.label.toLowerCase()];
      init[d.key] = { summary: cat?.summary || "", recommendations: cat?.recommendations || "" };
    });
    return init;
  }, [catMap]);

  const [overviewSummary, setOverviewSummary] = useState(patient.health_summary || "");
  const [overviewRecs, setOverviewRecs] = useState(patient.health_recommendations || "");
  const [dimTexts, setDimTexts] = useState<Record<string, { summary: string; recommendations: string }>>(defaultDimTexts);
  const [hiddenCharts, setHiddenCharts] = useState<Set<string>>(new Set());
  const [objectives, setObjectives] = useState<{ title: string; description: string; timeline: string }[]>([
    { title: "", description: "", timeline: "6 months" },
    { title: "", description: "", timeline: "6 months" },
    { title: "", description: "", timeline: "12 months" },
  ]);
  // Load skin markers from dashboard health categories data
  const skinMarkers = useMemo(() => {
    const skinCat = healthCategories.find(c => c.category.toLowerCase() === "skin & mucous");
    if (!skinCat?.summary) return [];
    try {
      const match = skinCat.summary.match(/__SKIN_MARKERS__(.+)__END_MARKERS__/s);
      if (match) return JSON.parse(match[1]) as { x: number; y: number; label: string; notes: string; side: "front" | "back" }[];
    } catch {}
    return [];
  }, [healthCategories]);
  const [skinView, setSkinView] = useState<"front" | "back">("front");

  // Load draft data if draftId provided
  useEffect(() => {
    if (!open) return;
    setCurrentDraftId(draftId || null);
    if (draftId) {
      supabase.from("health_reports").select("*").eq("id", draftId).single().then(({ data }) => {
          if (data) {
            setOverviewSummary((data as any).overview_summary || "");
            setOverviewRecs((data as any).overview_recommendations || "");
            const dt = (data as any).dimension_texts as Record<string, any> | null;
            if (dt && typeof dt === "object") {
              if (dt.__objectives && Array.isArray(dt.__objectives)) {
                setObjectives(dt.__objectives);
              }
              // Skin markers now come from dashboard, skip __skinMarkers from draft
              const { __objectives, __skinMarkers, ...rest } = dt;
              setDimTexts({ ...defaultDimTexts, ...rest });
            }
          }
      });
    } else {
      setOverviewSummary(patient.health_summary || "");
      setOverviewRecs(patient.health_recommendations || "");
      setDimTexts(defaultDimTexts);
    }
  }, [open, draftId]);

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      patient_id: patient.id,
      created_by: user.id,
      title: `Health Report — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
      status: "draft",
      overview_summary: overviewSummary,
      overview_recommendations: overviewRecs,
      dimension_texts: { ...dimTexts, __objectives: objectives } as any,
    };

    let error;
    if (currentDraftId) {
      const res = await supabase.from("health_reports").update(payload as any).eq("id", currentDraftId);
      error = res.error;
    } else {
      const res = await supabase.from("health_reports").insert(payload as any).select("id").single();
      error = res.error;
      if (res.data) setCurrentDraftId((res.data as any).id);
    }
    setSaving(false);
    if (error) {
      toast.error("Failed to save draft");
    } else {
      toast.success("Draft saved");
      onDraftSaved?.();
    }
  };

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
            <Button size="sm" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-none h-7 text-xs" onClick={handleSaveDraft} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
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
                <button
                  onClick={() => scrollToPage("objectives")}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left pl-7",
                    activePageKey === "objectives"
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/60 hover:bg-white/10 hover:text-white/90"
                  )}
                >
                  Your Objectives
                </button>
                {HEALTH_DIMENSIONS.map(dim => {
                  const score = radarData.find(d => d.category === dim.label)?.score ?? 0;
                  const dotColor = score <= 3 ? "bg-green-400" : score <= 6 ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <div key={dim.key}>
                      <button
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
                      {dim.key === "skin_mucous" && (
                        <button
                          onClick={() => scrollToPage("skin-map")}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left pl-7",
                            activePageKey === "skin-map"
                              ? "bg-white/15 text-white font-medium"
                              : "text-white/60 hover:bg-white/10 hover:text-white/90"
                          )}
                        >
                          Skin Map
                          {skinMarkers.length > 0 && (
                            <span className="ml-auto text-[10px] text-white/50">{skinMarkers.length}</span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => scrollToPage("annual-plan")}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left",
                    activePageKey === "annual-plan"
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/60 hover:bg-white/10 hover:text-white/90"
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  Annual Health Plan
                </button>
                <button
                  onClick={() => scrollToPage("medications")}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left",
                    activePageKey === "medications"
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/60 hover:bg-white/10 hover:text-white/90"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  Medications
                </button>
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

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <ResponsiveContainer width={460} height={340}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#e5e5e5" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fill: "#555" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 8, fill: "#999" }} />
                    <Radar name="Risk" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
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

            {/* Page 2: Your Objectives */}
            <div data-page="objectives" style={pageStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e5e5e5", paddingBottom: 8 }}>
                <h2 style={{ fontSize: 17, margin: 0 }}>Your Objectives</h2>
                <span style={{ fontSize: 11, color: "#888" }}>Next 6–12 Months</span>
              </div>

              <p style={{ fontSize: 11, color: "#666", marginBottom: 24 }}>
                The following health objectives have been identified for {patient.full_name} based on current assessments, lab results, and clinical priorities.
              </p>

              {objectives.map((obj, i) => (
                <div key={i} style={{ marginBottom: 24, padding: "16px 20px", border: "1px solid #e5e5e5", borderRadius: 8, background: "#fafafa" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "#3b82f6", color: "white", fontSize: 13, fontWeight: 700 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <InlineEdit
                        value={obj.title}
                        onChange={v => setObjectives(prev => prev.map((o, j) => j === i ? { ...o, title: v } : o))}
                        placeholder={`Objective ${i + 1} title (e.g., "Improve cardiovascular health")`}
                        minH="22px"
                      />
                    </div>
                    <select
                      value={obj.timeline}
                      onChange={e => setObjectives(prev => prev.map((o, j) => j === i ? { ...o, timeline: e.target.value } : o))}
                      style={{ fontSize: 10, border: "1px solid #ddd", borderRadius: 4, padding: "2px 6px", color: "#666", background: "white" }}
                    >
                      <option value="3 months">3 months</option>
                      <option value="6 months">6 months</option>
                      <option value="9 months">9 months</option>
                      <option value="12 months">12 months</option>
                    </select>
                  </div>
                  <div style={{ paddingLeft: 36 }}>
                    <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Description & Action Plan</div>
                    <InlineEdit
                      value={obj.description}
                      onChange={v => setObjectives(prev => prev.map((o, j) => j === i ? { ...o, description: v } : o))}
                      placeholder="Describe the objective, target outcomes, and specific actions to achieve it..."
                      minH="60px"
                    />
                  </div>
                </div>
              ))}

              {/* Page footer */}
              <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                <span>{patient.full_name} — Health Report</span>
                <span>Your Objectives</span>
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

              const isMetabolic = dim.key === "metabolic";

              return (
                <React.Fragment key={dim.key}>
                <div data-page={dim.key} style={pageStyle}>
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

                  {/* Lab Charts (non-metabolic dimensions) */}
                  {!isMetabolic && labMarkers.length > 0 && (() => {
                    const visibleMarkers = labMarkers.filter(m => !hiddenCharts.has(`${dim.key}_${m.dbKey}`));
                    const hiddenMarkersList = labMarkers.filter(m => hiddenCharts.has(`${dim.key}_${m.dbKey}`));
                    return (
                    <div className="section" style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Lab Trends</div>
                        {hiddenMarkersList.length > 0 && (
                          <span style={{ fontSize: 9, color: "#bbb" }}>{hiddenMarkersList.length} chart{hiddenMarkersList.length > 1 ? "s" : ""} hidden</span>
                        )}
                      </div>
                      {visibleMarkers.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: visibleMarkers.length === 1 ? "1fr" : "1fr 1fr", gap: 12 }}>
                          {visibleMarkers.map(m => {
                            const chartData = buildChartData(labResults, m);
                            const latestVal = (latestLab as any)?.[m.dbKey];
                            const hasSecondary = !!m.secondaryKey;
                            return (
                              <div key={m.dbKey} style={{ border: "1px solid #e5e5e5", borderRadius: 6, padding: "10px 12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600 }}>{m.label} {m.unit && `(${m.unit})`}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {latestVal != null && (
                                      <span style={{ fontSize: 13, fontWeight: 700 }}>{String(latestVal)}</span>
                                    )}
                                    <button
                                      onClick={() => setHiddenCharts(prev => { const next = new Set(prev); next.add(`${dim.key}_${m.dbKey}`); return next; })}
                                      title="Hide from report"
                                      className="print:hidden"
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#666" }}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
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
                      )}
                      {hiddenMarkersList.length > 0 && (
                        <div className="print:hidden" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: visibleMarkers.length > 0 ? 8 : 0 }}>
                          {hiddenMarkersList.map(m => (
                            <button
                              key={m.dbKey}
                              onClick={() => setHiddenCharts(prev => { const next = new Set(prev); next.delete(`${dim.key}_${m.dbKey}`); return next; })}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", border: "1px dashed #ddd", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 10, color: "#999" }}
                            >
                              <EyeOff className="h-3 w-3" />
                              {m.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {/* Page footer */}
                  <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                    <span>{patient.full_name} — Health Report</span>
                    <span>{dim.label}</span>
                  </div>
                </div>

                {/* Metabolic sub-dimension pages */}
                {isMetabolic && METABOLIC_SUB_DIMS.map(sub => {
                  const subRiskFactors = getRiskFactors(sub.key, onboarding);
                  const subLabMarkers = getLabMarkers(sub.key);
                  const visibleSubMarkers = subLabMarkers.filter(m => !hiddenCharts.has(`metabolic_${sub.key}_${m.dbKey}`));
                  const hiddenSubMarkers = subLabMarkers.filter(m => hiddenCharts.has(`metabolic_${sub.key}_${m.dbKey}`));

                  return (
                    <div key={sub.key} data-page={`metabolic_${sub.key}`} style={pageStyle}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e5e5e5", paddingBottom: 8 }}>
                        <h2 style={{ fontSize: 17, margin: 0 }}>{sub.label}</h2>
                        <span style={{ fontSize: 11, color: "#888" }}>Metabolic Health</span>
                      </div>

                      {/* Sub-dimension risk factors */}
                      {subRiskFactors.length > 0 && (
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
                              {subRiskFactors.map(f => (
                                <tr key={f.label}>
                                  <td style={{ padding: "5px 8px", borderBottom: "1px solid #f0f0f0" }}>{f.label}</td>
                                  <td style={{ padding: "5px 8px", borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>{f.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Sub-dimension lab charts */}
                      {subLabMarkers.length > 0 && (
                        <div className="section" style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Lab Trends</div>
                            {hiddenSubMarkers.length > 0 && (
                              <span style={{ fontSize: 9, color: "#bbb" }}>{hiddenSubMarkers.length} hidden</span>
                            )}
                          </div>
                          {visibleSubMarkers.length > 0 && (
                            <div style={{ display: "grid", gridTemplateColumns: visibleSubMarkers.length === 1 ? "1fr" : "1fr 1fr", gap: 12 }}>
                              {visibleSubMarkers.map(m => {
                                const chartData = buildChartData(labResults, m);
                                const latestVal = (latestLab as any)?.[m.dbKey];
                                return (
                                  <div key={m.dbKey} style={{ border: "1px solid #e5e5e5", borderRadius: 6, padding: "10px 12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                      <span style={{ fontSize: 11, fontWeight: 600 }}>{m.label} {m.unit && `(${m.unit})`}</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {latestVal != null && (
                                          <span style={{ fontSize: 13, fontWeight: 700 }}>{String(latestVal)}</span>
                                        )}
                                        <button
                                          onClick={() => setHiddenCharts(prev => { const next = new Set(prev); next.add(`metabolic_${sub.key}_${m.dbKey}`); return next; })}
                                          title="Hide from report"
                                          className="print:hidden"
                                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#666" }}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
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
                                            {m.refLow != null && !m.refHigh && (
                                              <ReferenceArea y1={m.refLow} y2={m.refLow * 3} fill="#3b82f6" fillOpacity={0.08} />
                                            )}
                                            {m.refHigh != null && !m.refLow && (
                                              <ReferenceArea y1={0} y2={m.refHigh} fill="#3b82f6" fillOpacity={0.08} />
                                            )}
                                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2.5 }} name={m.label} />
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
                          )}
                          {hiddenSubMarkers.length > 0 && (
                            <div className="print:hidden" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: visibleSubMarkers.length > 0 ? 8 : 0 }}>
                              {hiddenSubMarkers.map(m => (
                                <button
                                  key={m.dbKey}
                                  onClick={() => setHiddenCharts(prev => { const next = new Set(prev); next.delete(`metabolic_${sub.key}_${m.dbKey}`); return next; })}
                                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", border: "1px dashed #ddd", borderRadius: 4, background: "none", cursor: "pointer", fontSize: 10, color: "#999" }}
                                >
                                  <EyeOff className="h-3 w-3" />
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Page footer */}
                      <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                        <span>{patient.full_name} — Health Report</span>
                        <span>{sub.label}</span>
                      </div>
                    </div>
                  );
                })}
                </React.Fragment>
              );
            })}

            {/* Skin Map Page */}
            <div data-page="skin-map" style={pageStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e5e5e5", paddingBottom: 8 }}>
                <h2 style={{ fontSize: 17, margin: 0 }}>Your Skin Health Overview</h2>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setSkinView("front")}
                    style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, border: "1px solid #ddd", background: skinView === "front" ? "#3b82f6" : "white", color: skinView === "front" ? "white" : "#666", cursor: "pointer", fontWeight: 600 }}
                  >Front</button>
                  <button
                    onClick={() => setSkinView("back")}
                    style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, border: "1px solid #ddd", background: skinView === "back" ? "#3b82f6" : "white", color: skinView === "back" ? "white" : "#666", cursor: "pointer", fontWeight: 600 }}
                  >Back</button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: "#666", marginBottom: 16 }}>
                The diagram below highlights areas of your skin that your care team has identified for monitoring. Each numbered marker corresponds to a finding described on the right.
              </p>

              <div style={{ display: "flex", gap: 20 }}>
                {/* Body SVG */}
                <div style={{ flex: "0 0 320px", position: "relative" }}>
                  <svg
                    viewBox="0 0 200 500"
                    width={320}
                    height={500}
                    style={{ border: "1px solid #e5e5e5", borderRadius: 8, background: "#fafafa" }}
                  >
                    {/* Body outline */}
                    {skinView === "front" ? (
                      <g fill="none" stroke="#ccc" strokeWidth="1.5">
                        {/* Head */}
                        <ellipse cx="100" cy="45" rx="22" ry="28" />
                        {/* Neck */}
                        <line x1="92" y1="73" x2="92" y2="90" />
                        <line x1="108" y1="73" x2="108" y2="90" />
                        {/* Shoulders & Torso */}
                        <path d="M92,90 L60,100 L45,120 L40,180 L38,200" />
                        <path d="M108,90 L140,100 L155,120 L160,180 L162,200" />
                        {/* Arms left */}
                        <path d="M45,120 L30,160 L22,200 L18,240 L15,260" />
                        <path d="M40,180 L28,170" />
                        {/* Arms right */}
                        <path d="M155,120 L170,160 L178,200 L182,240 L185,260" />
                        <path d="M160,180 L172,170" />
                        {/* Torso sides */}
                        <path d="M38,200 L42,260 L48,290 L55,310" />
                        <path d="M162,200 L158,260 L152,290 L145,310" />
                        {/* Waist to hips */}
                        <path d="M55,310 L60,320 L65,340" />
                        <path d="M145,310 L140,320 L135,340" />
                        {/* Chest/belly lines */}
                        <line x1="80" y1="130" x2="80" y2="135" stroke="#ddd" strokeWidth="0.8" />
                        <line x1="120" y1="130" x2="120" y2="135" stroke="#ddd" strokeWidth="0.8" />
                        <ellipse cx="100" cy="240" rx="12" ry="4" stroke="#ddd" strokeWidth="0.8" />
                        {/* Legs */}
                        <path d="M65,340 L62,380 L58,430 L55,470 L50,495" />
                        <path d="M135,340 L138,380 L142,430 L145,470 L150,495" />
                        {/* Inner legs */}
                        <path d="M95,340 L92,380 L90,430 L88,470 L85,495" />
                        <path d="M105,340 L108,380 L110,430 L112,470 L115,495" />
                        {/* Center line */}
                        <line x1="100" y1="90" x2="100" y2="340" stroke="#eee" strokeWidth="0.5" strokeDasharray="4,4" />
                        {/* Facial features */}
                        <circle cx="92" cy="40" r="2" fill="#ddd" stroke="none" />
                        <circle cx="108" cy="40" r="2" fill="#ddd" stroke="none" />
                        <path d="M95,52 Q100,57 105,52" stroke="#ddd" strokeWidth="0.8" />
                        {/* Hands */}
                        <ellipse cx="14" cy="264" rx="5" ry="8" stroke="#ddd" strokeWidth="0.8" />
                        <ellipse cx="186" cy="264" rx="5" ry="8" stroke="#ddd" strokeWidth="0.8" />
                        {/* Feet */}
                        <ellipse cx="67" cy="497" rx="20" ry="5" stroke="#ddd" strokeWidth="0.8" />
                        <ellipse cx="133" cy="497" rx="20" ry="5" stroke="#ddd" strokeWidth="0.8" />
                        <text x="100" y="15" textAnchor="middle" fontSize="9" fill="#bbb">FRONT</text>
                      </g>
                    ) : (
                      <g fill="none" stroke="#ccc" strokeWidth="1.5">
                        {/* Head */}
                        <ellipse cx="100" cy="45" rx="22" ry="28" />
                        {/* Neck */}
                        <line x1="92" y1="73" x2="92" y2="90" />
                        <line x1="108" y1="73" x2="108" y2="90" />
                        {/* Shoulders & Back */}
                        <path d="M92,90 L60,100 L45,120 L40,180 L38,200" />
                        <path d="M108,90 L140,100 L155,120 L160,180 L162,200" />
                        {/* Arms */}
                        <path d="M45,120 L30,160 L22,200 L18,240 L15,260" />
                        <path d="M155,120 L170,160 L178,200 L182,240 L185,260" />
                        {/* Back sides */}
                        <path d="M38,200 L42,260 L48,290 L55,310" />
                        <path d="M162,200 L158,260 L152,290 L145,310" />
                        {/* Spine */}
                        <line x1="100" y1="90" x2="100" y2="320" stroke="#ddd" strokeWidth="0.8" strokeDasharray="3,3" />
                        {/* Shoulder blades */}
                        <ellipse cx="78" cy="140" rx="14" ry="20" stroke="#ddd" strokeWidth="0.6" />
                        <ellipse cx="122" cy="140" rx="14" ry="20" stroke="#ddd" strokeWidth="0.6" />
                        {/* Buttocks */}
                        <path d="M55,310 L60,320 L65,340" />
                        <path d="M145,310 L140,320 L135,340" />
                        <path d="M80,320 Q100,340 120,320" stroke="#ddd" strokeWidth="0.8" />
                        {/* Legs */}
                        <path d="M65,340 L62,380 L58,430 L55,470 L50,495" />
                        <path d="M135,340 L138,380 L142,430 L145,470 L150,495" />
                        <path d="M95,340 L92,380 L90,430 L88,470 L85,495" />
                        <path d="M105,340 L108,380 L110,430 L112,470 L115,495" />
                        {/* Hands & feet */}
                        <ellipse cx="14" cy="264" rx="5" ry="8" stroke="#ddd" strokeWidth="0.8" />
                        <ellipse cx="186" cy="264" rx="5" ry="8" stroke="#ddd" strokeWidth="0.8" />
                        <ellipse cx="67" cy="497" rx="20" ry="5" stroke="#ddd" strokeWidth="0.8" />
                        <ellipse cx="133" cy="497" rx="20" ry="5" stroke="#ddd" strokeWidth="0.8" />
                        <text x="100" y="15" textAnchor="middle" fontSize="9" fill="#bbb">BACK</text>
                      </g>
                    )}
                    {/* Markers for current view */}
                    {skinMarkers.filter(m => m.side === skinView).map((m, i) => (
                      <g key={i}>
                        <circle cx={m.x} cy={m.y} r="6" fill="#ef4444" fillOpacity="0.8" stroke="#fff" strokeWidth="1.5" />
                        <text x={m.x} y={m.y + 3.5} textAnchor="middle" fontSize="7" fill="white" fontWeight="700">{m.label.replace("#", "")}</text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Markers list */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="section-label" style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                    Areas to Monitor ({skinMarkers.length})
                  </div>
                  {skinMarkers.length === 0 ? (
                    <div style={{ color: "#bbb", fontSize: 11, fontStyle: "italic", padding: "20px 0" }}>
                      No areas of concern have been identified at this time.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {skinMarkers.map((m, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fafafa" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                            {m.label.replace("#", "")}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 9, color: "#888", textTransform: "uppercase" }}>{m.side}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#1a1a1a", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                              {m.notes || <span style={{ color: "#bbb", fontStyle: "italic" }}>No description</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Page footer */}
              <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                <span>{patient.full_name} — Health Report</span>
                <span>Skin Health Overview</span>
              </div>
            </div>

            {/* Annual Health Plan Page */}
            <div data-page="annual-plan" style={pageStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e5e5e5", paddingBottom: 8 }}>
                <h2 style={{ fontSize: 17, margin: 0 }}>Annual Health Plan</h2>
                <span style={{ fontSize: 11, color: "#888" }}>{new Date().getFullYear()}</span>
              </div>

              <p style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>
                Scheduled appointments and follow-ups for {patient.full_name}.
              </p>

              {(() => {
                const now = new Date();
                const upcoming = [...appointments]
                  .filter(a => new Date(a.start_time) >= now)
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                if (upcoming.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: 40, color: "#bbb", fontSize: 12, fontStyle: "italic" }}>
                      No upcoming appointments scheduled.
                    </div>
                  );
                }

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 4 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Date</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Time</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Appointment</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Type</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.map(appt => {
                        const start = new Date(appt.start_time);
                        const end = new Date(appt.end_time);
                        const tags: string[] = [];
                        if (appt.visit_modality === "remote") tags.push("Remote");
                        if (appt.is_home_visit) tags.push("Home Visit");
                        if (appt.is_onboarding) tags.push("Onboarding");
                        if (appt.is_nurse_visit) tags.push("Nurse");
                        if (appt.is_labs) tags.push("Labs");
                        if (appt.is_external_specialist) {
                          tags.push(`Specialist${appt.specialist_name ? `: ${appt.specialist_name}` : ""}`);
                        }
                        return (
                          <tr key={appt.id}>
                            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", fontWeight: 500 }}>
                              {start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", color: "#555" }}>
                              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>
                              {appt.title}
                            </td>
                            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0" }}>
                              <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: "#f3f4f6", color: "#374151" }}>
                                {APPOINTMENT_TYPE_LABELS[appt.appointment_type] || appt.appointment_type}
                              </span>
                            </td>
                            <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", fontSize: 10, color: "#888" }}>
                              {tags.join(" · ") || "In-Person"}
                              {appt.notes ? ` — ${appt.notes}` : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}

              {/* Page footer */}
              <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                <span>{patient.full_name} — Health Report</span>
                <span>Annual Health Plan</span>
              </div>
            </div>

            {/* Medications Page */}
            <div data-page="medications" style={pageStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "2px solid #e5e5e5", paddingBottom: 8 }}>
                <h2 style={{ fontSize: 17, margin: 0 }}>Current Medications</h2>
              </div>

              <p style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>
                Active prescriptions for {patient.full_name}.
              </p>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 4 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Medication</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Dose</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Prescribed</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e5e5e5", fontWeight: 600, color: "#666", fontSize: 9, textTransform: "uppercase" }}>Indication</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Atorvastatin", dose: "20 mg once daily", prescribed: "12 Jan 2025", indication: "Hypercholesterolaemia" },
                    { name: "Metformin", dose: "500 mg twice daily", prescribed: "3 Mar 2024", indication: "Type 2 Diabetes Mellitus" },
                    { name: "Lisinopril", dose: "10 mg once daily", prescribed: "18 Jun 2024", indication: "Hypertension" },
                    { name: "Omeprazole", dose: "20 mg once daily", prescribed: "7 Sep 2025", indication: "Gastroesophageal reflux disease" },
                    { name: "Levothyroxine", dose: "50 µg once daily", prescribed: "22 Nov 2024", indication: "Hypothyroidism" },
                    { name: "Vitamin D3", dose: "2000 IU once daily", prescribed: "5 Feb 2025", indication: "Vitamin D deficiency" },
                    { name: "Aspirin", dose: "100 mg once daily", prescribed: "14 Apr 2024", indication: "Cardiovascular risk reduction" },
                    { name: "Sertraline", dose: "50 mg once daily", prescribed: "29 Aug 2025", indication: "Generalised anxiety disorder" },
                  ].map((med, i) => (
                    <tr key={i}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", fontWeight: 500 }}>{med.name}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#555" }}>{med.dose}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap", color: "#555" }}>{med.prescribed}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#555" }}>{med.indication}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Page footer */}
              <div style={{ position: "absolute", bottom: 40, left: 72, right: 72, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                <span>{patient.full_name} — Health Report</span>
                <span>Medications</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
