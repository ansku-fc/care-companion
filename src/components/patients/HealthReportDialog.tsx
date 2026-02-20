import { useState, useRef, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Printer } from "lucide-react";
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

// Map dimension keys to relevant onboarding risk factors
function getRiskFactors(key: string, onboarding: Tables<"patient_onboarding"> | null): { label: string; value: string }[] {
  if (!onboarding) return [];
  const fmt = (v: any) => (v != null && v !== "" ? String(v) : "—");
  const bool = (v: any) => (v ? "Yes" : "No");

  switch (key) {
    case "senses":
      return [
        { label: "Vision Acuity", value: fmt(onboarding.vision_acuity) },
        { label: "Vision Symptoms", value: bool(onboarding.symptom_vision) },
        { label: "Hearing Symptoms", value: bool(onboarding.symptom_hearing) },
        { label: "Smell Symptoms", value: bool(onboarding.symptom_smell) },
        { label: "Previous Illness", value: bool(onboarding.illness_senses) },
      ];
    case "nervous_system":
      return [
        { label: "Neurological Symptoms", value: bool(onboarding.symptom_neurological) },
        { label: "Balance Issues", value: bool(onboarding.symptom_balance) },
        { label: "Previous Brain Damage", value: bool(onboarding.prev_brain_damage) },
        { label: "Genetic Predisposition", value: bool(onboarding.genetic_nervous_system) },
        { label: "Previous Illness", value: bool(onboarding.illness_neurological) },
      ];
    case "physical_performance":
      return [
        { label: "Exercise (MET hrs/week)", value: fmt(onboarding.exercise_met_hours) },
        { label: "Mobility Restriction", value: bool(onboarding.symptom_mobility_restriction) },
        { label: "Joint Pain", value: bool(onboarding.symptom_joint_pain) },
        { label: "BMI", value: fmt(onboarding.bmi) },
      ];
    case "respiratory":
      return [
        { label: "Respiratory Symptoms", value: bool(onboarding.symptom_respiratory) },
        { label: "Sleep Apnoea", value: bool(onboarding.symptom_sleep_apnoea) },
        { label: "Smoking", value: fmt(onboarding.smoking) },
      ];
    case "hormones":
      return [
        { label: "Hormone Illness", value: bool(onboarding.illness_hormone) },
        { label: "Menstruation/Menopause Issues", value: bool(onboarding.symptom_menstruation_menopause) },
      ];
    case "skin_mucous":
      return [
        { label: "Skin Rash", value: bool(onboarding.symptom_skin_rash) },
        { label: "Mucous Membrane Issues", value: bool(onboarding.symptom_mucous_membranes) },
        { label: "Skin Condition Score", value: fmt(onboarding.skin_condition) },
        { label: "Sun Exposure", value: bool(onboarding.sun_exposure) },
      ];
    case "immunity":
      return [
        { label: "Immune/Allergy Symptoms", value: bool(onboarding.symptom_immune_allergies) },
        { label: "Infections/Year", value: fmt(onboarding.infections_per_year) },
        { label: "Immune Illness", value: bool(onboarding.illness_immune) },
      ];
    case "nutrition":
      return [
        { label: "BMI", value: fmt(onboarding.bmi) },
        { label: "Waist Circumference (cm)", value: fmt(onboarding.waist_circumference_cm) },
        { label: "Fruits/Veg (g/day)", value: fmt(onboarding.fruits_vegetables_g_per_day) },
        { label: "Fish (g/day)", value: fmt(onboarding.fish_g_per_day) },
        { label: "Fiber (g/day)", value: fmt(onboarding.fiber_g_per_day) },
        { label: "Red Meat (g/day)", value: fmt(onboarding.red_meat_g_per_day) },
        { label: "Sugar (g/day)", value: fmt(onboarding.sugar_g_per_day) },
        { label: "Sodium (g/day)", value: fmt(onboarding.sodium_g_per_day) },
        { label: "GI Symptoms", value: bool(onboarding.symptom_gastrointestinal) },
      ];
    case "liver":
      return [
        { label: "Liver Illness", value: bool(onboarding.illness_liver) },
        { label: "GI Illness", value: bool(onboarding.illness_gastrointestinal) },
      ];
    case "mental_health":
      return [
        { label: "GAD-7 Score", value: fmt(onboarding.gad7_score) },
        { label: "Perceived Stress", value: fmt(onboarding.stress_perceived) },
        { label: "Job Strain", value: fmt(onboarding.job_strain_perceived) },
        { label: "Social Support", value: fmt(onboarding.social_support_perceived) },
        { label: "Mental Health Illness", value: bool(onboarding.illness_mental_health) },
      ];
    case "kidney":
      return [
        { label: "Kidney Illness", value: bool(onboarding.illness_kidney) },
        { label: "Kidney Function Symptoms", value: bool(onboarding.symptom_kidney_function) },
      ];
    case "substances":
      return [
        { label: "Alcohol (units/week)", value: fmt(onboarding.alcohol_units_per_week) },
        { label: "Smoking", value: fmt(onboarding.smoking) },
        { label: "Other Substances", value: bool(onboarding.other_substances) },
        { label: "Substance Use Score", value: fmt(onboarding.substance_use_perceived) },
      ];
    case "cardiovascular":
      return [
        { label: "Waist-Hip Ratio", value: fmt(onboarding.waist_to_hip_ratio) },
        { label: "Exercise (MET hrs/week)", value: fmt(onboarding.exercise_met_hours) },
        { label: "Smoking", value: fmt(onboarding.smoking) },
        { label: "Genetic Predisposition", value: bool(onboarding.genetic_cardiovascular) },
        { label: "CV Illness", value: bool(onboarding.illness_cardiovascular) },
      ];
    case "cancer_risk":
      return [
        { label: "Previous Cancer", value: bool(onboarding.prev_cancer) },
        { label: "Previous Precancerous", value: bool(onboarding.prev_precancerous) },
        { label: "Genetic Cancer Risk", value: bool(onboarding.genetic_cancer) },
        { label: "Genetic Melanoma Risk", value: bool(onboarding.genetic_melanoma) },
        { label: "Cancer Illness", value: bool(onboarding.illness_cancer) },
        { label: "Colorectal Screening", value: bool(onboarding.cancer_screening_colorectal) },
        { label: "Breast Screening", value: bool(onboarding.cancer_screening_breast) },
        { label: "Cervical Screening", value: bool(onboarding.cancer_screening_cervical) },
      ];
    case "musculoskeletal":
      return [
        { label: "Joint Pain", value: bool(onboarding.symptom_joint_pain) },
        { label: "Mobility Restriction", value: bool(onboarding.symptom_mobility_restriction) },
        { label: "Osteoporotic Fracture", value: bool(onboarding.prev_osteoporotic_fracture) },
        { label: "Musculoskeletal Illness", value: bool(onboarding.illness_musculoskeletal) },
      ];
    case "sleep":
      return [
        { label: "Sleep Hours/Night", value: fmt(onboarding.sleep_hours_per_night) },
        { label: "Sleep Quality", value: fmt(onboarding.sleep_quality) },
        { label: "Deep Sleep %", value: fmt(onboarding.deep_sleep_percent) },
        { label: "Insomnia", value: bool(onboarding.insomnia) },
        { label: "Sleep Apnoea", value: bool(onboarding.symptom_sleep_apnoea) },
      ];
    default:
      return [];
  }
}

// Map dimension keys to relevant lab marker keys
function getLabMarkers(key: string): { dbKey: string; label: string; unit: string }[] {
  switch (key) {
    case "cardiovascular":
      return [
        { dbKey: "ldl_mmol_l", label: "LDL", unit: "mmol/L" },
        { dbKey: "blood_pressure_systolic", label: "BP Systolic", unit: "mmHg" },
        { dbKey: "blood_pressure_diastolic", label: "BP Diastolic", unit: "mmHg" },
        { dbKey: "hba1c_mmol_mol", label: "HbA1c", unit: "mmol/mol" },
      ];
    case "liver":
      return [
        { dbKey: "alat_u_l", label: "ALAT", unit: "U/L" },
        { dbKey: "gt_u_l", label: "GT", unit: "U/L" },
        { dbKey: "afos_alp_u_l", label: "ALP", unit: "U/L" },
        { dbKey: "alat_asat_ratio", label: "ALAT/ASAT Ratio", unit: "" },
      ];
    case "kidney":
      return [
        { dbKey: "egfr", label: "eGFR", unit: "mL/min" },
        { dbKey: "cystatin_c", label: "Cystatin C", unit: "mg/L" },
      ];
    case "hormones":
      return [
        { dbKey: "tsh_mu_l", label: "TSH", unit: "mU/L" },
      ];
    case "respiratory":
      return [
        { dbKey: "fev1_percent", label: "FEV1", unit: "%" },
        { dbKey: "fvc_percent", label: "FVC", unit: "%" },
        { dbKey: "pef_percent", label: "PEF", unit: "%" },
      ];
    default:
      return [];
  }
}

export function HealthReportDialog({
  open, onOpenChange, patient, onboarding, labResults, healthCategories, radarData,
}: HealthReportDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Editable overview texts
  const [overviewSummary, setOverviewSummary] = useState(patient.health_summary || "");
  const [overviewRecs, setOverviewRecs] = useState(patient.health_recommendations || "");

  // Editable per-dimension texts
  const catMap = useMemo(() => {
    const m: Record<string, Tables<"patient_health_categories">> = {};
    healthCategories.forEach(c => { m[c.category.toLowerCase()] = c; });
    return m;
  }, [healthCategories]);

  const [dimTexts, setDimTexts] = useState<Record<string, { summary: string; recommendations: string }>>(() => {
    const init: Record<string, { summary: string; recommendations: string }> = {};
    HEALTH_DIMENSIONS.forEach(d => {
      const cat = catMap[d.label.toLowerCase()];
      init[d.key] = {
        summary: cat?.summary || "",
        recommendations: cat?.recommendations || "",
      };
    });
    return init;
  });

  const updateDimText = (key: string, field: "summary" | "recommendations", value: string) => {
    setDimTexts(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  // Latest lab values for each marker
  const latestLab = labResults[0];

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Health Report - ${patient.full_name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 0; }
          .report-page { page-break-after: always; padding: 40px; min-height: 100vh; }
          .report-page:last-child { page-break-after: avoid; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          h2 { font-size: 20px; margin-bottom: 8px; color: #333; }
          h3 { font-size: 16px; margin-bottom: 6px; color: #555; }
          .patient-meta { color: #666; font-size: 14px; margin-bottom: 24px; }
          .section { margin-bottom: 20px; }
          .section-label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .section-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; min-height: 20px; }
          .risk-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; }
          .risk-low { background: #dcfce7; color: #166534; }
          .risk-mid { background: #fef9c3; color: #854d0e; }
          .risk-high { background: #fee2e2; color: #991b1b; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
          th { font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; }
          .lab-values { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin-top: 8px; }
          .lab-item { padding: 8px 12px; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 13px; }
          .lab-label { color: #666; font-size: 11px; }
          .lab-val { font-weight: 600; font-size: 15px; }
          .dim-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .separator { height: 1px; background: #e5e5e5; margin: 16px 0; }
          .radar-placeholder { text-align: center; padding: 20px; color: #888; font-style: italic; font-size: 13px; border: 1px dashed #ddd; border-radius: 8px; margin-bottom: 16px; }
          .generated-date { font-size: 11px; color: #999; margin-top: 8px; }
          @media print {
            body { padding: 0; }
            .report-page { padding: 30px; }
          }
          textarea { display: none; }
          .print-text { display: block; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : null;

  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Health Report Draft</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Edit content below before exporting. Changes are for this report only.</p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div ref={printRef}>
            {/* Page 1: Health Overview */}
            <div className="report-page">
              <h1>{patient.full_name} — Health Report</h1>
              <p className="patient-meta">
                {age ? `Age ${age}` : ""}{age && patient.gender ? " · " : ""}{patient.gender || ""}
                {patient.tier ? ` · ${patient.tier.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}` : ""}
              </p>
              <p className="generated-date">Generated {generatedDate}</p>

              <div className="separator" />

              <div className="radar-placeholder">
                Radar chart with risk scores across all 16 health dimensions
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  {radarData.map(d => `${d.category}: ${d.score}/10`).join(" · ")}
                </div>
              </div>

              <div className="section">
                <div className="section-label">Overall Summary</div>
                <Textarea
                  value={overviewSummary}
                  onChange={e => setOverviewSummary(e.target.value)}
                  placeholder="Overall health summary..."
                  className="min-h-[100px] resize-none mt-1"
                />
                <div className="print-text section-content" style={{ display: "none" }}>{overviewSummary || "No summary provided."}</div>
              </div>

              <div className="section">
                <div className="section-label">Overall Recommendations</div>
                <Textarea
                  value={overviewRecs}
                  onChange={e => setOverviewRecs(e.target.value)}
                  placeholder="Overall recommendations..."
                  className="min-h-[100px] resize-none mt-1"
                />
                <div className="print-text section-content" style={{ display: "none" }}>{overviewRecs || "No recommendations provided."}</div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* One section per dimension */}
            {HEALTH_DIMENSIONS.map((dim, i) => {
              const score = radarData.find(d => d.category === dim.label)?.score ?? 0;
              const riskClass = score <= 3 ? "risk-low" : score <= 6 ? "risk-mid" : "risk-high";
              const riskFactors = getRiskFactors(dim.key, onboarding);
              const labMarkers = getLabMarkers(dim.key);
              const texts = dimTexts[dim.key];

              return (
                <div key={dim.key}>
                  <div className="report-page">
                    <div className="dim-header">
                      <h2>{dim.label}</h2>
                      <span className={`risk-badge ${riskClass}`}>Risk: {score}/10</span>
                    </div>

                    {/* Summary */}
                    <div className="section">
                      <div className="section-label">Summary</div>
                      <Textarea
                        value={texts.summary}
                        onChange={e => updateDimText(dim.key, "summary", e.target.value)}
                        placeholder={`Clinical summary for ${dim.label}...`}
                        className="min-h-[80px] resize-none mt-1"
                      />
                      <div className="print-text section-content" style={{ display: "none" }}>{texts.summary || "—"}</div>
                    </div>

                    {/* Recommendations */}
                    <div className="section">
                      <div className="section-label">Recommendations</div>
                      <Textarea
                        value={texts.recommendations}
                        onChange={e => updateDimText(dim.key, "recommendations", e.target.value)}
                        placeholder={`Recommendations for ${dim.label}...`}
                        className="min-h-[80px] resize-none mt-1"
                      />
                      <div className="print-text section-content" style={{ display: "none" }}>{texts.recommendations || "—"}</div>
                    </div>

                    {/* Risk Factors */}
                    {riskFactors.length > 0 && (
                      <div className="section">
                        <div className="section-label">Risk Factors</div>
                        <table>
                          <thead>
                            <tr><th>Factor</th><th>Value</th></tr>
                          </thead>
                          <tbody>
                            {riskFactors.map(f => (
                              <tr key={f.label}><td>{f.label}</td><td>{f.value}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Lab Values */}
                    {labMarkers.length > 0 && latestLab && (
                      <div className="section">
                        <div className="section-label">Latest Lab Values</div>
                        <div className="lab-values">
                          {labMarkers.map(m => {
                            const val = (latestLab as any)[m.dbKey];
                            return (
                              <div key={m.dbKey} className="lab-item">
                                <div className="lab-label">{m.label} {m.unit && `(${m.unit})`}</div>
                                <div className="lab-val">{val != null ? String(val) : "—"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {i < HEALTH_DIMENSIONS.length - 1 && <Separator className="my-6" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
