import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, ArrowLeft, User, Eye, Brain, Dumbbell, Wind, Beaker,
  Droplets, Shield, Apple, Stethoscope, HeartPulse, Bone, FlaskConical,
  Moon, Pill, Activity, Ribbon, Sparkles, Radar, Save, X
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import { AddLabResultsDialog } from "@/components/patients/AddLabResultsDialog";

const HEALTH_DIMENSIONS = [
  { key: "senses", label: "Senses", icon: Eye },
  { key: "nervous_system", label: "Nervous System", icon: Brain },
  { key: "physical_performance", label: "Physical Performance", icon: Dumbbell },
  { key: "respiratory", label: "Respiratory", icon: Wind },
  { key: "hormones", label: "Hormones", icon: Beaker },
  { key: "skin_mucous", label: "Skin & Mucous", icon: Droplets },
  { key: "immunity", label: "Immunity", icon: Shield },
  { key: "nutrition", label: "Nutrition", icon: Apple },
  { key: "liver", label: "Liver", icon: Stethoscope },
  { key: "mental_health", label: "Mental Health", icon: Sparkles },
  { key: "kidney", label: "Kidney", icon: Activity },
  { key: "substances", label: "Substances", icon: Pill },
  { key: "cardiovascular", label: "Cardiovascular", icon: HeartPulse },
  { key: "cancer_risk", label: "Cancer Risk", icon: Ribbon },
  { key: "musculoskeletal", label: "Musculoskeletal", icon: Bone },
  { key: "sleep", label: "Sleep", icon: Moon },
];

type SidebarSection = "details" | string;

const TIER_LABELS: Record<string, string> = {
  tier_1: "Tier 1", tier_2: "Tier 2", tier_3: "Tier 3", tier_4: "Tier 4",
  children: "Children", onboarding: "Onboarding", acute: "Acute", case_management: "Case Management",
};

const PatientProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Tables<"patients"> | null>(null);
  const [onboarding, setOnboarding] = useState<Tables<"patient_onboarding"> | null>(null);
  const [labResults, setLabResults] = useState<Tables<"patient_lab_results">[]>([]);
  const [healthCategories, setHealthCategories] = useState<Tables<"patient_health_categories">[]>([]);
  const [activeSection, setActiveSection] = useState<SidebarSection>("details");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const [patientRes, onboardingRes, labRes, healthCatRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("patient_onboarding").select("*").eq("patient_id", id).maybeSingle(),
      supabase.from("patient_lab_results").select("*").eq("patient_id", id).order("result_date", { ascending: false }),
      supabase.from("patient_health_categories").select("*").eq("patient_id", id),
    ]);
    setPatient(patientRes.data);
    setOnboarding(onboardingRes.data);
    setLabResults(labRes.data || []);
    setHealthCategories(healthCatRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading patient profile...</div>;
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/patients")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </Button>
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : onboarding?.age;

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border rounded-lg bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm">{patient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {age ? `Age ${age}` : ""}{age && patient.gender ? " • " : ""}{patient.gender || ""}
              </p>
            </div>
          </div>
          {patient.tier && (
            <Badge variant="outline" className="mt-2 text-xs">{TIER_LABELS[patient.tier] || patient.tier}</Badge>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <button
              onClick={() => setActiveSection("details")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "details" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Patient Details
            </button>

            <button
              onClick={() => setActiveSection("health_overview")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "health_overview" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <Radar className="h-4 w-4" />
              Health Overview
            </button>

            <button
              onClick={() => setActiveSection("lab_results")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === "lab_results" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              Lab Results
            </button>

            <Separator className="my-2" />
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Dimensions</p>

            {HEALTH_DIMENSIONS.map((dim) => {
              const Icon = dim.icon;
              return (
                <button
                  key={dim.key}
                  onClick={() => setActiveSection(dim.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === dim.key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {dim.label}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-1.5 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </Button>

        {activeSection === "details" ? (
          <PatientDetailsView patient={patient} onboarding={onboarding} age={age} labResults={labResults} onLabResultsAdded={fetchData} />
        ) : activeSection === "health_overview" ? (
          <HealthOverviewView
            patient={patient}
            onboarding={onboarding}
            labResults={labResults}
            healthCategories={healthCategories}
            onSelectDimension={(key) => setActiveSection(key)}
            onPatientUpdate={(updated) => setPatient(updated)}
          />
        ) : activeSection === "lab_results" ? (
          <LabResultsView patientId={patient.id} labResults={labResults} onLabResultsAdded={fetchData} />
        ) : (
          <HealthDimensionView
            dimensionKey={activeSection}
            patient={patient}
            onboarding={onboarding}
            labResults={labResults}
          />
        )}
      </div>
    </div>
  );
};

// Compute a simple score (1-10) for each health dimension based on onboarding + lab data
function computeRadarData(
  onboarding: Tables<"patient_onboarding"> | null,
  labResults: Tables<"patient_lab_results">[],
  healthCategories: Tables<"patient_health_categories">[],
) {
  const lab = labResults[0] || null;
  const catMap = new Map(healthCategories.map((c) => [c.category.toLowerCase(), c]));

  return HEALTH_DIMENSIONS.map((dim) => {
    const stored = catMap.get(dim.label.toLowerCase());
    if (stored) {
      const statusScores: Record<string, number> = { normal: 2, monitor: 4, attention: 6, warning: 8, critical: 10 };
      return { category: dim.label, score: statusScores[stored.status] ?? 3 };
    }

    let score = 1;
    if (!onboarding && !lab) return { category: dim.label, score };

    switch (dim.key) {
      case "senses":
        if (onboarding?.illness_senses) score += 3;
        if (onboarding?.symptom_smell || onboarding?.symptom_vision || onboarding?.symptom_hearing) score += 2;
        break;
      case "nervous_system":
        if (onboarding?.illness_neurological) score += 3;
        if (onboarding?.symptom_neurological || onboarding?.symptom_balance) score += 2;
        if (onboarding?.prev_brain_damage) score += 2;
        break;
      case "physical_performance":
        if (onboarding?.exercise_met_hours != null && onboarding.exercise_met_hours < 5) score += 3;
        if (onboarding?.symptom_mobility_restriction) score += 2;
        break;
      case "respiratory":
        if (onboarding?.symptom_respiratory) score += 3;
        if (onboarding?.symptom_sleep_apnoea) score += 2;
        if (onboarding?.smoking === "yes") score += 2;
        break;
      case "hormones":
        if (onboarding?.illness_hormone) score += 3;
        if (lab?.testosterone_estrogen_abnormal) score += 2;
        if (lab?.tsh_mu_l && (Number(lab.tsh_mu_l) < 0.4 || Number(lab.tsh_mu_l) > 4.0)) score += 2;
        break;
      case "skin_mucous":
        if (onboarding?.symptom_skin_rash || onboarding?.symptom_mucous_membranes) score += 3;
        if (onboarding?.skin_condition && onboarding.skin_condition > 3) score += 2;
        break;
      case "immunity":
        if (onboarding?.illness_immune) score += 3;
        if (onboarding?.symptom_immune_allergies) score += 2;
        if (onboarding?.infections_per_year && Number(onboarding.infections_per_year) > 4) score += 2;
        break;
      case "nutrition":
        if (onboarding?.bmi && (Number(onboarding.bmi) > 30 || Number(onboarding.bmi) < 18.5)) score += 3;
        if (onboarding?.symptom_gastrointestinal) score += 2;
        break;
      case "liver":
        if (onboarding?.illness_liver) score += 3;
        if (lab?.alat_u_l && Number(lab.alat_u_l) > 50) score += 2;
        if (lab?.gt_u_l && Number(lab.gt_u_l) > 60) score += 2;
        break;
      case "mental_health":
        if (onboarding?.illness_mental_health) score += 3;
        if (onboarding?.gad7_score && onboarding.gad7_score > 10) score += 3;
        if (onboarding?.stress_perceived && onboarding.stress_perceived > 7) score += 2;
        break;
      case "kidney":
        if (onboarding?.illness_kidney) score += 3;
        if (lab?.egfr && Number(lab.egfr) < 60) score += 3;
        if (lab?.u_alb_krea_abnormal) score += 2;
        break;
      case "substances":
        if (onboarding?.alcohol_units_per_week && Number(onboarding.alcohol_units_per_week) > 14) score += 3;
        if (onboarding?.smoking === "yes") score += 2;
        if (onboarding?.other_substances) score += 2;
        break;
      case "cardiovascular":
        if (onboarding?.illness_cardiovascular) score += 3;
        if (lab?.ldl_mmol_l && Number(lab.ldl_mmol_l) > 3.0) score += 2;
        if (lab?.blood_pressure_systolic && Number(lab.blood_pressure_systolic) > 140) score += 2;
        break;
      case "cancer_risk":
        if (onboarding?.illness_cancer || onboarding?.prev_cancer) score += 4;
        if (onboarding?.genetic_cancer || onboarding?.genetic_melanoma) score += 2;
        break;
      case "musculoskeletal":
        if (onboarding?.illness_musculoskeletal) score += 3;
        if (onboarding?.symptom_joint_pain) score += 2;
        if (onboarding?.prev_osteoporotic_fracture) score += 2;
        break;
      case "sleep":
        if (onboarding?.insomnia) score += 3;
        if (onboarding?.sleep_quality && onboarding.sleep_quality < 4) score += 2;
        if (onboarding?.symptom_sleep_apnoea) score += 2;
        break;
    }
    return { category: dim.label, score: Math.min(score, 10) };
  });
}

function HealthOverviewView({
  patient, onboarding, labResults, healthCategories, onSelectDimension, onPatientUpdate,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
  onSelectDimension: (key: string) => void;
  onPatientUpdate: (updated: Tables<"patients">) => void;
}) {
  const radarData = useMemo(
    () => computeRadarData(onboarding, labResults, healthCategories),
    [onboarding, labResults, healthCategories],
  );

  const [summary, setSummary] = useState((patient as any).health_summary || "");
  const [recommendations, setRecommendations] = useState((patient as any).health_recommendations || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({ health_summary: summary, health_recommendations: recommendations } as any)
      .eq("id", patient.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Saved successfully");
      onPatientUpdate({ ...patient, health_summary: summary, health_recommendations: recommendations } as any);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="xl:row-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radar className="h-5 w-5 text-primary" />
            Health Overview
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            1 = no action needed → 10 = immediate action. Click a label for details.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[480px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, cursor: "pointer" }}
                  onClick={(e: any) => {
                    if (e?.value) {
                      const dim = HEALTH_DIMENSIONS.find((d) => d.label === e.value);
                      if (dim) onSelectDimension(dim.key);
                    }
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <RechartsRadar
                  name="Risk Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write a clinical summary of the patient's overall health status..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[140px] resize-none"
            />
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write recommendations for the patient's care plan..."
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              className="min-h-[140px] resize-none"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PatientDetailsView({
  patient, onboarding, age, labResults, onLabResultsAdded,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  age: number | null | undefined;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Full Name</dt><dd className="font-medium">{patient.full_name}</dd></div>
            <div><dt className="text-muted-foreground">Gender</dt><dd>{patient.gender || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Date of Birth</dt><dd>{patient.date_of_birth || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Age</dt><dd>{age ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd>{patient.email || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd>{patient.phone || "—"}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{[patient.address, patient.post_code, patient.city, patient.country].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Tier</dt><dd>{patient.tier ? (TIER_LABELS[patient.tier] || patient.tier) : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Insurance</dt><dd>{patient.insurance_provider || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Emergency Contact</dt><dd>{patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || ""})` : "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {onboarding && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Biometrics</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Height</dt><dd>{onboarding.height_cm ? `${onboarding.height_cm} cm` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Weight</dt><dd>{onboarding.weight_kg ? `${onboarding.weight_kg} kg` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">BMI</dt><dd>{onboarding.bmi ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">Waist</dt><dd>{onboarding.waist_circumference_cm ? `${onboarding.waist_circumference_cm} cm` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">W/H Ratio</dt><dd>{onboarding.waist_to_hip_ratio ?? "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lab Results</CardTitle>
            <AddLabResultsDialog patientId={patient.id} onSaved={onLabResultsAdded} />
          </div>
        </CardHeader>
        <CardContent>
          {labResults.length > 0 ? (
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Date</dt><dd>{labResults[0].result_date}</dd></div>
              <div><dt className="text-muted-foreground">LDL</dt><dd>{labResults[0].ldl_mmol_l ? `${labResults[0].ldl_mmol_l} mmol/L` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">HbA1c</dt><dd>{labResults[0].hba1c_mmol_mol ? `${labResults[0].hba1c_mmol_mol} mmol/mol` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">BP</dt><dd>{labResults[0].blood_pressure_systolic ? `${labResults[0].blood_pressure_systolic}/${labResults[0].blood_pressure_diastolic}` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">eGFR</dt><dd>{labResults[0].egfr ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">TSH</dt><dd>{labResults[0].tsh_mu_l ? `${labResults[0].tsh_mu_l} mU/L` : "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No lab results yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthDimensionView({
  dimensionKey, patient, onboarding, labResults,
}: {
  dimensionKey: string;
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
}) {
  const dim = HEALTH_DIMENSIONS.find((d) => d.key === dimensionKey);
  if (!dim) return null;
  const Icon = dim.icon;
  const lab = labResults[0] || null;

  const renderContent = () => {
    switch (dimensionKey) {
      case "senses":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Vision Acuity</dt><dd>{onboarding?.vision_acuity ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Smell Issues</dt><dd>{onboarding?.symptom_smell ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Vision Issues</dt><dd>{onboarding?.symptom_vision ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Hearing Issues</dt><dd>{onboarding?.symptom_hearing ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Illness (Senses)</dt><dd>{onboarding?.illness_senses ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_senses_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_senses_notes}</dd></div>}
          </dl>
        );
      case "nervous_system":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Neurological Illness</dt><dd>{onboarding?.illness_neurological ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Neurological Symptoms</dt><dd>{onboarding?.symptom_neurological ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Balance Issues</dt><dd>{onboarding?.symptom_balance ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Genetic (Nervous System)</dt><dd>{onboarding?.genetic_nervous_system ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Previous Brain Damage</dt><dd>{onboarding?.prev_brain_damage ? "Yes" : "No"}</dd></div>
            {onboarding?.prev_brain_damage_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.prev_brain_damage_notes}</dd></div>}
            <div><dt className="text-muted-foreground">APOE ε4</dt><dd>{lab?.apoe_e4 === true ? "Positive" : lab?.apoe_e4 === false ? "Negative" : "—"}</dd></div>
          </dl>
        );
      case "physical_performance":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Exercise (MET hrs/week)</dt><dd>{onboarding?.exercise_met_hours ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Mobility Restriction</dt><dd>{onboarding?.symptom_mobility_restriction ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "respiratory":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Respiratory Symptoms</dt><dd>{onboarding?.symptom_respiratory ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sleep Apnoea</dt><dd>{onboarding?.symptom_sleep_apnoea ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Smoking</dt><dd>{onboarding?.smoking ?? "—"}</dd></div>
          </dl>
        );
      case "hormones":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Hormone Illness</dt><dd>{onboarding?.illness_hormone ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Menstruation/Menopause Issues</dt><dd>{onboarding?.symptom_menstruation_menopause ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">TSH</dt><dd>{lab?.tsh_mu_l ? `${lab.tsh_mu_l} mU/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Testosterone/Estrogen Abnormal</dt><dd>{lab?.testosterone_estrogen_abnormal === true ? "Yes" : lab?.testosterone_estrogen_abnormal === false ? "No" : "—"}</dd></div>
          </dl>
        );
      case "skin_mucous":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Skin Condition</dt><dd>{onboarding?.skin_condition ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Skin Rash</dt><dd>{onboarding?.symptom_skin_rash ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Mucous Membrane Issues</dt><dd>{onboarding?.symptom_mucous_membranes ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sun Exposure</dt><dd>{onboarding?.sun_exposure ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "immunity":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Immune Illness</dt><dd>{onboarding?.illness_immune ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Immune/Allergy Symptoms</dt><dd>{onboarding?.symptom_immune_allergies ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Infections/Year</dt><dd>{onboarding?.infections_per_year ?? "—"}</dd></div>
          </dl>
        );
      case "nutrition":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">BMI</dt><dd>{onboarding?.bmi ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fruits & Veg (g/day)</dt><dd>{onboarding?.fruits_vegetables_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fish (g/day)</dt><dd>{onboarding?.fish_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Fiber (g/day)</dt><dd>{onboarding?.fiber_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Red Meat (g/day)</dt><dd>{onboarding?.red_meat_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Sugar (g/day)</dt><dd>{onboarding?.sugar_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Sodium (g/day)</dt><dd>{onboarding?.sodium_g_per_day ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">GI Symptoms</dt><dd>{onboarding?.symptom_gastrointestinal ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "liver":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Liver Illness</dt><dd>{onboarding?.illness_liver ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">ALAT</dt><dd>{lab?.alat_u_l ? `${lab.alat_u_l} U/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">AFOS/ALP</dt><dd>{lab?.afos_alp_u_l ? `${lab.afos_alp_u_l} U/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">GT</dt><dd>{lab?.gt_u_l ? `${lab.gt_u_l} U/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">ALAT/ASAT Ratio</dt><dd>{lab?.alat_asat_ratio ?? "—"}</dd></div>
          </dl>
        );
      case "mental_health":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Mental Health Illness</dt><dd>{onboarding?.illness_mental_health ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_mental_health_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_mental_health_notes}</dd></div>}
            <div><dt className="text-muted-foreground">GAD-7</dt><dd>{onboarding?.gad7_score ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Stress (perceived)</dt><dd>{onboarding?.stress_perceived ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Job Strain</dt><dd>{onboarding?.job_strain_perceived ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Social Support</dt><dd>{onboarding?.social_support_perceived ?? "—"}</dd></div>
          </dl>
        );
      case "kidney":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Kidney Illness</dt><dd>{onboarding?.illness_kidney ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_kidney_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_kidney_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Kidney Symptoms</dt><dd>{onboarding?.symptom_kidney_function ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">eGFR</dt><dd>{lab?.egfr ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cystatin C</dt><dd>{lab?.cystatin_c ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">U-Alb/Krea Abnormal</dt><dd>{lab?.u_alb_krea_abnormal === true ? "Yes" : lab?.u_alb_krea_abnormal === false ? "No" : "—"}</dd></div>
          </dl>
        );
      case "substances":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Alcohol (units/week)</dt><dd>{onboarding?.alcohol_units_per_week ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Smoking</dt><dd>{onboarding?.smoking ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Other Substances</dt><dd>{onboarding?.other_substances ? "Yes" : "No"}</dd></div>
            {onboarding?.other_substances_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.other_substances_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Substance Use (perceived)</dt><dd>{onboarding?.substance_use_perceived ?? "—"}</dd></div>
          </dl>
        );
      case "cardiovascular":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Cardiovascular Illness</dt><dd>{onboarding?.illness_cardiovascular ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_cardiovascular_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_cardiovascular_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Genetic (Cardiovascular)</dt><dd>{onboarding?.genetic_cardiovascular ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">LDL</dt><dd>{lab?.ldl_mmol_l ? `${lab.ldl_mmol_l} mmol/L` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">HbA1c</dt><dd>{lab?.hba1c_mmol_mol ? `${lab.hba1c_mmol_mol} mmol/mol` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Blood Pressure</dt><dd>{lab?.blood_pressure_systolic ? `${lab.blood_pressure_systolic}/${lab.blood_pressure_diastolic}` : "—"}</dd></div>
          </dl>
        );
      case "cancer_risk":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Cancer Illness</dt><dd>{onboarding?.illness_cancer ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_cancer_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_cancer_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Previous Cancer</dt><dd>{onboarding?.prev_cancer ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Precancerous</dt><dd>{onboarding?.prev_precancerous ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Genetic (Cancer)</dt><dd>{onboarding?.genetic_cancer ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Genetic (Melanoma)</dt><dd>{onboarding?.genetic_melanoma ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Breast Screening</dt><dd>{onboarding?.cancer_screening_breast === true ? "Yes" : onboarding?.cancer_screening_breast === false ? "No" : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cervical Screening</dt><dd>{onboarding?.cancer_screening_cervical === true ? "Yes" : onboarding?.cancer_screening_cervical === false ? "No" : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Colorectal Screening</dt><dd>{onboarding?.cancer_screening_colorectal === true ? "Yes" : onboarding?.cancer_screening_colorectal === false ? "No" : "—"}</dd></div>
          </dl>
        );
      case "musculoskeletal":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Musculoskeletal Illness</dt><dd>{onboarding?.illness_musculoskeletal ? "Yes" : "No"}</dd></div>
            {onboarding?.illness_musculoskeletal_notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd>{onboarding.illness_musculoskeletal_notes}</dd></div>}
            <div><dt className="text-muted-foreground">Joint Pain</dt><dd>{onboarding?.symptom_joint_pain ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Mobility Restriction</dt><dd>{onboarding?.symptom_mobility_restriction ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Prev. Osteoporotic Fracture</dt><dd>{onboarding?.prev_osteoporotic_fracture ? "Yes" : "No"}</dd></div>
          </dl>
        );
      case "sleep":
        return (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Sleep Quality (1-10)</dt><dd>{onboarding?.sleep_quality ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Hours/Night</dt><dd>{onboarding?.sleep_hours_per_night ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Deep Sleep %</dt><dd>{onboarding?.deep_sleep_percent ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Insomnia</dt><dd>{onboarding?.insomnia ? "Yes" : "No"}</dd></div>
            <div><dt className="text-muted-foreground">Sleep Apnoea</dt><dd>{onboarding?.symptom_sleep_apnoea ? "Yes" : "No"}</dd></div>
          </dl>
        );
      default:
        return <p className="text-muted-foreground">No data available for this dimension.</p>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {dim.label}
        </CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}

const REFERENCE_VALUES: Record<string, { low?: number; high?: number; label: string }> = {
  ldl_mmol_l: { high: 3.0, label: "LDL" },
  hba1c_mmol_mol: { high: 42, label: "HbA1c" },
  blood_pressure_systolic: { high: 140, label: "Systolic BP" },
  blood_pressure_diastolic: { high: 90, label: "Diastolic BP" },
  alat_u_l: { high: 50, label: "ALAT" },
  afos_alp_u_l: { low: 35, high: 105, label: "AFOS/ALP" },
  gt_u_l: { high: 60, label: "GT" },
  alat_asat_ratio: { high: 1.0, label: "ALAT/ASAT ratio" },
  egfr: { low: 60, label: "eGFR" },
  cystatin_c: { high: 1.03, label: "Cystatin C" },
  tsh_mu_l: { low: 0.4, high: 4.0, label: "TSH" },
  pef_percent: { low: 80, label: "PEF" },
  fev1_percent: { low: 80, label: "FEV1" },
  fvc_percent: { low: 80, label: "FVC" },
};

function LabResultsView({ patientId, labResults, onLabResultsAdded }: {
  patientId: string;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
}) {
  const [selectedMarker, setSelectedMarker] = useState<{ key: string; label: string; unit: string } | null>(null);
  const [customRefs, setCustomRefs] = useState<Record<string, { low?: number; high?: number }>>({});
  const [markerNotes, setMarkerNotes] = useState<Record<string, string>>({});
  const sorted = [...labResults].sort((a, b) => b.result_date.localeCompare(a.result_date));

  const categories = [
    {
      title: "Cardiovascular & Metabolic Health",
      rows: [
        { label: "LDL", unit: "mmol/l", key: "ldl_mmol_l" as const },
        { label: "HbA1c", unit: "mmol/mol", key: "hba1c_mmol_mol" as const },
        { label: "RR / Blood Pressure", unit: "mmHg", key: "_bp" as const },
      ],
    },
    {
      title: "Liver Function",
      rows: [
        { label: "ALAT", unit: "U/l", key: "alat_u_l" as const },
        { label: "AFOS / ALP", unit: "U/l", key: "afos_alp_u_l" as const },
        { label: "GT", unit: "U/l", key: "gt_u_l" as const },
        { label: "ALAT / ASAT ratio", unit: "", key: "alat_asat_ratio" as const },
      ],
    },
    {
      title: "Kidney Function",
      rows: [
        { label: "eGFR", unit: "ml/min/1.73 m²", key: "egfr" as const },
        { label: "Cystatin C", unit: "mg/l", key: "cystatin_c" as const },
        { label: "U-Alb/Krea, abnormal", unit: "0/1", key: "u_alb_krea_abnormal" as const },
      ],
    },
    {
      title: "Endocrine & Hormonal Health",
      rows: [
        { label: "TSH", unit: "mU/l", key: "tsh_mu_l" as const },
        { label: "Testosterone / Estrogen, abnormal", unit: "0/1", key: "testosterone_estrogen_abnormal" as const },
      ],
    },
    {
      title: "Genetics & Risk Markers",
      rows: [
        { label: "APOE ε4", unit: "0/1", key: "apoe_e4" as const },
      ],
    },
    {
      title: "Spirometry",
      rows: [
        { label: "PEF", unit: "%", key: "pef_percent" as const },
        { label: "FEV1", unit: "%", key: "fev1_percent" as const },
        { label: "FVC", unit: "%", key: "fvc_percent" as const },
      ],
    },
  ];

  const getCellValue = (lab: Tables<"patient_lab_results">, key: string): string => {
    if (key === "_bp") {
      return lab.blood_pressure_systolic != null ? `${lab.blood_pressure_systolic}/${lab.blood_pressure_diastolic}` : "—";
    }
    const val = (lab as any)[key];
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "1" : "0";
    return String(val);
  };

  const handleRowClick = (key: string, label: string, unit: string) => {
    // For BP, open systolic chart
    if (key === "_bp") {
      setSelectedMarker({ key: "blood_pressure_systolic", label: "Blood Pressure (Systolic)", unit: "mmHg" });
    } else if (key === "u_alb_krea_abnormal" || key === "testosterone_estrogen_abnormal" || key === "apoe_e4") {
      // Boolean markers - no chart
      return;
    } else {
      setSelectedMarker({ key, label, unit });
    }
  };

  // Build chart data for selected marker
  const chartData = useMemo(() => {
    if (!selectedMarker) return [];
    const chronological = [...labResults].sort((a, b) => a.result_date.localeCompare(b.result_date));
    return chronological
      .map((lab) => {
        const val = (lab as any)[selectedMarker.key];
        if (val === null || val === undefined) return null;
        return { date: lab.result_date, value: Number(val) };
      })
      .filter(Boolean) as { date: string; value: number }[];
  }, [selectedMarker, labResults]);

  const ref = selectedMarker ? {
    ...REFERENCE_VALUES[selectedMarker.key],
    ...customRefs[selectedMarker.key],
  } : null;

  return (
    <div className="flex gap-4">
      <div className={`space-y-4 transition-all ${selectedMarker ? "flex-1 min-w-0" : "w-full"}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Lab Results
          </h2>
          <AddLabResultsDialog patientId={patientId} onSaved={onLabResultsAdded} />
        </div>

        {sorted.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No lab results yet. Click "Add Lab Results" to add the first entry.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Marker</TableHead>
                      <TableHead className="min-w-[80px]">Unit</TableHead>
                      {sorted.map((lab) => (
                        <TableHead key={lab.id} className="min-w-[100px] text-center">{lab.result_date}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <>
                        <TableRow key={cat.title}>
                          <TableCell colSpan={2 + sorted.length} className="bg-muted/50 font-medium text-xs uppercase tracking-wide text-muted-foreground py-2">
                            {cat.title}
                          </TableCell>
                        </TableRow>
                        {cat.rows.map((row) => (
                          <TableRow
                            key={row.key}
                            className={`cursor-pointer hover:bg-muted/30 transition-colors ${selectedMarker?.key === row.key || (row.key === "_bp" && selectedMarker?.key === "blood_pressure_systolic") ? "bg-primary/5" : ""}`}
                            onClick={() => handleRowClick(row.key, row.label, row.unit)}
                          >
                            <TableCell className="font-medium text-sm">{row.label}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.unit}</TableCell>
                            {sorted.map((lab) => (
                              <TableCell key={lab.id} className="text-center text-sm">{getCellValue(lab, row.key)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart Panel */}
      {selectedMarker && (
        <div className="w-[400px] shrink-0 border rounded-lg bg-card flex flex-col animate-in slide-in-from-right-5 duration-200">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="font-semibold text-sm">{selectedMarker.label}</h3>
              {selectedMarker.unit && (
                <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 flex-1">
            {chartData.length < 1 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data points available for this marker.</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    {ref?.high != null && (
                      <ReferenceLine
                        y={ref.high}
                        stroke="hsl(var(--destructive))"
                        strokeDasharray="5 5"
                        label={{ value: `High (${ref.high})`, position: "right", fontSize: 10, fill: "hsl(var(--destructive))" }}
                      />
                    )}
                    {ref?.low != null && (
                      <ReferenceLine
                        y={ref.low}
                        stroke="hsl(var(--chart-4, 43 74% 66%))"
                        strokeDasharray="5 5"
                        label={{ value: `Low (${ref.low})`, position: "right", fontSize: 10, fill: "hsl(var(--chart-4, 43 74% 66%))" }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {selectedMarker && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Reference Values</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Low</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="—"
                      className="h-8 text-xs"
                      value={ref?.low ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        setCustomRefs((prev) => ({
                          ...prev,
                          [selectedMarker.key]: { ...prev[selectedMarker.key], low: val },
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">High</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="—"
                      className="h-8 text-xs"
                      value={ref?.high ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        setCustomRefs((prev) => ({
                          ...prev,
                          [selectedMarker.key]: { ...prev[selectedMarker.key], high: val },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4">
              <Label className="text-xs">Doctor Notes</Label>
              <Textarea
                placeholder="Add notes about this marker..."
                className="mt-1 min-h-[80px] text-xs resize-none"
                value={markerNotes[selectedMarker?.key || ""] || ""}
                onChange={(e) => {
                  if (!selectedMarker) return;
                  setMarkerNotes((prev) => ({ ...prev, [selectedMarker.key]: e.target.value }));
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientProfilePage;
