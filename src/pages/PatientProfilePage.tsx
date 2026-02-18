import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Users, ArrowLeft, User, Eye, Brain, Dumbbell, Wind, Beaker,
  Droplets, Shield, Apple, Stethoscope, HeartPulse, Bone,
  Moon, Pill, Activity, Ribbon, Sparkles
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

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
  const [activeSection, setActiveSection] = useState<SidebarSection>("details");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const [patientRes, onboardingRes, labRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase.from("patient_onboarding").select("*").eq("patient_id", id).maybeSingle(),
        supabase.from("patient_lab_results").select("*").eq("patient_id", id).order("result_date", { ascending: false }),
      ]);
      setPatient(patientRes.data);
      setOnboarding(onboardingRes.data);
      setLabResults(labRes.data || []);
      setLoading(false);
    };
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
          <PatientDetailsView patient={patient} onboarding={onboarding} age={age} labResults={labResults} />
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

function PatientDetailsView({
  patient, onboarding, age, labResults,
}: {
  patient: Tables<"patients">;
  onboarding: Tables<"patient_onboarding"> | null;
  age: number | null | undefined;
  labResults: Tables<"patient_lab_results">[];
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

      {labResults.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Latest Lab Results</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Date</dt><dd>{labResults[0].result_date}</dd></div>
              <div><dt className="text-muted-foreground">LDL</dt><dd>{labResults[0].ldl_mmol_l ? `${labResults[0].ldl_mmol_l} mmol/L` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">HbA1c</dt><dd>{labResults[0].hba1c_mmol_mol ? `${labResults[0].hba1c_mmol_mol} mmol/mol` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">BP</dt><dd>{labResults[0].blood_pressure_systolic ? `${labResults[0].blood_pressure_systolic}/${labResults[0].blood_pressure_diastolic}` : "—"}</dd></div>
              <div><dt className="text-muted-foreground">eGFR</dt><dd>{labResults[0].egfr ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">TSH</dt><dd>{labResults[0].tsh_mu_l ? `${labResults[0].tsh_mu_l} mU/L` : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      )}
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

export default PatientProfilePage;
