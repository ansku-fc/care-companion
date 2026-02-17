import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OnboardingFormData } from "./AddPatientDialog";

interface Props {
  step: number;
  form: OnboardingFormData;
  updateField: (field: keyof OnboardingFormData, value: any) => void;
}

function NumField({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}{suffix ? ` (${suffix})` : ""}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        min={min} max={max} step={step}
      />
    </div>
  );
}

function BoolField({ label, value, onChange, notesField, notesValue, onNotesChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
  notesField?: boolean; notesValue?: string; onNotesChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Switch checked={value} onCheckedChange={onChange} />
      </div>
      {notesField && value && (
        <Textarea
          placeholder="Notes..."
          value={notesValue || ""}
          onChange={(e) => onNotesChange?.(e.target.value)}
          className="mt-1"
        />
      )}
    </div>
  );
}

export function PatientFormSteps({ step, form, updateField }: Props) {
  const TIER_OPTIONS = [
    { value: "tier_1", label: "Tier 1" },
    { value: "tier_2", label: "Tier 2" },
    { value: "tier_3", label: "Tier 3" },
    { value: "tier_4", label: "Tier 4" },
    { value: "children", label: "Children" },
    { value: "onboarding", label: "Onboarding" },
    { value: "acute", label: "Acute" },
    { value: "case_management", label: "Case Management" },
  ];

  if (step === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Full Name *</Label>
          <Input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date of Birth</Label>
          <Input type="date" value={form.date_of_birth} onChange={(e) => {
            updateField("date_of_birth", e.target.value);
            if (e.target.value) {
              const today = new Date();
              const dob = new Date(e.target.value);
              let age = today.getFullYear() - dob.getFullYear();
              const m = today.getMonth() - dob.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
              updateField("age", age >= 0 ? age : null);
            } else {
              updateField("age", null);
            }
          }} />
        </div>
        <div className="space-y-1">
          <Label>Age</Label>
          <Input type="number" value={form.age ?? ""} disabled className="bg-muted" />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Post Code</Label>
          <Input value={form.post_code} onChange={(e) => updateField("post_code", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Country</Label>
          <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tier</Label>
          <Select value={form.tier} onValueChange={(v) => updateField("tier", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Age" suffix="years" value={form.age} onChange={(v) => updateField("age", v)} min={0} max={150} />
        <NumField label="Height" suffix="cm" value={form.height_cm} onChange={(v) => updateField("height_cm", v)} min={0} />
        <NumField label="Weight" suffix="kg" value={form.weight_kg} onChange={(v) => updateField("weight_kg", v)} min={0} />
        <NumField label="Waist Circumference" suffix="cm" value={form.waist_circumference_cm} onChange={(v) => updateField("waist_circumference_cm", v)} min={0} />
        <NumField label="Waist-to-Hip Ratio" value={form.waist_to_hip_ratio} onChange={(v) => updateField("waist_to_hip_ratio", v)} min={0} max={2} step={0.01} />
        <NumField label="BMI" value={form.bmi} onChange={(v) => updateField("bmi", v)} min={0} max={100} step={0.1} />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Exercise, MET hours/week" value={form.exercise_met_hours} onChange={(v) => updateField("exercise_met_hours", v)} min={0} />
        <div className="space-y-1">
          <Label>Smoking</Label>
          <Select value={form.smoking} onValueChange={(v) => updateField("smoking", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="previously">Previously</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>Sun Exposure</Label>
          <Switch checked={form.sun_exposure ?? false} onCheckedChange={(v) => updateField("sun_exposure", v)} />
        </div>
        <NumField label="Alcohol" suffix="units/week" value={form.alcohol_units_per_week} onChange={(v) => updateField("alcohol_units_per_week", v)} min={0} />
        <div className="sm:col-span-2 space-y-2">
          <BoolField
            label="Other Substances"
            value={form.other_substances}
            onChange={(v) => updateField("other_substances", v)}
            notesField
            notesValue={form.other_substances_notes}
            onNotesChange={(v) => updateField("other_substances_notes", v)}
          />
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Fruits & Vegetables" suffix="g/day" value={form.fruits_vegetables_g_per_day} onChange={(v) => updateField("fruits_vegetables_g_per_day", v)} min={0} />
        <NumField label="Fish" suffix="g/day" value={form.fish_g_per_day} onChange={(v) => updateField("fish_g_per_day", v)} min={0} />
        <NumField label="Fiber" suffix="g/day" value={form.fiber_g_per_day} onChange={(v) => updateField("fiber_g_per_day", v)} min={0} />
        <NumField label="Red Meat" suffix="g/day" value={form.red_meat_g_per_day} onChange={(v) => updateField("red_meat_g_per_day", v)} min={0} />
        <NumField label="Sugar" suffix="g/day" value={form.sugar_g_per_day} onChange={(v) => updateField("sugar_g_per_day", v)} min={0} />
        <NumField label="Sodium" suffix="g/day" value={form.sodium_g_per_day} onChange={(v) => updateField("sodium_g_per_day", v)} min={0} />
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Sleep Quality" suffix="1-10" value={form.sleep_quality} onChange={(v) => updateField("sleep_quality", v)} min={1} max={10} />
        <NumField label="Deep Sleep" suffix="% of total" value={form.deep_sleep_percent} onChange={(v) => updateField("deep_sleep_percent", v)} min={0} max={100} />
        <NumField label="Amount of Sleep" suffix="hours/night" value={form.sleep_hours_per_night} onChange={(v) => updateField("sleep_hours_per_night", v)} min={0} max={24} step={0.5} />
        <div className="flex items-center justify-between">
          <Label>Insomnia</Label>
          <Switch checked={form.insomnia ?? false} onCheckedChange={(v) => updateField("insomnia", v)} />
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="GAD-7 Score" suffix="0-21" value={form.gad7_score} onChange={(v) => updateField("gad7_score", v)} min={0} max={21} />
        <NumField label="Substance Use, Perceived" suffix="1-10" value={form.substance_use_perceived} onChange={(v) => updateField("substance_use_perceived", v)} min={1} max={10} />
        <NumField label="Social Support, Perceived" suffix="1-10" value={form.social_support_perceived} onChange={(v) => updateField("social_support_perceived", v)} min={1} max={10} />
        <NumField label="Stress, Perceived" suffix="1-10" value={form.stress_perceived} onChange={(v) => updateField("stress_perceived", v)} min={1} max={10} />
        <NumField label="Job Strain, Perceived" suffix="1-10" value={form.job_strain_perceived} onChange={(v) => updateField("job_strain_perceived", v)} min={1} max={10} />
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="space-y-4">
        <BoolField label="Senses" value={form.illness_senses} onChange={(v) => updateField("illness_senses", v)} notesField notesValue={form.illness_senses_notes} onNotesChange={(v) => updateField("illness_senses_notes", v)} />
        <BoolField label="Neurological" value={form.illness_neurological} onChange={(v) => updateField("illness_neurological", v)} />
        <BoolField label="Hormone Function" value={form.illness_hormone} onChange={(v) => updateField("illness_hormone", v)} />
        <BoolField label="Immune Function & Allergies" value={form.illness_immune} onChange={(v) => updateField("illness_immune", v)} />
        <BoolField label="Liver Function" value={form.illness_liver} onChange={(v) => updateField("illness_liver", v)} />
        <BoolField label="Mental Health" value={form.illness_mental_health} onChange={(v) => updateField("illness_mental_health", v)} notesField notesValue={form.illness_mental_health_notes} onNotesChange={(v) => updateField("illness_mental_health_notes", v)} />
        <BoolField label="Kidney Function" value={form.illness_kidney} onChange={(v) => updateField("illness_kidney", v)} notesField notesValue={form.illness_kidney_notes} onNotesChange={(v) => updateField("illness_kidney_notes", v)} />
        <BoolField label="Gastrointestinal & Digestion" value={form.illness_gastrointestinal} onChange={(v) => updateField("illness_gastrointestinal", v)} notesField notesValue={form.illness_gastrointestinal_notes} onNotesChange={(v) => updateField("illness_gastrointestinal_notes", v)} />
        <BoolField label="Cardiovascular" value={form.illness_cardiovascular} onChange={(v) => updateField("illness_cardiovascular", v)} notesField notesValue={form.illness_cardiovascular_notes} onNotesChange={(v) => updateField("illness_cardiovascular_notes", v)} />
        <BoolField label="Cancer" value={form.illness_cancer} onChange={(v) => updateField("illness_cancer", v)} notesField notesValue={form.illness_cancer_notes} onNotesChange={(v) => updateField("illness_cancer_notes", v)} />
        <BoolField label="Musculoskeletal" value={form.illness_musculoskeletal} onChange={(v) => updateField("illness_musculoskeletal", v)} notesField notesValue={form.illness_musculoskeletal_notes} onNotesChange={(v) => updateField("illness_musculoskeletal_notes", v)} />
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="space-y-4">
        <BoolField label="Senses: Smell" value={form.symptom_smell} onChange={(v) => updateField("symptom_smell", v)} />
        <BoolField label="Senses: Vision" value={form.symptom_vision} onChange={(v) => updateField("symptom_vision", v)} />
        <BoolField label="Senses: Hearing" value={form.symptom_hearing} onChange={(v) => updateField("symptom_hearing", v)} />
        <BoolField label="Neurological" value={form.symptom_neurological} onChange={(v) => updateField("symptom_neurological", v)} />
        <BoolField label="Immune Defence or Allergies" value={form.symptom_immune_allergies} onChange={(v) => updateField("symptom_immune_allergies", v)} />
        <BoolField label="Respiratory" value={form.symptom_respiratory} onChange={(v) => updateField("symptom_respiratory", v)} />
        <BoolField label="Skin Changes or Rash" value={form.symptom_skin_rash} onChange={(v) => updateField("symptom_skin_rash", v)} />
        <BoolField label="Menstruation or Menopause" value={form.symptom_menstruation_menopause} onChange={(v) => updateField("symptom_menstruation_menopause", v)} />
        <BoolField label="Mucous Membranes" value={form.symptom_mucous_membranes} onChange={(v) => updateField("symptom_mucous_membranes", v)} />
        <BoolField label="Other Mobility Restriction" value={form.symptom_mobility_restriction} onChange={(v) => updateField("symptom_mobility_restriction", v)} />
        <BoolField label="Kidney Function" value={form.symptom_kidney_function} onChange={(v) => updateField("symptom_kidney_function", v)} />
        <BoolField label="Joint Pain" value={form.symptom_joint_pain} onChange={(v) => updateField("symptom_joint_pain", v)} />
        <BoolField label="Gastrointestinal" value={form.symptom_gastrointestinal} onChange={(v) => updateField("symptom_gastrointestinal", v)} />
        <BoolField label="Balance" value={form.symptom_balance} onChange={(v) => updateField("symptom_balance", v)} />
        <BoolField label="Sleep Apnoea" value={form.symptom_sleep_apnoea} onChange={(v) => updateField("symptom_sleep_apnoea", v)} />
      </div>
    );
  }

  if (step === 8) {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">Previous Illnesses</h4>
          <div className="space-y-3">
            <BoolField label="Brain Damage" value={form.prev_brain_damage} onChange={(v) => updateField("prev_brain_damage", v)} />
            <BoolField label="Osteoporotic Fracture" value={form.prev_osteoporotic_fracture} onChange={(v) => updateField("prev_osteoporotic_fracture", v)} />
            <BoolField label="Cancer" value={form.prev_cancer} onChange={(v) => updateField("prev_cancer", v)} />
            <BoolField label="Precancerous Condition" value={form.prev_precancerous} onChange={(v) => updateField("prev_precancerous", v)} />
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-3">Genetic Predispositions</h4>
          <div className="space-y-3">
            <BoolField label="Nervous System" value={form.genetic_nervous_system} onChange={(v) => updateField("genetic_nervous_system", v)} />
            <BoolField label="Cardiovascular" value={form.genetic_cardiovascular} onChange={(v) => updateField("genetic_cardiovascular", v)} />
            <BoolField label="Melanoma" value={form.genetic_melanoma} onChange={(v) => updateField("genetic_melanoma", v)} />
            <BoolField label="Cancer" value={form.genetic_cancer} onChange={(v) => updateField("genetic_cancer", v)} />
          </div>
        </div>
      </div>
    );
  }

  // Step 8 — Other info
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <NumField label="Skin Condition" suffix="1-10" value={form.skin_condition} onChange={(v) => updateField("skin_condition", v)} min={1} max={10} />
      <NumField label="Infections" suffix="cases/year" value={form.infections_per_year} onChange={(v) => updateField("infections_per_year", v)} min={0} />
      <NumField label="Vision Acuity" suffix="1-10" value={form.vision_acuity} onChange={(v) => updateField("vision_acuity", v)} min={1} max={10} />
      <div className="sm:col-span-2 space-y-3">
        <h4 className="font-medium">Cancer Screening</h4>
        <div className="flex items-center justify-between">
          <Label>Breast</Label>
          <Switch checked={form.cancer_screening_breast ?? false} onCheckedChange={(v) => updateField("cancer_screening_breast", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Cervical</Label>
          <Switch checked={form.cancer_screening_cervical ?? false} onCheckedChange={(v) => updateField("cancer_screening_cervical", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Colorectal</Label>
          <Switch checked={form.cancer_screening_colorectal ?? false} onCheckedChange={(v) => updateField("cancer_screening_colorectal", v)} />
        </div>
      </div>
    </div>
  );
}
