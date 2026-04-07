import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Beaker, Activity, Save, X } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea,
} from "recharts";
import { DraggableReferenceChart } from "@/components/patients/DraggableReferenceChart";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// ── Reference values for metabolic markers ──────────────────────────
const METABOLIC_REFS: Record<string, { low?: number; high?: number; label: string }> = {
  // Nutrition
  holotranscobalamin_pmol_l: { low: 50, label: "Holotranscobalamin" },
  vitamin_b12_total_ng_l: { low: 200, high: 900, label: "Vitamin B12 (total)" },
  vitamin_d_25oh_nmol_l: { low: 75, label: "Vitamin D (25-OH)" },
  folate_ug_l: { low: 5.9, label: "Folate" },
  phosphate_mmol_l: { low: 0.8, high: 1.5, label: "Phosphate" },
  iron_serum_umol_l: { low: 10, high: 30, label: "Iron (serum)" },
  ferritin_ug_l: { low: 30, high: 300, label: "Ferritin" },
  transferrin_receptor_mg_l: { high: 4.4, label: "Transferrin Receptor" },
  transferrin_g_l: { low: 2.0, high: 3.6, label: "Transferrin" },
  transferrin_saturation_pct: { low: 20, high: 50, label: "Transferrin Saturation" },
  total_protein_g_l: { low: 64, high: 83, label: "Total Protein" },
  prealbumin_g_l: { low: 0.2, high: 0.4, label: "Prealbumin" },
  // Endocrine
  free_t4_pmol_l: { low: 12, high: 22, label: "Free T4" },
  tsh_mu_l: { low: 0.4, high: 4.0, label: "TSH" },
  // Kidneys
  egfr: { low: 60, label: "eGFR" },
  calcium_mmol_l: { low: 2.15, high: 2.55, label: "Calcium" },
  calcium_adjusted_mmol_l: { low: 2.15, high: 2.55, label: "Calcium (adjusted)" },
  calcium_ionised_mmol_l: { low: 1.15, high: 1.30, label: "Calcium (ionised)" },
  potassium_mmol_l: { low: 3.5, high: 5.0, label: "Potassium" },
  creatinine_umol_l: { low: 45, high: 110, label: "Creatinine" },
  cystatin_c: { high: 1.03, label: "Cystatin C" },
  magnesium_mmol_l: { low: 0.7, high: 1.0, label: "Magnesium" },
  sodium_mmol_l: { low: 136, high: 145, label: "Sodium" },
  urine_acr_mg_mmol: { high: 3.0, label: "Urine ACR" },
};

// Group markers by sub-dimension
const NUTRITION_MARKERS = [
  "holotranscobalamin_pmol_l", "vitamin_b12_total_ng_l", "vitamin_d_25oh_nmol_l",
  "folate_ug_l", "phosphate_mmol_l", "iron_serum_umol_l", "ferritin_ug_l",
  "transferrin_receptor_mg_l", "transferrin_g_l", "transferrin_saturation_pct",
  "total_protein_g_l", "prealbumin_g_l",
];

const ENDOCRINE_MARKERS = ["free_t4_pmol_l", "tsh_mu_l"];

const KIDNEY_MARKERS = [
  "egfr", "calcium_mmol_l", "calcium_adjusted_mmol_l", "calcium_ionised_mmol_l",
  "potassium_mmol_l", "creatinine_umol_l", "cystatin_c", "magnesium_mmol_l",
  "sodium_mmol_l", "urine_acr_mg_mmol",
];

const UNIT_MAP: Record<string, string> = {
  holotranscobalamin_pmol_l: "pmol/L",
  vitamin_b12_total_ng_l: "ng/L",
  vitamin_d_25oh_nmol_l: "nmol/L",
  folate_ug_l: "µg/L",
  phosphate_mmol_l: "mmol/L",
  iron_serum_umol_l: "µmol/L",
  ferritin_ug_l: "µg/L",
  transferrin_receptor_mg_l: "mg/L",
  transferrin_g_l: "g/L",
  transferrin_saturation_pct: "%",
  total_protein_g_l: "g/L",
  prealbumin_g_l: "g/L",
  free_t4_pmol_l: "pmol/L",
  tsh_mu_l: "mU/L",
  egfr: "mL/min/1.73m²",
  calcium_mmol_l: "mmol/L",
  calcium_adjusted_mmol_l: "mmol/L",
  calcium_ionised_mmol_l: "mmol/L",
  potassium_mmol_l: "mmol/L",
  creatinine_umol_l: "µmol/L",
  cystatin_c: "mg/L",
  magnesium_mmol_l: "mmol/L",
  sodium_mmol_l: "mmol/L",
  urine_acr_mg_mmol: "mg/mmol",
};

type SubTab = "risk_factors" | "lab_nutrition" | "lab_endocrine" | "lab_kidneys" | "total_risk";

// ── Sub-dimension score computation ─────────────────────────────
type SubDimScore = { key: string; label: string; score: number };

function computeSubDimScores(
  onboarding: Tables<"patient_onboarding"> | null,
  lab: Tables<"patient_lab_results"> | null,
): SubDimScore[] {
  // Helper: check if a lab value is out of ref range
  const outOfRange = (val: number | null | undefined, ref: { low?: number; high?: number }): boolean => {
    if (val == null) return false;
    if (ref.low != null && val < ref.low) return true;
    if (ref.high != null && val > ref.high) return true;
    return false;
  };

  // Count how many markers in a group are out of range
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

  // 2.1 Endocrine System
  let endoScore = 1;
  if (onboarding?.illness_hormone) endoScore += 3;
  const endoOor = countOutOfRange(ENDOCRINE_MARKERS);
  endoScore += endoOor * 2;
  endoScore = Math.min(endoScore, 10);

  // 2.2 Kidneys
  let kidneyScore = 1;
  if (onboarding?.illness_kidney) kidneyScore += 3;
  if (onboarding?.symptom_kidney_function) kidneyScore += 1;
  const kidneyOor = countOutOfRange(KIDNEY_MARKERS);
  kidneyScore += Math.min(kidneyOor * 1.5, 6);
  kidneyScore = Math.min(Math.round(kidneyScore), 10);

  // 2.3 Body Composition
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

  // 2.4 Nutrition
  let nutritionScore = 1;
  const nutritionOor = countOutOfRange(NUTRITION_MARKERS);
  if (nutritionOor >= 4) nutritionScore += 4;
  else if (nutritionOor >= 2) nutritionScore += 2;
  else if (nutritionOor >= 1) nutritionScore += 1;
  // Check diet markers from onboarding
  if (onboarding?.fruits_vegetables_g_per_day != null && Number(onboarding.fruits_vegetables_g_per_day) < 400) nutritionScore += 1;
  if (onboarding?.fiber_g_per_day != null && Number(onboarding.fiber_g_per_day) < 25) nutritionScore += 1;
  nutritionScore = Math.min(nutritionScore, 10);

  // 2.5 Metabolism
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

function computeCompositeScore(subs: SubDimScore[]): number {
  if (subs.length === 0) return 1;
  // Weighted average rounded, clamped 1-10
  const avg = subs.reduce((sum, s) => sum + s.score, 0) / subs.length;
  return Math.max(1, Math.min(10, Math.round(avg)));
}

const scoreColorFn = (s: number) => s <= 3 ? "text-green-600" : s <= 6 ? "text-amber-600" : "text-destructive";
const scoreBgFn = (s: number) => s <= 3 ? "bg-green-100" : s <= 6 ? "bg-amber-100" : "bg-red-100";

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
  markerNotes, setMarkerNotes, onNavigateDimension, onDataChanged,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("risk_factors");
  const [selectedMarker, setSelectedMarker] = useState<{ key: string; label: string; unit: string } | null>(null);
  const [customRefs, setCustomRefs] = useState<Record<string, { low?: number; high?: number }>>({});
  const [saving, setSaving] = useState(false);
  const [showRiskHistory, setShowRiskHistory] = useState(false);

  const metCategory = healthCategories.find((c) => c.category.toLowerCase() === "metabolic");
  const [summary, setSummary] = useState(metCategory?.summary || "");
  const [recommendations, setRecommendations] = useState((metCategory as any)?.recommendations || "");

  const lab = labResults[0] || null;
  const subScores = useMemo(() => computeSubDimScores(onboarding, lab), [onboarding, lab]);
  const compositeScore = useMemo(() => computeCompositeScore(subScores), [subScores]);

  const scoreColor = scoreColorFn(compositeScore);
  const scoreBg = scoreBgFn(compositeScore);

  const sorted = useMemo(() =>
    [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date)),
    [labResults],
  );

  // Risk history
  const riskHistory = useMemo(() => {
    const computed = sorted.map((sortedLab) => {
      const subs = computeSubDimScores(onboarding, sortedLab);
      return { date: sortedLab.result_date, score: computeCompositeScore(subs) };
    });
    if (computed.length < 2) {
      return [
        { date: "2023-06-01", score: 3 }, { date: "2023-12-01", score: 4 },
        { date: "2024-06-01", score: 3 }, { date: "2025-01-01", score: 5 },
        ...computed,
      ];
    }
    return computed;
  }, [sorted, onboarding]);

  const onboardingDate = onboarding?.created_at ? new Date(onboarding.created_at).toLocaleDateString() : "—";

  const riskFactors = [
    { label: "BMI", value: onboarding?.bmi != null ? String(onboarding.bmi) : "—" },
    { label: "Waist Circumference (cm)", value: onboarding?.waist_circumference_cm != null ? String(onboarding.waist_circumference_cm) : "—" },
    { label: "Waist-Hip Ratio", value: onboarding?.waist_to_hip_ratio != null ? String(onboarding.waist_to_hip_ratio) : "—" },
    { label: "Endocrine / Hormone Illness", value: onboarding?.illness_hormone ? "Yes" : "No" },
    { label: "Kidney Illness", value: onboarding?.illness_kidney ? "Yes" : "No" },
    { label: "Weight (kg)", value: onboarding?.weight_kg != null ? String(onboarding.weight_kg) : "—" },
    { label: "Height (cm)", value: onboarding?.height_cm != null ? String(onboarding.height_cm) : "—" },
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

  // Helper to render a group of lab charts
  const renderLabGroup = (markerKeys: string[]) => {
    return (
      <div className="flex gap-4">
        <div className={`grid grid-cols-1 ${selectedMarker ? "lg:grid-cols-1" : "lg:grid-cols-2"} gap-4 flex-1 min-w-0`}>
          {markerKeys.map((key) => {
            const ref = METABOLIC_REFS[key];
            if (!ref) return null;
            const data = sorted
              .filter((l) => (l as any)[key] != null)
              .map((l) => ({ date: l.result_date, value: Number((l as any)[key]) }));
            const unit = UNIT_MAP[key] || "";

            return (
              <Card
                key={key}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedMarker?.key === key ? "border-primary" : ""}`}
                onClick={() => setSelectedMarker({ key, label: ref.label, unit })}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{ref.label} ({unit})</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.length > 0 ? (
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          {ref.low != null && ref.high != null && (
                            <ReferenceArea y1={ref.low} y2={ref.high} fill="hsl(var(--primary))" fillOpacity={0.08} />
                          )}
                          {ref.low != null && !ref.high && (
                            <ReferenceArea y1={ref.low} y2={ref.low * 3} fill="hsl(var(--primary))" fillOpacity={0.08} />
                          )}
                          {ref.high != null && !ref.low && (
                            <ReferenceArea y1={0} y2={ref.high} fill="hsl(var(--primary))" fillOpacity={0.08} />
                          )}
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name={ref.label} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center">No data available.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedMarker && (() => {
          const detailData = sorted
            .map((lab) => {
              const val = (lab as any)[selectedMarker.key];
              return val != null ? { date: lab.result_date, value: Number(val) } : null;
            })
            .filter(Boolean) as { date: string; value: number }[];

          const ref = {
            ...METABOLIC_REFS[selectedMarker.key],
            ...customRefs[selectedMarker.key],
          };

          return (
            <div className="w-[380px] shrink-0 border rounded-lg bg-card flex flex-col animate-in slide-in-from-right-5 duration-200">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-semibold text-sm">{selectedMarker.label}</h3>
                  <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 flex-1 overflow-auto">
                {detailData.length < 1 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data points available.</p>
                ) : (
                  <DraggableReferenceChart
                    chartData={detailData}
                    refValues={ref}
                    onRefChange={(newRef) => {
                      setCustomRefs((prev) => ({
                        ...prev,
                        [selectedMarker.key]: { ...(METABOLIC_REFS[selectedMarker.key] || {}), ...prev[selectedMarker.key], ...newRef },
                      }));
                    }}
                  />
                )}
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Reference Values</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Low</Label>
                      <Input type="number" step="any" placeholder="—" className="h-8 text-xs"
                        value={ref?.low ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value);
                          setCustomRefs((prev) => ({ ...prev, [selectedMarker.key]: { ...prev[selectedMarker.key], low: val } }));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">High</Label>
                      <Input type="number" step="any" placeholder="—" className="h-8 text-xs"
                        value={ref?.high ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value);
                          setCustomRefs((prev) => ({ ...prev, [selectedMarker.key]: { ...prev[selectedMarker.key], high: val } }));
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-xs">Doctor Notes</Label>
                  <Textarea
                    placeholder="Add notes about this marker..."
                    className="mt-1 min-h-[80px] text-xs resize-none"
                    value={markerNotes[selectedMarker.key] || ""}
                    onChange={(e) => setMarkerNotes((prev) => ({ ...prev, [selectedMarker.key]: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const lab = labResults[0] || null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Beaker className="h-5 w-5 text-primary" />
              Metabolic Health
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreBg}`}>
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={`text-lg font-bold ${scoreColor}`}>{riskScore}/10</span>
              </div>
              <Button
                variant={showRiskHistory ? "default" : "outline"} size="sm" className="gap-1.5 text-xs"
                onClick={() => setShowRiskHistory(!showRiskHistory)}
              >
                <Activity className="h-3.5 w-3.5" />
                {showRiskHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">1 = no action needed → 10 = immediate action</p>
        </CardHeader>

        {showRiskHistory && (
          <CardContent className="pt-0">
            {riskHistory.length > 1 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={riskHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => [`${value}/10`, "Risk Index"]} />
                    <ReferenceArea y1={0} y2={3} fill="hsl(142 76% 36%)" fillOpacity={0.08} />
                    <ReferenceArea y1={3} y2={6} fill="hsl(48 96% 53%)" fillOpacity={0.08} />
                    <ReferenceArea y1={6} y2={10} fill="hsl(0 84% 60%)" fillOpacity={0.08} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 5 }} name="Risk Index" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Not enough data points.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Summary & Recommendations */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Doctor's Summary</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Write a clinical summary for metabolic health..." value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-[120px] resize-none" />
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Write recommendations for metabolic care plan..." value={recommendations} onChange={(e) => setRecommendations(e.target.value)} className="min-h-[120px] resize-none" />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Right: Sub-tabs */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground gap-1 flex-wrap">
            {([
              ["risk_factors", "Risk Factors"],
              ["lab_nutrition", "Nutrition Labs"],
              ["lab_endocrine", "Endocrine Labs"],
              ["lab_kidneys", "Kidney Labs"],
              ["total_risk", "Total Risk"],
            ] as [SubTab, string][]).map(([key, label]) => (
              <button key={key}
                onClick={() => { setSubTab(key); setSelectedMarker(null); }}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                  subTab === key ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Risk Factors */}
          {subTab === "risk_factors" && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Risk Factors from Onboarding</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factor</TableHead><TableHead>Value</TableHead><TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskFactors.map((f) => (
                      <TableRow key={f.label}>
                        <TableCell className="font-medium text-sm">{f.label}</TableCell>
                        <TableCell className="text-sm">{f.value}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{onboardingDate}</TableCell>
                      </TableRow>
                    ))}
                    {onboarding?.illness_kidney_notes && (
                      <TableRow>
                        <TableCell className="font-medium text-sm">Kidney Illness Notes</TableCell>
                        <TableCell colSpan={2} className="text-sm">{onboarding.illness_kidney_notes}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Nutrition Labs */}
          {subTab === "lab_nutrition" && renderLabGroup(NUTRITION_MARKERS)}

          {/* Endocrine Labs */}
          {subTab === "lab_endocrine" && renderLabGroup(ENDOCRINE_MARKERS)}

          {/* Kidney Labs */}
          {subTab === "lab_kidneys" && renderLabGroup(KIDNEY_MARKERS)}

          {/* Total Risk */}
          {subTab === "total_risk" && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Total Metabolic Risk Assessment</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center h-20 w-20 rounded-full ${scoreBg}`}>
                    <span className={`text-3xl font-bold ${scoreColor}`}>{riskScore}</span>
                  </div>
                  <div>
                    <p className="font-medium">Risk Score: {riskScore}/10</p>
                    <p className="text-sm text-muted-foreground">
                      {riskScore <= 3 ? "Low risk — continue monitoring" : riskScore <= 6 ? "Moderate risk — consider intervention" : "High risk — action recommended"}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Contributing Factors</p>
                  <div className="space-y-2 text-sm">
                    {onboarding?.illness_hormone && (
                      <div className="flex items-center gap-2"><Badge variant="destructive" className="text-xs">High</Badge><span>Endocrine / hormone illness</span></div>
                    )}
                    {onboarding?.illness_kidney && (
                      <div className="flex items-center gap-2"><Badge variant="destructive" className="text-xs">High</Badge><span>Kidney illness</span></div>
                    )}
                    {onboarding?.bmi && Number(onboarding.bmi) > 30 && (
                      <div className="flex items-center gap-2"><Badge variant="destructive" className="text-xs">High</Badge><span>BMI &gt; 30: {onboarding.bmi}</span></div>
                    )}
                    {onboarding?.bmi && Number(onboarding.bmi) < 18.5 && (
                      <div className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">Moderate</Badge><span>BMI &lt; 18.5: {onboarding.bmi}</span></div>
                    )}
                    {lab?.tsh_mu_l && (Number(lab.tsh_mu_l) < 0.4 || Number(lab.tsh_mu_l) > 4.0) && (
                      <div className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">Moderate</Badge><span>TSH out of range: {lab.tsh_mu_l} mU/L</span></div>
                    )}
                    {lab?.egfr && Number(lab.egfr) < 60 && (
                      <div className="flex items-center gap-2"><Badge variant="destructive" className="text-xs">High</Badge><span>Low eGFR: {lab.egfr} mL/min/1.73m²</span></div>
                    )}
                    {lab?.hba1c_mmol_mol && Number(lab.hba1c_mmol_mol) > 42 && (
                      <div className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">Moderate</Badge><span>Elevated HbA1c: {lab.hba1c_mmol_mol} mmol/mol</span></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
