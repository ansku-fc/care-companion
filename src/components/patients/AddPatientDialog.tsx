import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { PatientFormSteps } from "./PatientFormSteps";

export type OnboardingFormData = {
  // Patient basics
  full_name: string;
  gender: string;
  date_of_birth: string;
  email: string;
  phone: string;
  tier: string;
  // Basic info
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  waist_circumference_cm: number | null;
  waist_to_hip_ratio: number | null;
  bmi: number | null;
  // Lifestyle
  exercise_met_hours: number | null;
  smoking: string;
  sun_exposure: boolean | null;
  alcohol_units_per_week: number | null;
  other_substances: boolean;
  other_substances_notes: string;
  // Nutrition
  fruits_vegetables_g_per_day: number | null;
  fish_g_per_day: number | null;
  fiber_g_per_day: number | null;
  red_meat_g_per_day: number | null;
  sugar_g_per_day: number | null;
  sodium_g_per_day: number | null;
  // Sleep
  sleep_quality: number | null;
  deep_sleep_percent: number | null;
  sleep_hours_per_night: number | null;
  insomnia: boolean | null;
  // Mental health
  gad7_score: number | null;
  substance_use_perceived: number | null;
  social_support_perceived: number | null;
  stress_perceived: number | null;
  job_strain_perceived: number | null;
  // Current illnesses
  illness_senses: boolean;
  illness_senses_notes: string;
  illness_neurological: boolean;
  illness_hormone: boolean;
  illness_immune: boolean;
  illness_liver: boolean;
  illness_mental_health: boolean;
  illness_mental_health_notes: string;
  illness_kidney: boolean;
  illness_kidney_notes: string;
  illness_gastrointestinal: boolean;
  illness_gastrointestinal_notes: string;
  illness_cardiovascular: boolean;
  illness_cardiovascular_notes: string;
  illness_cancer: boolean;
  illness_cancer_notes: string;
  illness_musculoskeletal: boolean;
  illness_musculoskeletal_notes: string;
  // Previous illnesses
  prev_brain_damage: boolean;
  prev_osteoporotic_fracture: boolean;
  prev_cancer: boolean;
  prev_precancerous: boolean;
  // Genetic
  genetic_nervous_system: boolean;
  genetic_cardiovascular: boolean;
  genetic_melanoma: boolean;
  genetic_cancer: boolean;
  // Other
  skin_condition: number | null;
  infections_per_year: number | null;
  vision_acuity: number | null;
  cancer_screening_breast: boolean | null;
  cancer_screening_cervical: boolean | null;
  cancer_screening_colorectal: boolean | null;
};

const defaultFormData: OnboardingFormData = {
  full_name: "", gender: "", date_of_birth: "", email: "", phone: "", tier: "tier_1",
  age: null, height_cm: null, weight_kg: null, waist_circumference_cm: null, waist_to_hip_ratio: null, bmi: null,
  exercise_met_hours: null, smoking: "no", sun_exposure: null, alcohol_units_per_week: null, other_substances: false, other_substances_notes: "",
  fruits_vegetables_g_per_day: null, fish_g_per_day: null, fiber_g_per_day: null, red_meat_g_per_day: null, sugar_g_per_day: null, sodium_g_per_day: null,
  sleep_quality: null, deep_sleep_percent: null, sleep_hours_per_night: null, insomnia: null,
  gad7_score: null, substance_use_perceived: null, social_support_perceived: null, stress_perceived: null, job_strain_perceived: null,
  illness_senses: false, illness_senses_notes: "", illness_neurological: false, illness_hormone: false, illness_immune: false, illness_liver: false,
  illness_mental_health: false, illness_mental_health_notes: "", illness_kidney: false, illness_kidney_notes: "",
  illness_gastrointestinal: false, illness_gastrointestinal_notes: "", illness_cardiovascular: false, illness_cardiovascular_notes: "",
  illness_cancer: false, illness_cancer_notes: "", illness_musculoskeletal: false, illness_musculoskeletal_notes: "",
  prev_brain_damage: false, prev_osteoporotic_fracture: false, prev_cancer: false, prev_precancerous: false,
  genetic_nervous_system: false, genetic_cardiovascular: false, genetic_melanoma: false, genetic_cancer: false,
  skin_condition: null, infections_per_year: null, vision_acuity: null,
  cancer_screening_breast: null, cancer_screening_cervical: null, cancer_screening_colorectal: null,
};

const STEPS = [
  "Patient Details",
  "Basic Information",
  "Lifestyle",
  "Nutrition",
  "Sleep",
  "Mental Health",
  "Current Illnesses",
  "Previous Illnesses & Genetics",
  "Other Information",
];

export function AddPatientDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>({ ...defaultFormData });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateField = (field: keyof OnboardingFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) { toast.error("You must be logged in"); return; }
    if (!form.full_name.trim()) { toast.error("Patient name is required"); return; }

    setSaving(true);
    try {
      // 1. Create patient
      const { data: patient, error: patientErr } = await supabase
        .from("patients")
        .insert({
          full_name: form.full_name.trim(),
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          email: form.email || null,
          phone: form.phone || null,
          tier: (form.tier as any) || "tier_1",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (patientErr) throw patientErr;

      // 2. Create onboarding record
      const { error: onboardErr } = await supabase
        .from("patient_onboarding")
        .insert({
          patient_id: patient.id,
          created_by: user.id,
          age: form.age,
          height_cm: form.height_cm,
          weight_kg: form.weight_kg,
          waist_circumference_cm: form.waist_circumference_cm,
          waist_to_hip_ratio: form.waist_to_hip_ratio,
          bmi: form.bmi,
          exercise_met_hours: form.exercise_met_hours,
          smoking: form.smoking || null,
          sun_exposure: form.sun_exposure,
          alcohol_units_per_week: form.alcohol_units_per_week,
          other_substances: form.other_substances,
          other_substances_notes: form.other_substances_notes || null,
          fruits_vegetables_g_per_day: form.fruits_vegetables_g_per_day,
          fish_g_per_day: form.fish_g_per_day,
          fiber_g_per_day: form.fiber_g_per_day,
          red_meat_g_per_day: form.red_meat_g_per_day,
          sugar_g_per_day: form.sugar_g_per_day,
          sodium_g_per_day: form.sodium_g_per_day,
          sleep_quality: form.sleep_quality,
          deep_sleep_percent: form.deep_sleep_percent,
          sleep_hours_per_night: form.sleep_hours_per_night,
          insomnia: form.insomnia,
          gad7_score: form.gad7_score,
          substance_use_perceived: form.substance_use_perceived,
          social_support_perceived: form.social_support_perceived,
          stress_perceived: form.stress_perceived,
          job_strain_perceived: form.job_strain_perceived,
          illness_senses: form.illness_senses,
          illness_senses_notes: form.illness_senses_notes || null,
          illness_neurological: form.illness_neurological,
          illness_hormone: form.illness_hormone,
          illness_immune: form.illness_immune,
          illness_liver: form.illness_liver,
          illness_mental_health: form.illness_mental_health,
          illness_mental_health_notes: form.illness_mental_health_notes || null,
          illness_kidney: form.illness_kidney,
          illness_kidney_notes: form.illness_kidney_notes || null,
          illness_gastrointestinal: form.illness_gastrointestinal,
          illness_gastrointestinal_notes: form.illness_gastrointestinal_notes || null,
          illness_cardiovascular: form.illness_cardiovascular,
          illness_cardiovascular_notes: form.illness_cardiovascular_notes || null,
          illness_cancer: form.illness_cancer,
          illness_cancer_notes: form.illness_cancer_notes || null,
          illness_musculoskeletal: form.illness_musculoskeletal,
          illness_musculoskeletal_notes: form.illness_musculoskeletal_notes || null,
          prev_brain_damage: form.prev_brain_damage,
          prev_osteoporotic_fracture: form.prev_osteoporotic_fracture,
          prev_cancer: form.prev_cancer,
          prev_precancerous: form.prev_precancerous,
          genetic_nervous_system: form.genetic_nervous_system,
          genetic_cardiovascular: form.genetic_cardiovascular,
          genetic_melanoma: form.genetic_melanoma,
          genetic_cancer: form.genetic_cancer,
          skin_condition: form.skin_condition,
          infections_per_year: form.infections_per_year,
          vision_acuity: form.vision_acuity,
          cancer_screening_breast: form.cancer_screening_breast,
          cancer_screening_cervical: form.cancer_screening_cervical,
          cancer_screening_colorectal: form.cancer_screening_colorectal,
        });

      if (onboardErr) throw onboardErr;

      toast.success("Patient created successfully");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setForm({ ...defaultFormData });
      setStep(0);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep(0); setForm({ ...defaultFormData }); } }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Patient — {STEPS[step]}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <nav className="flex flex-wrap gap-1.5 pb-3 border-b">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (i === 0 || form.full_name.trim()) setStep(i);
                else toast.error("Patient name is required before skipping ahead");
              }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : i < step
                  ? "bg-muted text-foreground border-border"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </nav>

        <PatientFormSteps step={step} form={form} updateField={updateField} />

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            Back
          </Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 && step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
                Skip
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => {
                if (step === 0 && !form.full_name.trim()) {
                  toast.error("Patient name is required");
                  return;
                }
                setStep((s) => s + 1);
              }}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Create Patient"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
