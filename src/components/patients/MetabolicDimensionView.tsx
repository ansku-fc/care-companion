import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Beaker, Activity, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea,
} from "recharts";
import { DimensionMedicationsSection } from "@/components/patients/DimensionMedicationsSection";
import {
  CardioLabBiomarkerPanel,
  getSeriesRowsForBiomarker,
} from "@/components/patients/CardioLabBiomarkerPanel";
import { cn } from "@/lib/utils";
import { scoreColorClass as scoreColorFn } from "@/lib/scoreColor";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// ── Reference values for metabolic markers ──────────────────────────
const METABOLIC_REFS: Record<string, { low?: number; high?: number; label: string }> = {
  // Nutrition
  vitamin_b12_total_ng_l: { low: 200, high: 900, label: "Vitamin B12" },
  vitamin_d_25oh_nmol_l: { low: 75, label: "Vitamin D (25-OH)" },
  folate_ug_l: { low: 5.9, label: "Folate" },
  ferritin_ug_l: { low: 30, high: 300, label: "Ferritin" },
  // Endocrine
  free_t4_pmol_l: { low: 12, high: 22, label: "Free T4" },
  tsh_mu_l: { low: 0.4, high: 4.0, label: "TSH" },
  // Kidneys
  egfr: { low: 60, label: "eGFR" },
  calcium_mmol_l: { low: 2.15, high: 2.55, label: "Calcium" },
  potassium_mmol_l: { low: 3.5, high: 5.0, label: "Potassium" },
  creatinine_umol_l: { low: 45, high: 110, label: "Creatinine" },
  sodium_mmol_l: { low: 136, high: 145, label: "Sodium" },
  // Metabolism
  fasting_glucose_mmol_l: { low: 3.9, high: 5.6, label: "Fasting Glucose" },
  hba1c_metabolic: { high: 42, label: "HbA1c" },
};

type SubTab = "risk_factors" | "lab_graphs";

// ── Sub-dimension score computation ─────────────────────────────
export type SubDimScore = { key: string; label: string; score: number };

export function computeSubDimScores(
  onboarding: Tables<"patient_onboarding"> | null,
  lab: Tables<"patient_lab_results"> | null,
): SubDimScore[] {
  const outOfRange = (val: number | null | undefined, ref: { low?: number; high?: number }): boolean => {
    if (val == null) return false;
    if (ref.low != null && val < ref.low) return true;
    if (ref.high != null && val > ref.high) return true;
    return false;
  };

  const ENDOCRINE_MARKERS = ["free_t4_pmol_l", "tsh_mu_l"];
  const KIDNEY_MARKERS = ["egfr", "calcium_mmol_l", "potassium_mmol_l", "creatinine_umol_l", "sodium_mmol_l"];
  const NUTRITION_MARKERS = ["vitamin_b12_total_ng_l", "vitamin_d_25oh_nmol_l", "folate_ug_l", "ferritin_ug_l"];

  const countOutOfRange = (markers: string[]) => {
    let count = 0;
    for (const key of markers) {
      const ref = METABOLIC_REFS[key];
      if (!ref) continue;
      const val = lab ? (lab as any)[key] : null;
      if (outOfRange(val != null ? Number(val) : null, ref)) count++;
    }
    return count;
  };

  let endoScore = 1;
  if (onboarding?.illness_hormone) endoScore += 3;
  endoScore += countOutOfRange(ENDOCRINE_MARKERS) * 2;
  endoScore = Math.min(endoScore, 10);

  let kidneyScore = 1;
  if (onboarding?.illness_kidney) kidneyScore += 3;
  if (onboarding?.symptom_kidney_function) kidneyScore += 1;
  kidneyScore += Math.min(countOutOfRange(KIDNEY_MARKERS) * 1.5, 6);
  kidneyScore = Math.min(Math.round(kidneyScore), 10);

  let bodyScore = 1;
  if (onboarding?.bmi) {
    const bmi = Number(onboarding.bmi);
    if (bmi > 35) bodyScore += 4;
    else if (bmi > 30) bodyScore += 3;
    else if (bmi > 25) bodyScore += 1;
    else if (bmi < 18.5) bodyScore += 3;
  }
  if (onboarding?.waist_to_hip_ratio && Number(onboarding.waist_to_hip_ratio) > 0.9) bodyScore += 2;
  if (onboarding?.waist_circumference_cm && Number(onboarding.waist_circumference_cm) > 102) bodyScore += 1;
  bodyScore = Math.min(bodyScore, 10);

  let nutritionScore = 1;
  const nutritionOor = countOutOfRange(NUTRITION_MARKERS);
  if (nutritionOor >= 4) nutritionScore += 4;
  else if (nutritionOor >= 2) nutritionScore += 2;
  else if (nutritionOor >= 1) nutritionScore += 1;
  if (onboarding?.fruits_vegetables_g_per_day != null && Number(onboarding.fruits_vegetables_g_per_day) < 400) nutritionScore += 1;
  if (onboarding?.fiber_g_per_day != null && Number(onboarding.fiber_g_per_day) < 25) nutritionScore += 1;
  nutritionScore = Math.min(nutritionScore, 10);

  let metabScore = 1;
  if (lab?.hba1c_mmol_mol && Number(lab.hba1c_mmol_mol) > 42) metabScore += 3;
  if (lab?.hba1c_mmol_mol && Number(lab.hba1c_mmol_mol) > 48) metabScore += 2;
  if (onboarding?.bmi && Number(onboarding.bmi) > 30) metabScore += 1;
  if (onboarding?.exercise_met_hours != null && Number(onboarding.exercise_met_hours) < 5) metabScore += 1;
  metabScore = Math.min(metabScore, 10);

  return [
    { key: "endocrine", label: "Endocrine System", score: endoScore },
    { key: "kidneys", label: "Kidneys", score: kidneyScore },
    { key: "body_composition", label: "Body Composition", score: bodyScore },
    { key: "nutrition", label: "Nutrition", score: nutritionScore },
    { key: "metabolism", label: "Metabolism", score: metabScore },
  ];
}

export function computeCompositeScore(subs: SubDimScore[]): number {
  if (subs.length === 0) return 1;
  const avg = subs.reduce((sum, s) => sum + s.score, 0) / subs.length;
  return Math.max(1, Math.min(10, Math.round(avg)));
}

// scoreColorFn is the shared scoreColorClass from @/lib/scoreColor (imported above)

interface Props {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNavigateDimension: (section: string) => void;
  onDataChanged?: () => void;
}

export function MetabolicDimensionView({
  patient, onboarding, labResults, healthCategories,
  onNavigateDimension, onDataChanged,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("risk_factors");
  const [selectedMarker, setSelectedMarker] = useState<{
    key: string;
    label: string;
    unit: string;
    refLow?: number;
    refHigh?: number;
    accentColorVar: string;
  } | null>(null);
  const [sidebarWindow, setSidebarWindow] = useState<"6m" | "1y" | "3y" | "all">("3y");
  const [saving, setSaving] = useState(false);
  const [showRiskHistory, setShowRiskHistory] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (k: string) => setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const metCategory = healthCategories.find((c) => c.category.toLowerCase() === "metabolic");
  const [summary, setSummary] = useState(metCategory?.summary || "");
  const [recommendations, setRecommendations] = useState((metCategory as any)?.recommendations || "");

  const lab = labResults[0] || null;
  const subScores = useMemo(() => computeSubDimScores(onboarding, lab), [onboarding, lab]);
  const compositeScore = useMemo(() => computeCompositeScore(subScores), [subScores]);
  const scoreColor = scoreColorFn(compositeScore);

  const sorted = useMemo(
    () => [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date)),
    [labResults],
  );

  const riskHistory = useMemo(() => {
    const computed = sorted.map((sortedLab) => {
      const subs = computeSubDimScores(onboarding, sortedLab);
      return { date: sortedLab.result_date, score: computeCompositeScore(subs) };
    });
    if (computed.length < 2) {
      return [
        { date: "2023-06-01", score: 3 },
        { date: "2023-12-01", score: 4 },
        { date: "2024-06-01", score: 3 },
        { date: "2025-01-01", score: compositeScore },
      ];
    }
    return computed;
  }, [sorted, onboarding, compositeScore]);

  const onboardingDate = onboarding?.created_at
    ? new Date(onboarding.created_at).toLocaleDateString()
    : "—";

  const extra = ((onboarding as any)?.extra_data ?? {}) as Record<string, any>;
  const dash = "—";
  const numOrDash = (v: unknown, suffix = "") => {
    if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) return dash;
    return suffix ? `${v}${suffix}` : String(v);
  };
  const valOrDash = (v: unknown) => (v === null || v === undefined || v === "" ? dash : String(v));
  const allFamily: any[] = Array.isArray(extra.family_history) ? extra.family_history : [];
  const metabolicFamily = allFamily.filter((f) =>
    /^E1[0-4]/.test(String(f.icd_code ?? "").toUpperCase()) ||
    /^E66/.test(String(f.icd_code ?? "").toUpperCase()) ||
    /^E78/.test(String(f.icd_code ?? "").toUpperCase()),
  );
  const familyValue = metabolicFamily.length === 0 ? dash : `${metabolicFamily.length} relative${metabolicFamily.length === 1 ? "" : "s"}`;

  const riskFactors: { key: string; label: string; value: string; detail: React.ReactNode }[] = [
    { key: "bmi", label: "BMI", value: numOrDash(onboarding?.bmi), detail: <p className="text-sm text-muted-foreground">Body Mass Index. Normal range 18.5–24.9.</p> },
    { key: "waist", label: "Waist circumference", value: numOrDash(onboarding?.waist_circumference_cm, " cm"), detail: <p className="text-sm text-muted-foreground">Elevated risk above 102 cm (men) / 88 cm (women).</p> },
    { key: "hip", label: "Hip circumference", value: numOrDash(onboarding?.hip_circumference_cm, " cm"), detail: <p className="text-sm text-muted-foreground">Used to compute waist-to-hip ratio.</p> },
    { key: "whr", label: "Waist-to-hip ratio", value: numOrDash(onboarding?.waist_to_hip_ratio), detail: <p className="text-sm text-muted-foreground">Cardiometabolic risk increases above 0.9 (men) / 0.85 (women).</p> },
    { key: "diet", label: "Diet type", value: valOrDash(extra.diet_type), detail: <p className="text-sm text-muted-foreground">Self-described diet pattern.</p> },
    { key: "water", label: "Water intake (L/day)", value: numOrDash(extra.water_litres_per_day, " L/day"), detail: <p className="text-sm text-muted-foreground">Daily water intake. Recommended ≥1.5 L/day.</p> },
    { key: "sugar", label: "Sugar intake (g/day)", value: numOrDash(onboarding?.sugar_g_per_day, " g/day"), detail: <p className="text-sm text-muted-foreground">Daily added sugar consumption.</p> },
    { key: "salt", label: "Salt intake (g/day)", value: numOrDash(extra.salt_g_per_day ?? onboarding?.sodium_g_per_day, " g/day"), detail: <p className="text-sm text-muted-foreground">Daily salt/sodium intake.</p> },
    { key: "fiber", label: "Fiber intake (g/day)", value: numOrDash(onboarding?.fiber_g_per_day, " g/day"), detail: <p className="text-sm text-muted-foreground">Daily fiber intake. Recommended ≥25 g/day.</p> },
    { key: "family", label: "Family history — metabolic/diabetes", value: familyValue, detail: metabolicFamily.length === 0 ? <p className="text-sm text-muted-foreground">No relevant family history recorded.</p> : <ul className="space-y-1 text-sm">{metabolicFamily.map((r, i) => (<li key={i}><span className="font-medium">{r.relative ?? "Relative"}</span> · {r.illness_name ?? r.icd_code ?? dash}</li>))}</ul> },
  ];

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patient_health_categories")
      .upsert({
        patient_id: patient.id,
        category: "metabolic",
        summary,
        recommendations,
        status: metCategory?.status || "normal",
        updated_by: (await supabase.auth.getUser()).data.user?.id || "",
      } as any, { onConflict: "patient_id,category" });
    setSaving(false);
    if (error) toast.error("Failed to save");
    else { toast.success("Saved successfully"); onDataChanged?.(); }
  };

  // Metabolic biomarkers (single-column list) — same shape as Cardiovascular
  const METABOLIC_BIOMARKERS: Array<{
    key: string;
    label: string;
    sidebarLabel?: string;
    unit: string;
    refLow?: number;
    refHigh?: number;
    accentColorVar: string;
  }> = [
    { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", refLow: 60, accentColorVar: "hsl(200 70% 40%)" },
    { key: "creatinine_umol_l", label: "Creatinine", unit: "µmol/L", refLow: 45, refHigh: 110, accentColorVar: "hsl(220 50% 45%)" },
    { key: "fasting_glucose_mmol_l", label: "Fasting Glucose", unit: "mmol/L", refLow: 3.9, refHigh: 5.6, accentColorVar: "hsl(340 60% 45%)" },
    { key: "hba1c_metabolic", label: "HbA1c", unit: "mmol/mol", refHigh: 42, accentColorVar: "hsl(15 60% 45%)" },
    { key: "tsh_mu_l", label: "TSH", unit: "mIU/L", refLow: 0.4, refHigh: 4.0, accentColorVar: "hsl(280 50% 45%)" },
    { key: "free_t4_pmol_l", label: "Free T4", unit: "pmol/L", refLow: 12, refHigh: 22, accentColorVar: "hsl(260 50% 45%)" },
    { key: "vitamin_d_25oh_nmol_l", label: "Vitamin D (25-OH)", unit: "nmol/L", refLow: 75, accentColorVar: "hsl(45 70% 40%)" },
    { key: "vitamin_b12_total_ng_l", label: "Vitamin B12", unit: "ng/L", refLow: 200, refHigh: 900, accentColorVar: "hsl(160 55% 35%)" },
    { key: "ferritin_ug_l", label: "Ferritin", unit: "µg/L", refLow: 30, refHigh: 300, accentColorVar: "hsl(25 45% 30%)" },
    { key: "folate_ug_l", label: "Folate", unit: "µg/L", refLow: 5.9, accentColorVar: "hsl(120 40% 35%)" },
    { key: "potassium_mmol_l", label: "Potassium", unit: "mmol/L", refLow: 3.5, refHigh: 5.0, accentColorVar: "hsl(180 50% 40%)" },
    { key: "sodium_mmol_l", label: "Sodium", unit: "mmol/L", refLow: 136, refHigh: 145, accentColorVar: "hsl(190 55% 40%)" },
    { key: "calcium_mmol_l", label: "Calcium", unit: "mmol/L", refLow: 2.15, refHigh: 2.55, accentColorVar: "hsl(40 70% 40%)" },
  ];

  const selectMarker = (b: typeof METABOLIC_BIOMARKERS[number]) =>
    setSelectedMarker({
      key: b.key,
      label: b.sidebarLabel ?? b.label,
      unit: b.unit,
      refLow: b.refLow,
      refHigh: b.refHigh,
      accentColorVar: b.accentColorVar,
    });

  return (
    <div className="space-y-4">
      {/* ─────────────── 1. HEADER ─────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Beaker className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Metabolic Health</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Risk Index scale: 1 = no action needed → 10 = immediate action
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-2xl font-bold leading-none ${scoreColor}`}>
                  {Number(compositeScore).toFixed(1)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-card text-foreground border-border shadow-card hover:bg-accent"
                onClick={() => setShowRiskHistory(!showRiskHistory)}
              >
                <Activity className="h-3.5 w-3.5" />
                {showRiskHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Sub-dimension indices — compact secondary row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {subScores.map((sub) => {
              const sc = scoreColorFn(sub.score);
              return (
                <button
                  key={sub.key}
                  onClick={() => onNavigateDimension(sub.key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card transition-colors hover:border-primary/40 cursor-pointer"
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{sub.label}</span>
                  <span className={`text-[12px] font-bold ${sc}`}>{sub.score.toFixed(1)}</span>
                </button>
              );
            })}
          </div>

          {showRiskHistory && (
            <>
              {riskHistory.length > 1 ? (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={riskHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => [`${value}/10`, "Risk Index"]} />
                      <ReferenceArea y1={0} y2={3} fill="hsl(142 76% 36%)" fillOpacity={0.08} label={{ value: "Low", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <ReferenceArea y1={3} y2={6} fill="hsl(48 96% 53%)" fillOpacity={0.08} label={{ value: "Medium", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <ReferenceArea y1={6} y2={10} fill="hsl(0 84% 60%)" fillOpacity={0.08} label={{ value: "High", position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} activeDot={{ r: 7 }} name="Risk Index" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Not enough data points to show history.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─────────────── 2. RISK PICTURE ─────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risk Picture</h2>
          <p className="text-xs text-muted-foreground">What is driving the current risk index</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-1 self-start">
              <button
                onClick={() => { setSubTab("risk_factors"); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all ${
                  subTab === "risk_factors" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Risk Factors
              </button>
              <button
                onClick={() => { setSubTab("lab_graphs"); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all ${
                  subTab === "lab_graphs" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lab Results
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {subTab === "risk_factors" && (
              <div className="divide-y border rounded-md">
                {riskFactors.map((f) => {
                  const expanded = expandedRows.has(f.key);
                  return (
                    <div key={f.key} className="border-b last:border-0">
                      <button
                        onClick={() => toggleRow(f.key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-medium text-sm">{f.label}</span>
                          <span className="text-sm text-muted-foreground">{f.value}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{onboardingDate}</span>
                          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {expanded && <div className="px-4 pb-4 pt-0">{f.detail}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {subTab === "lab_graphs" && (
              <div className="flex gap-4">
                <div className="grid grid-cols-1 gap-4 flex-1 min-w-0">
                  {METABOLIC_BIOMARKERS.map((b) => (
                    <CardioLabBiomarkerPanel
                      key={b.key}
                      biomarkerKey={b.key}
                      label={b.label}
                      unit={b.unit}
                      refLow={b.refLow}
                      refHigh={b.refHigh}
                      accentColorVar={b.accentColorVar}
                      selected={selectedMarker?.key === b.key}
                      onSelect={() => selectMarker(b)}
                      patientId={patient.id}
                      patientName={patient.full_name}
                      labResults={labResults}
                    />
                  ))}
                </div>

                {selectedMarker && (() => {
                  const rows = getSeriesRowsForBiomarker(
                    selectedMarker.key,
                    sidebarWindow,
                    selectedMarker.refLow,
                    selectedMarker.refHigh,
                    patient.id,
                  );
                  return (
                    <div
                      className="w-[380px] shrink-0 border rounded-lg bg-card flex flex-col animate-in slide-in-from-right-5 duration-200 self-start sticky top-4 max-h-[calc(100vh-2rem)]"
                      style={{ borderLeftWidth: 4, borderLeftColor: selectedMarker.accentColorVar }}
                    >
                      <div className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10 rounded-t-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: selectedMarker.accentColorVar }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{selectedMarker.label}</h3>
                            {selectedMarker.unit && (
                              <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="p-4 flex-1 overflow-auto space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">Data points</p>
                          <div className="inline-flex rounded-md border bg-muted/50 p-0.5 text-[10px]">
                            {(["6m", "1y", "3y", "all"] as const).map((w) => (
                              <button
                                key={w}
                                onClick={() => setSidebarWindow(w)}
                                className={cn(
                                  "px-1.5 py-0.5 rounded-sm transition-colors",
                                  sidebarWindow === w
                                    ? "bg-background text-foreground shadow-sm font-medium"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {w === "all" ? "All" : w}
                              </button>
                            ))}
                          </div>
                        </div>

                        {rows.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">No data recorded yet.</p>
                        ) : (
                          <div className="border rounded-md overflow-hidden">
                            <div className="max-h-64 overflow-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/40 sticky top-0">
                                  <tr>
                                    <th className="text-left font-medium px-2 py-1.5">Date</th>
                                    <th className="text-left font-medium px-2 py-1.5">Value</th>
                                    <th className="text-left font-medium px-2 py-1.5">In range</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((r) => (
                                    <tr key={r.date} className="border-t">
                                      <td className="px-2 py-1.5 text-muted-foreground">{r.date}</td>
                                      <td className="px-2 py-1.5 font-medium">{r.value}</td>
                                      <td className="px-2 py-1.5">
                                        {r.inRange === null ? (
                                          <span className="text-muted-foreground">—</span>
                                        ) : r.inRange ? (
                                          <span className="inline-flex items-center gap-1 text-[hsl(142_60%_35%)]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142_60%_45%)]" />
                                            Yes
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-destructive">
                                            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                            No
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─────────────── 3. MEDICATIONS ─────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Medications</h2>
          <p className="text-xs text-muted-foreground">What we are doing about it</p>
        </div>
        <DimensionMedicationsSection
          dimensionKey="metabolic"
          dimensionLabel="Metabolic Health"
          onNavigateToMedications={() => onNavigateDimension("medications")}
          patientId={patient.id}
          patientName={patient.full_name}
        />
      </section>

      {/* ─────────────── 4. CLINICAL SYNTHESIS ─────────────── */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clinical Synthesis</h2>
          <p className="text-xs text-muted-foreground">Doctor's interpretation and care plan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Doctor's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write a clinical summary for the metabolic dimension..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[160px] resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write recommendations for the metabolic care plan..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="min-h-[160px] resize-none"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Summary & Recommendations"}
          </Button>
        </div>
      </section>
    </div>
  );
}
