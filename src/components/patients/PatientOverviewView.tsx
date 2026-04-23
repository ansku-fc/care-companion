import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle, Plus, Pill, Stethoscope, ClipboardList, Users,
  FlaskConical, Calendar as CalendarIcon, Pencil, Trash2, FileText, Ruler,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1", tier_2: "Tier 2", tier_3: "Tier 3", tier_4: "Tier 4",
  children: "Children", onboarding: "Onboarding", acute: "Acute", case_management: "Case Management",
};

// Risk colour helpers
function scoreColorClass(score: number): string {
  if (score <= 3) return "text-[hsl(189_94%_43%)]";  /* teal */
  if (score <= 6) return "text-[hsl(330_81%_60%)]";  /* pink */
  return "text-[hsl(330_81%_50%)]";                  /* hot pink-red */
}
function scoreBorderColor(score: number): string {
  if (score <= 3) return "hsl(189 94% 43%)";
  if (score <= 6) return "hsl(330 81% 60%)";
  return "hsl(330 81% 50%)";
}

interface Props {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  appointments: Tables<"appointments">[];
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  tasks: any[];
  onSelectSection: (key: string) => void;
  onTasksChanged: () => void;
  onDataChanged: () => void;
}

export function PatientOverviewView({
  patient, onboarding, appointments, labResults, healthCategories,
  tasks, onSelectSection, onTasksChanged, onDataChanged,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [considerations, setConsiderations] = useState<any[]>([]);

  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [newAllergy, setNewAllergy] = useState({ allergen: "", reaction: "", severity: "moderate" });
  const [showMedForm, setShowMedForm] = useState(false);
  const [newMed, setNewMed] = useState({ medication_name: "", dose: "", frequency: "", indication: "", start_date: "" });
  const [showConsiderationForm, setShowConsiderationForm] = useState(false);
  const [newConsideration, setNewConsideration] = useState({ title: "", description: "", category: "other" });

  const [showBioForm, setShowBioForm] = useState(false);
  const [bioForm, setBioForm] = useState({
    height_cm: "",
    weight_kg: "",
    waist_circumference_cm: "",
    waist_to_hip_ratio: "",
  });

  useEffect(() => {
    setBioForm({
      height_cm: onboarding?.height_cm?.toString() ?? "",
      weight_kg: onboarding?.weight_kg?.toString() ?? "",
      waist_circumference_cm: onboarding?.waist_circumference_cm?.toString() ?? "",
      waist_to_hip_ratio: onboarding?.waist_to_hip_ratio?.toString() ?? "",
    });
  }, [onboarding]);

  const fetchOverviewData = async () => {
    const [diagRes, medRes, teamRes, allergyRes, considRes] = await Promise.all([
      supabase.from("patient_diagnoses").select("*").eq("patient_id", patient.id).eq("status", "active").order("diagnosed_date", { ascending: false }),
      supabase.from("patient_medications").select("*").eq("patient_id", patient.id).eq("status", "active").order("medication_name"),
      supabase.from("patient_care_team").select("*").eq("patient_id", patient.id).eq("is_active", true).order("role"),
      supabase.from("patient_allergies" as any).select("*").eq("patient_id", patient.id).eq("status", "active").order("allergen"),
      supabase.from("patient_clinical_considerations" as any).select("*").eq("patient_id", patient.id).eq("is_active", true).order("created_at", { ascending: false }),
    ]);
    setDiagnoses(diagRes.data || []);
    setMedications(medRes.data || []);
    setCareTeam(teamRes.data || []);
    setAllergies(allergyRes.data || []);
    setConsiderations(considRes.data || []);
  };

  useEffect(() => { fetchOverviewData(); }, [patient.id]);

  // ── Derived data ─────────────────────────────────────────
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : null;

  const personalDoctor = careTeam.find((m) => m.role === "personal_doctor");

  const memberSince = new Date(patient.created_at).toLocaleDateString("en-GB", {
    month: "short", year: "numeric",
  });

  // Next appointment
  const nextAppointment = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => new Date(a.start_time).getTime() >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
  }, [appointments]);

  // Recent labs
  const sortedLabs = useMemo(
    () => [...labResults].sort((a, b) => new Date(b.result_date).getTime() - new Date(a.result_date).getTime()),
    [labResults],
  );
  const recentLabsTop3 = sortedLabs.slice(0, 3);

  // ── Alerts ───────────────────────────────────────────────
  const openTasks = tasks.filter((t) => t.status !== "done");
  const severeAllergies = allergies.filter((a: any) => a.severity === "severe");
  const moderateAllergies = allergies.filter((a: any) => a.severity === "moderate");

  const overdueTasksCount = openTasks.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() < Date.now(),
  ).length;

  const hasAlerts = openTasks.length > 0 || severeAllergies.length > 0 || moderateAllergies.length > 0;
  const alertSeverity: "high" | "medium" | "none" =
    severeAllergies.length > 0 || overdueTasksCount > 0 ? "high"
      : (openTasks.length > 0 || moderateAllergies.length > 0) ? "medium"
        : "none";

  const alertBarClass =
    alertSeverity === "high" ? "bg-[hsl(0_57%_39%/0.08)] border-[hsl(0_57%_39%/0.25)]"
      : alertSeverity === "medium" ? "bg-[hsl(28_63%_44%/0.08)] border-[hsl(28_63%_44%/0.25)]"
        : "bg-card border-border";

  // ── Risk index per main dimension (dummy varied scores) ──
  const DIMENSION_RISK_SCORES: Record<string, number> = {
    brain_mental: 3.2,
    metabolic: 6.7,
    cardiovascular: 8.4,
    exercise_functional: 2.1,
    digestion: 5.5,
    respiratory_immune: 4.8,
    cancer_risk: 7.3,
    skin_oral_mucosal: 1.9,
    reproductive_sexual: 3.6,
  };
  const dimensionScore = (key: string): number => DIMENSION_RISK_SCORES[key] ?? 1;

  // ── Inline add handlers ──────────────────────────────────
  const handleAddAllergy = async () => {
    if (!user || !newAllergy.allergen.trim()) return;
    const { error } = await supabase.from("patient_allergies" as any).insert({
      patient_id: patient.id, created_by: user.id,
      allergen: newAllergy.allergen.trim(),
      reaction: newAllergy.reaction.trim() || null,
      severity: newAllergy.severity,
    } as any);
    if (error) { toast.error("Failed to add allergy"); return; }
    toast.success("Allergy added");
    setNewAllergy({ allergen: "", reaction: "", severity: "moderate" });
    setShowAllergyForm(false);
    fetchOverviewData();
  };

  const handleAddMedication = async () => {
    if (!user || !newMed.medication_name.trim()) return;
    const { error } = await supabase.from("patient_medications").insert({
      patient_id: patient.id, created_by: user.id,
      medication_name: newMed.medication_name.trim(),
      dose: newMed.dose.trim() || null,
      frequency: newMed.frequency.trim() || null,
      indication: newMed.indication.trim() || null,
      start_date: newMed.start_date || null,
    });
    if (error) { toast.error("Failed to add medication"); return; }
    toast.success("Medication added");
    setNewMed({ medication_name: "", dose: "", frequency: "", indication: "", start_date: "" });
    setShowMedForm(false);
    fetchOverviewData();
  };

  const handleAddConsideration = async () => {
    if (!user || !newConsideration.title.trim()) return;
    const { error } = await supabase.from("patient_clinical_considerations" as any).insert({
      patient_id: patient.id, created_by: user.id,
      title: newConsideration.title.trim(),
      description: newConsideration.description.trim() || null,
      category: newConsideration.category,
    } as any);
    if (error) { toast.error("Failed to add consideration"); return; }
    toast.success("Consideration added");
    setNewConsideration({ title: "", description: "", category: "other" });
    setShowConsiderationForm(false);
    fetchOverviewData();
  };

  // Compute BMI from current form values (or stored values) when both height and weight are present
  const parseNum = (v: string | null | undefined): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const formHeight = parseNum(bioForm.height_cm);
  const formWeight = parseNum(bioForm.weight_kg);
  const computedBmi =
    formHeight && formWeight && formHeight > 0
      ? +(formWeight / Math.pow(formHeight / 100, 2)).toFixed(1)
      : onboarding?.bmi ?? null;

  const handleSaveBiometrics = async () => {
    if (!user) return;
    const height = parseNum(bioForm.height_cm);
    const weight = parseNum(bioForm.weight_kg);
    const waist = parseNum(bioForm.waist_circumference_cm);
    const whr = parseNum(bioForm.waist_to_hip_ratio);
    const bmi =
      height && weight && height > 0
        ? +(weight / Math.pow(height / 100, 2)).toFixed(1)
        : null;

    let error;
    if (onboarding) {
      const res = await supabase
        .from("patient_onboarding")
        .update({
          height_cm: height,
          weight_kg: weight,
          waist_circumference_cm: waist,
          waist_to_hip_ratio: whr,
          bmi,
        })
        .eq("id", onboarding.id);
      error = res.error;
    } else {
      const res = await supabase.from("patient_onboarding").insert({
        patient_id: patient.id,
        created_by: user.id,
        height_cm: height,
        weight_kg: weight,
        waist_circumference_cm: waist,
        waist_to_hip_ratio: whr,
        bmi,
      });
      error = res.error;
    }

    if (error) { toast.error("Failed to save biometrics"); return; }
    toast.success("Biometrics updated");
    setShowBioForm(false);
    onDataChanged();
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-1 overflow-auto h-full">
      {/* 1. HEADER BUTTONS — top right */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Generate Patient Report
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectSection("details")}>
          Edit patient details
        </Button>
      </div>

      {/* 2. ALERTS BAR */}
      <Card className={cn("border shadow-card transition-colors", alertBarClass)}>
        <CardContent className="py-3 px-4">
          {!hasAlerts ? (
            <p className="text-sm text-muted-foreground">No active alerts</p>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <AlertTriangle className={cn(
                "h-4 w-4 shrink-0",
                alertSeverity === "high" ? "text-[hsl(0_57%_39%)]" : "text-[hsl(28_63%_44%)]",
              )} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm flex-1">
                {openTasks.length > 0 && (
                  <button
                    onClick={() => navigate("/tasks")}
                    className="hover:underline text-foreground font-medium"
                  >
                    {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
                    {overdueTasksCount > 0 && (
                      <span className="ml-1.5 text-[hsl(0_57%_39%)]">· {overdueTasksCount} overdue</span>
                    )}
                  </button>
                )}
                {severeAllergies.length > 0 && (
                  <span className="text-[hsl(0_57%_39%)] font-medium">
                    {severeAllergies.length} severe allerg{severeAllergies.length === 1 ? "y" : "ies"}
                  </span>
                )}
                {moderateAllergies.length > 0 && (
                  <span className="text-[hsl(28_63%_44%)]">
                    {moderateAllergies.length} moderate allerg{moderateAllergies.length === 1 ? "y" : "ies"}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. CLINICAL SNAPSHOT — TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Active Diagnoses + Allergies */}
        <div className="space-y-4">
          {/* Active Diagnoses */}
          <Card className="shadow-card">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Diagnoses</h3>
              </div>
              {diagnoses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active diagnoses recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {diagnoses.map((d) => (
                    <li key={d.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{d.diagnosis}</span>
                      {d.diagnosed_date && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(d.diagnosed_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Allergies — inline tags */}
          <Card className="shadow-card">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Allergies</h3>
                <Button
                  variant="ghost" size="sm"
                  className="ml-auto h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAllergyForm((v) => !v)}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {showAllergyForm && (
                <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                  <Input placeholder="Allergen" value={newAllergy.allergen} onChange={(e) => setNewAllergy((p) => ({ ...p, allergen: e.target.value }))} className="h-8 text-sm" />
                  <Input placeholder="Reaction (optional)" value={newAllergy.reaction} onChange={(e) => setNewAllergy((p) => ({ ...p, reaction: e.target.value }))} className="h-8 text-sm" />
                  <Select value={newAllergy.severity} onValueChange={(v) => setNewAllergy((p) => ({ ...p, severity: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddAllergy} disabled={!newAllergy.allergen.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAllergyForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {allergies.length === 0 && !showAllergyForm ? (
                <p className="text-xs text-muted-foreground">No allergies recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((a: any) => (
                    <span
                      key={a.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border",
                        a.severity === "severe" && "bg-[hsl(0_57%_39%/0.08)] text-[hsl(0_57%_39%)] border-[hsl(0_57%_39%/0.25)]",
                        a.severity === "moderate" && "bg-[hsl(28_63%_44%/0.08)] text-[hsl(28_63%_44%)] border-[hsl(28_63%_44%/0.25)]",
                        a.severity === "mild" && "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {a.allergen}
                      <button
                        onClick={async () => {
                          await supabase.from("patient_allergies" as any).update({ status: "inactive" } as any).eq("id", a.id);
                          fetchOverviewData();
                        }}
                        className="opacity-50 hover:opacity-100"
                        aria-label={`Remove ${a.allergen}`}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Active Medications + Clinical Considerations */}
        <div className="space-y-4">
          {/* Active Medications */}
          <Card className="shadow-card">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Active Medications</h3>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowMedForm((v) => !v)}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                  <button
                    onClick={() => onSelectSection("medications")}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    See all →
                  </button>
                </div>
              </div>

              {showMedForm && (
                <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                  <Input placeholder="Medication name *" value={newMed.medication_name} onChange={(e) => setNewMed((p) => ({ ...p, medication_name: e.target.value }))} className="h-8 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Dose" value={newMed.dose} onChange={(e) => setNewMed((p) => ({ ...p, dose: e.target.value }))} className="h-8 text-sm" />
                    <Input placeholder="Frequency" value={newMed.frequency} onChange={(e) => setNewMed((p) => ({ ...p, frequency: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <Input placeholder="Indication" value={newMed.indication} onChange={(e) => setNewMed((p) => ({ ...p, indication: e.target.value }))} className="h-8 text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddMedication} disabled={!newMed.medication_name.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowMedForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {medications.length === 0 && !showMedForm ? (
                <p className="text-xs text-muted-foreground">No active medications recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {medications.map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium">{m.medication_name}</span>
                        {m.dose && <span className="text-muted-foreground ml-1.5">{m.dose}</span>}
                      </div>
                      {m.frequency && <span className="text-xs text-muted-foreground whitespace-nowrap">{m.frequency}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Clinical Considerations */}
          <Card className="shadow-card">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Clinical Considerations</h3>
                <Button
                  variant="ghost" size="sm"
                  className="ml-auto h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConsiderationForm((v) => !v)}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {showConsiderationForm && (
                <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                  <Input placeholder="Title" value={newConsideration.title} onChange={(e) => setNewConsideration((p) => ({ ...p, title: e.target.value }))} className="h-8 text-sm" />
                  <Input placeholder="Description (optional)" value={newConsideration.description} onChange={(e) => setNewConsideration((p) => ({ ...p, description: e.target.value }))} className="h-8 text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddConsideration} disabled={!newConsideration.title.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowConsiderationForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {considerations.length === 0 && !showConsiderationForm ? (
                <p className="text-xs text-muted-foreground">No clinical considerations recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {considerations.map((c: any) => (
                    <li key={c.id} className="text-sm">
                      <p className="font-medium">{c.title}</p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3b. BIOMETRICS */}
      <Card className="shadow-card">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Biometrics</h3>
            <Button
              variant="ghost" size="sm"
              className="ml-auto h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowBioForm((v) => !v)}
            >
              {showBioForm ? "Cancel" : (
                <>
                  <Pencil className="h-3 w-3" /> Edit
                </>
              )}
            </Button>
          </div>

          {showBioForm ? (
            <div className="space-y-2 p-2 border rounded-md bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Height (cm)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={bioForm.height_cm}
                    onChange={(e) => setBioForm((p) => ({ ...p, height_cm: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Weight (kg)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={bioForm.weight_kg}
                    onChange={(e) => setBioForm((p) => ({ ...p, weight_kg: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Waist (cm)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={bioForm.waist_circumference_cm}
                    onChange={(e) => setBioForm((p) => ({ ...p, waist_circumference_cm: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">W/H Ratio</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={bioForm.waist_to_hip_ratio}
                    onChange={(e) => setBioForm((p) => ({ ...p, waist_to_hip_ratio: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                BMI: <span className="font-medium text-foreground">{computedBmi ?? "—"}</span> (auto-calculated)
              </p>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveBiometrics}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowBioForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Height</dt>
                <dd className="text-sm font-medium text-foreground">{onboarding?.height_cm ? `${onboarding.height_cm} cm` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Weight</dt>
                <dd className="text-sm font-medium text-foreground">{onboarding?.weight_kg ? `${onboarding.weight_kg} kg` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">BMI</dt>
                <dd className="text-sm font-medium text-foreground">{computedBmi ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Waist</dt>
                <dd className="text-sm font-medium text-foreground">{onboarding?.waist_circumference_cm ? `${onboarding.waist_circumference_cm} cm` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">W/H Ratio</dt>
                <dd className="text-sm font-medium text-foreground">{onboarding?.waist_to_hip_ratio ?? "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* 4. HEALTH DIMENSIONS — horizontal bar chart */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
          Health Dimensions
        </h3>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <ul className="space-y-1">
              {[...HEALTH_TAXONOMY]
                .map((dim) => ({ dim, score: dimensionScore(dim.key) }))
                .sort((a, b) => b.score - a.score)
                .map(({ dim, score }) => {
                  const Icon = dim.icon;
                  const widthPct = Math.max(4, (score / 10) * 100);
                  const barColor = scoreBorderColor(score);
                  return (
                    <li key={dim.key}>
                      <button
                        onClick={() => onSelectSection(dim.key)}
                        className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-64 shrink-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] font-medium text-foreground whitespace-nowrap">
                            {dim.label}
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span
                          className={cn("text-sm font-semibold tabular-nums w-10 text-right", scoreColorClass(score))}
                        >
                          {score.toFixed(1)}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 5. BOTTOM ROW: Next Visit · Care Team · Recent Labs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
        {/* Next Visit */}
        <Card className="shadow-card">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Next Visit</h3>
              <button
                onClick={() => navigate("/calendar")}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Calendar →
              </button>
            </div>
            {!nextAppointment ? (
              <p className="text-xs text-muted-foreground">No upcoming visits scheduled.</p>
            ) : (
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{nextAppointment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(nextAppointment.start_time).toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "short", year: "numeric",
                  })}
                  {" · "}
                  {new Date(nextAppointment.start_time).toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {nextAppointment.appointment_type.replace("_", " ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Care Team */}
        <Card className="shadow-card">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Care Team</h3>
            </div>
            {careTeam.length === 0 ? (
              <p className="text-xs text-muted-foreground">No care team members assigned.</p>
            ) : (
              <ul className="space-y-1">
                {careTeam.slice(0, 4).map((m) => (
                  <li key={m.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{m.member_name}</span>
                    <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
                      {m.role.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Lab Results */}
        <Card className="shadow-card">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Recent Lab Results</h3>
              <button
                onClick={() => onSelectSection("lab_results")}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                See all →
              </button>
            </div>
            {recentLabsTop3.length === 0 ? (
              <p className="text-xs text-muted-foreground">No lab results available.</p>
            ) : (
              <ul className="space-y-1.5">
                {recentLabsTop3.map((lab) => (
                  <li key={lab.id}>
                    <button
                      onClick={() => onSelectSection("lab_results")}
                      className="w-full flex items-baseline justify-between text-sm hover:underline text-left"
                    >
                      <span className="font-medium">
                        {new Date(lab.result_date).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{lab.source}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
