import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  AlertTriangle, Plus, Pill, Stethoscope, ClipboardList, Users,
  FlaskConical, Calendar as CalendarIcon, Pencil, Trash2, FileText, Ruler,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import { cn } from "@/lib/utils";
import { BiometricHistoryModal } from "./BiometricHistoryModal";
import { BiometricMiniChart } from "./BiometricMiniChart";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import {
  CARTER_DIAGNOSES,
  CARTER_MEDICATIONS,
  CARTER_INTERACTIONS,
  DIMENSION_LABEL_TO_KEY,
  fmtClinicalDate,
  isCarter,
} from "@/lib/patientClinicalData";

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1", tier_2: "Tier 2", tier_3: "Tier 3", tier_4: "Tier 4",
  children: "Child", onboarding: "Onboarding", acute: "Acute", case_management: "Case Management",
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
    hip_circumference_cm: "",
  });

  const [historyModalLabel, setHistoryModalLabel] = useState<string | null>(null);

  useEffect(() => {
    setBioForm({
      height_cm: onboarding?.height_cm?.toString() ?? "",
      weight_kg: onboarding?.weight_kg?.toString() ?? "",
      waist_circumference_cm: onboarding?.waist_circumference_cm?.toString() ?? "",
      hip_circumference_cm: onboarding?.waist_circumference_cm && onboarding?.waist_to_hip_ratio
        ? (onboarding.waist_circumference_cm / onboarding.waist_to_hip_ratio).toFixed(0)
        : "",
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

  // ── Carter, Jay-Z dummy clinical data overlay ────────────
  // If this is Carter, use the central source-of-truth for diagnoses & meds
  // so they stay consistent across Overview, Health Data, dimensions, and Medications.
  const carterPatient = isCarter(patient.id, patient.full_name);
  const displayDiagnoses = useMemo(() => {
    if (carterPatient && diagnoses.length === 0) {
      return CARTER_DIAGNOSES.filter((d) => d.status === "active").map((d) => ({
        id: d.id,
        diagnosis: d.name,
        diagnosed_date: d.diagnosedDate,
        dimension: d.dimension,
        icd_code: d.icd10,
      }));
    }
    return diagnoses.map((d) => ({ ...d, dimension: undefined as string | undefined }));
  }, [carterPatient, diagnoses]);

  const displayMedications = useMemo(() => {
    if (carterPatient && medications.length === 0) {
      return CARTER_MEDICATIONS.filter((m) => m.status === "active").map((m) => ({
        id: m.id,
        medication_name: m.name,
        dose: m.dose,
        frequency: m.frequency,
      }));
    }
    return medications;
  }, [carterPatient, medications]);

  // Active drug interactions (from central data)
  const activeInteractions = useMemo(() => {
    if (!carterPatient) return [];
    const activeNames = new Set(
      CARTER_MEDICATIONS.filter((m) => m.status === "active").map((m) => m.name),
    );
    return CARTER_INTERACTIONS.filter(
      (i) => activeNames.has(i.drugs[0]) && activeNames.has(i.drugs[1]),
    );
  }, [carterPatient]);
  const severeInteractions = activeInteractions.filter((i) => i.severity === "severe");
  const moderateInteractions = activeInteractions.filter((i) => i.severity === "moderate");

  // ── Alerts ───────────────────────────────────────────────
  const openTasks = tasks.filter((t) => t.status !== "done");
  const severeAllergies = allergies.filter((a: any) => a.severity === "severe");
  const moderateAllergies = allergies.filter((a: any) => a.severity === "moderate");

  const overdueTasksCount = openTasks.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() < Date.now(),
  ).length;

  const hasAlerts =
    openTasks.length > 0 ||
    severeAllergies.length > 0 ||
    moderateAllergies.length > 0 ||
    activeInteractions.length > 0;
  const alertSeverity: "high" | "medium" | "none" =
    severeAllergies.length > 0 || overdueTasksCount > 0 || severeInteractions.length > 0 ? "high"
      : (openTasks.length > 0 || moderateAllergies.length > 0 || moderateInteractions.length > 0) ? "medium"
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
    const hip = parseNum(bioForm.hip_circumference_cm);
    const whr = waist && hip && hip > 0 ? +(waist / hip).toFixed(2) : null;
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
                {severeInteractions.length > 0 && (
                  <button
                    onClick={() => onSelectSection("medications")}
                    className="text-[hsl(0_57%_39%)] font-medium hover:underline"
                  >
                    {severeInteractions.length} severe drug interaction{severeInteractions.length === 1 ? "" : "s"}
                  </button>
                )}
                {moderateInteractions.length > 0 && (
                  <button
                    onClick={() => onSelectSection("medications")}
                    className="text-[hsl(28_63%_44%)] hover:underline"
                  >
                    {moderateInteractions.length} moderate drug interaction{moderateInteractions.length === 1 ? "" : "s"}
                  </button>
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
                <button
                  onClick={() => onSelectSection("lab_results")}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  See all →
                </button>
              </div>
              {displayDiagnoses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active diagnoses recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {displayDiagnoses.map((d: any) => (
                    <li key={d.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium">{d.diagnosis}</span>
                        {d.dimension && (
                          <button
                            onClick={() => {
                              const key = DIMENSION_LABEL_TO_KEY[d.dimension as keyof typeof DIMENSION_LABEL_TO_KEY];
                              if (key) onSelectSection(key);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
                          >
                            {d.dimension}
                          </button>
                        )}
                      </div>
                      {d.diagnosed_date && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtClinicalDate(d.diagnosed_date)}
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
                  <label className="text-[11px] text-muted-foreground">Hip (cm)</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={bioForm.hip_circumference_cm}
                    onChange={(e) => setBioForm((p) => ({ ...p, hip_circumference_cm: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <p className="text-[11px] text-muted-foreground">
                  BMI: <span className="font-medium text-foreground">{computedBmi ?? "—"}</span> (auto-calculated)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  W/H Ratio: <span className="font-medium text-foreground">{(() => {
                    const w = parseNum(bioForm.waist_circumference_cm);
                    const h = parseNum(bioForm.hip_circumference_cm);
                    return w && h && h > 0 ? (w / h).toFixed(2) : "—";
                  })()}</span> (auto-calculated)
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveBiometrics}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowBioForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
              {(() => {
                const height = onboarding?.height_cm ?? 188;
                const weight = onboarding?.weight_kg ?? 84;
                const bmi = computedBmi ?? 23.8;
                const waist = onboarding?.waist_circumference_cm ?? 88;
                const hip = 96;
                const whr = waist && hip ? +(waist / hip).toFixed(2) : (onboarding?.waist_to_hip_ratio ?? 0.92);

                // unit + lower-is-better flag for delta colouring
                type HistoryEntry = { date: string; value: number };
                type Item = {
                  label: string;
                  unit: string;
                  current: number;
                  decimals: number;
                  lowerIsBetter: boolean;
                  staticValue?: boolean; // height — no delta
                  history: HistoryEntry[]; // newest first, current excluded
                };

                const items: Item[] = [
                  {
                    label: "Height",
                    unit: "cm",
                    current: height,
                    decimals: 0,
                    lowerIsBetter: false,
                    staticValue: true,
                    history: [
                      { date: "12 Aug 2025", value: 188 },
                      { date: "03 Feb 2025", value: 188 },
                      { date: "15 Jul 2024", value: 188 },
                      { date: "20 Jan 2024", value: 188 },
                      { date: "10 Jun 2023", value: 188 },
                    ],
                  },
                  {
                    label: "Weight",
                    unit: "kg",
                    current: weight,
                    decimals: 1,
                    lowerIsBetter: true,
                    history: [
                      { date: "12 Aug 2025", value: 86.1 },
                      { date: "03 Feb 2025", value: 87.5 },
                      { date: "15 Jul 2024", value: 88.3 },
                      { date: "20 Jan 2024", value: 89.5 },
                      { date: "10 Jun 2023", value: 89.5 },
                    ],
                  },
                  {
                    label: "BMI",
                    unit: "",
                    current: bmi,
                    decimals: 1,
                    lowerIsBetter: true,
                    history: [
                      { date: "12 Aug 2025", value: 24.4 },
                      { date: "03 Feb 2025", value: 24.8 },
                      { date: "15 Jul 2024", value: 25.0 },
                      { date: "20 Jan 2024", value: 25.3 },
                      { date: "10 Jun 2023", value: 25.3 },
                    ],
                  },
                  {
                    label: "Waist Circumference",
                    unit: "cm",
                    current: waist,
                    decimals: 0,
                    lowerIsBetter: true,
                    history: [
                      { date: "12 Aug 2025", value: 90 },
                      { date: "03 Feb 2025", value: 90 },
                      { date: "15 Jul 2024", value: 91 },
                      { date: "20 Jan 2024", value: 92 },
                      { date: "10 Jun 2023", value: 92 },
                    ],
                  },
                  {
                    label: "Hip Circumference",
                    unit: "cm",
                    current: hip,
                    decimals: 0,
                    lowerIsBetter: false,
                    history: [
                      { date: "12 Aug 2025", value: 96 },
                      { date: "03 Feb 2025", value: 96 },
                      { date: "15 Jul 2024", value: 97 },
                      { date: "20 Jan 2024", value: 97 },
                      { date: "10 Jun 2023", value: 97 },
                    ],
                  },
                  {
                    label: "W/H Ratio",
                    unit: "",
                    current: whr,
                    decimals: 2,
                    lowerIsBetter: true,
                    history: [
                      { date: "12 Aug 2025", value: 0.94 },
                      { date: "03 Feb 2025", value: 0.95 },
                      { date: "15 Jul 2024", value: 0.95 },
                      { date: "20 Jan 2024", value: 0.96 },
                      { date: "10 Jun 2023", value: 0.96 },
                    ],
                  },
                ];

                const fmt = (n: number, d: number) => n.toFixed(d);

                const getDelta = (
                  curr: number,
                  prev: number | undefined,
                  unit: string,
                  decimals: number,
                  lowerIsBetter: boolean,
                ) => {
                  if (prev === undefined) return null;
                  const diff = +(curr - prev).toFixed(decimals);
                  if (diff === 0) return { text: "—", positive: null as null | boolean, dir: null as null | "up" | "down" };
                  const direction: "up" | "down" = diff < 0 ? "down" : "up";
                  const positive = lowerIsBetter ? diff < 0 : diff > 0;
                  const abs = Math.abs(diff).toFixed(decimals);
                  return {
                    text: `${direction === "down" ? "▼" : "▲"} ${abs}${unit ? " " + unit : ""}`,
                    positive,
                    dir: direction,
                  };
                };

                const ImprovedColor = "text-[hsl(142_71%_35%)]";
                const WorsenedColor = "text-[hsl(0_57%_39%)]";

                return items.map((item) => {
                  const prevEntry = item.history[0];
                  const headlineDelta = item.staticValue
                    ? null
                    : getDelta(item.current, prevEntry?.value, item.unit, item.decimals, item.lowerIsBetter);

                  // Build full series newest-first including current
                  const series: HistoryEntry[] = [
                    { date: "Today", value: item.current },
                    ...item.history,
                  ];

                  return (
                    <Popover key={item.label}>
                      <div>
                        <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="text-sm font-medium text-foreground flex items-baseline gap-1.5">
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-baseline gap-1.5 hover:underline decoration-dotted underline-offset-2 cursor-pointer"
                            >
                              <span>{fmt(item.current, item.decimals)}{item.unit ? ` ${item.unit}` : ""}</span>
                              {headlineDelta && headlineDelta.positive !== null && (
                                <span
                                  className={cn(
                                    "text-[11px] font-medium tabular-nums inline-flex items-center gap-0.5",
                                    headlineDelta.positive ? ImprovedColor : WorsenedColor,
                                  )}
                                >
                                  {headlineDelta.text}
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                        </dd>
                      </div>

                      <PopoverContent align="start" className="w-80 p-0">
                        <BiometricMiniChart
                          label={`${item.label} history`}
                          unit={item.unit}
                          decimals={item.decimals}
                          series={series}
                        />
                        <div className="px-3 py-1.5 border-t text-right">
                          <button
                            type="button"
                            className="text-[11px] text-primary hover:underline"
                            onClick={() => setHistoryModalLabel(item.label)}
                          >
                            See all
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                });
              })()}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Biometric history modal */}
      {(() => {
        const height = onboarding?.height_cm ?? 188;
        const weight = onboarding?.weight_kg ?? 84;
        const bmi = computedBmi ?? 23.8;
        const waist = onboarding?.waist_circumference_cm ?? 88;
        const hip = 96;
        const whr = waist && hip ? +(waist / hip).toFixed(2) : (onboarding?.waist_to_hip_ratio ?? 0.92);
        const allItems = [
          { label: "Height", unit: "cm", current: height, decimals: 0, lowerIsBetter: false, staticValue: true,
            history: [
              { date: "12 Aug 2025", value: 188 }, { date: "03 Feb 2025", value: 188 },
              { date: "15 Jul 2024", value: 188 }, { date: "20 Jan 2024", value: 188 },
              { date: "10 Jun 2023", value: 188 },
            ] },
          { label: "Weight", unit: "kg", current: weight, decimals: 1, lowerIsBetter: true,
            history: [
              { date: "12 Aug 2025", value: 86.1 }, { date: "03 Feb 2025", value: 87.5 },
              { date: "15 Jul 2024", value: 88.3 }, { date: "20 Jan 2024", value: 89.5 },
              { date: "10 Jun 2023", value: 89.5 },
            ] },
          { label: "BMI", unit: "", current: bmi, decimals: 1, lowerIsBetter: true,
            history: [
              { date: "12 Aug 2025", value: 24.4 }, { date: "03 Feb 2025", value: 24.8 },
              { date: "15 Jul 2024", value: 25.0 }, { date: "20 Jan 2024", value: 25.3 },
              { date: "10 Jun 2023", value: 25.3 },
            ], refRange: { low: 18.5, high: 24.9, label: "Healthy 18.5–24.9" } },
          { label: "Waist Circumference", unit: "cm", current: waist, decimals: 0, lowerIsBetter: true,
            history: [
              { date: "12 Aug 2025", value: 90 }, { date: "03 Feb 2025", value: 90 },
              { date: "15 Jul 2024", value: 91 }, { date: "20 Jan 2024", value: 92 },
              { date: "10 Jun 2023", value: 92 },
            ] },
          { label: "Hip Circumference", unit: "cm", current: hip, decimals: 0, lowerIsBetter: false,
            history: [
              { date: "12 Aug 2025", value: 96 }, { date: "03 Feb 2025", value: 96 },
              { date: "15 Jul 2024", value: 97 }, { date: "20 Jan 2024", value: 97 },
              { date: "10 Jun 2023", value: 97 },
            ] },
          { label: "W/H Ratio", unit: "", current: whr, decimals: 2, lowerIsBetter: true,
            history: [
              { date: "12 Aug 2025", value: 0.94 }, { date: "03 Feb 2025", value: 0.95 },
              { date: "15 Jul 2024", value: 0.95 }, { date: "20 Jan 2024", value: 0.96 },
              { date: "10 Jun 2023", value: 0.96 },
            ], refRange: { low: 0, high: 0.95, label: "Healthy < 0.95" } },
        ];
        const active = allItems.find((i) => i.label === historyModalLabel);
        if (!active) return null;
        return (
          <BiometricHistoryModal
            open={!!historyModalLabel}
            onOpenChange={(v) => !v && setHistoryModalLabel(null)}
            metricLabel={active.label}
            patientName={patient.full_name}
            unit={active.unit}
            decimals={active.decimals}
            lowerIsBetter={active.lowerIsBetter}
            staticValue={active.staticValue}
            series={[{ date: "Today", value: active.current }, ...active.history]}
            refRange={(active as any).refRange}
          />
        );
      })()}

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
    </div>
  );
}
