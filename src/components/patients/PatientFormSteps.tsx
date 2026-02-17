import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDownAZ, LayoutGrid } from "lucide-react";
import type { OnboardingFormData } from "./AddPatientDialog";

type SortMode = "category" | "alphabetical";

function SortToggle({ mode, onChange }: { mode: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <div className="flex gap-1 mb-3">
      <Button
        type="button"
        variant={mode === "category" ? "default" : "outline"}
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => onChange("category")}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> By Category
      </Button>
      <Button
        type="button"
        variant={mode === "alphabetical" ? "default" : "outline"}
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => onChange("alphabetical")}
      >
        <ArrowDownAZ className="h-3.5 w-3.5" /> A–Z
      </Button>
    </div>
  );
}

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
  const [illnessSort, setIllnessSort] = useState<SortMode>("category");
  const [symptomSort, setSymptomSort] = useState<SortMode>("category");
  const [prevIllnessSort, setPrevIllnessSort] = useState<SortMode>("category");

  const currentIllnesses = useMemo(() => {
    const items: { label: string; category: string; field: keyof OnboardingFormData; notesField?: keyof OnboardingFormData }[] = [
      { label: "Senses", category: "Senses", field: "illness_senses", notesField: "illness_senses_notes" },
      { label: "Neurological", category: "Nervous System", field: "illness_neurological" },
      { label: "Hormone Function", category: "Hormones", field: "illness_hormone" },
      { label: "Immune Function & Allergies", category: "Immunity", field: "illness_immune" },
      { label: "Liver Function", category: "Liver", field: "illness_liver" },
      { label: "Mental Health", category: "Mental Health", field: "illness_mental_health", notesField: "illness_mental_health_notes" },
      { label: "Kidney Function", category: "Kidney", field: "illness_kidney", notesField: "illness_kidney_notes" },
      { label: "Gastrointestinal & Digestion", category: "Gastrointestinal", field: "illness_gastrointestinal", notesField: "illness_gastrointestinal_notes" },
      { label: "Cardiovascular", category: "Cardiovascular", field: "illness_cardiovascular", notesField: "illness_cardiovascular_notes" },
      { label: "Cancer", category: "Cancer", field: "illness_cancer", notesField: "illness_cancer_notes" },
      { label: "Musculoskeletal", category: "Musculoskeletal", field: "illness_musculoskeletal", notesField: "illness_musculoskeletal_notes" },
    ];
    if (illnessSort === "alphabetical") return [...items].sort((a, b) => a.label.localeCompare(b.label));
    return items;
  }, [illnessSort]);

  const symptoms = useMemo(() => {
    const items: { label: string; category: string; field: keyof OnboardingFormData }[] = [
      { label: "Smell", category: "Senses", field: "symptom_smell" },
      { label: "Vision", category: "Senses", field: "symptom_vision" },
      { label: "Hearing", category: "Senses", field: "symptom_hearing" },
      { label: "Neurological", category: "Nervous System", field: "symptom_neurological" },
      { label: "Immune Defence or Allergies", category: "Immunity", field: "symptom_immune_allergies" },
      { label: "Respiratory", category: "Respiratory", field: "symptom_respiratory" },
      { label: "Skin Changes or Rash", category: "Skin", field: "symptom_skin_rash" },
      { label: "Menstruation or Menopause", category: "Hormones", field: "symptom_menstruation_menopause" },
      { label: "Mucous Membranes", category: "Mucous", field: "symptom_mucous_membranes" },
      { label: "Other Mobility Restriction", category: "Musculoskeletal", field: "symptom_mobility_restriction" },
      { label: "Kidney Function", category: "Kidney", field: "symptom_kidney_function" },
      { label: "Joint Pain", category: "Musculoskeletal", field: "symptom_joint_pain" },
      { label: "Gastrointestinal", category: "Gastrointestinal", field: "symptom_gastrointestinal" },
      { label: "Balance", category: "Nervous System", field: "symptom_balance" },
      { label: "Sleep Apnoea", category: "Sleep", field: "symptom_sleep_apnoea" },
    ];
    if (symptomSort === "alphabetical") return [...items].sort((a, b) => a.label.localeCompare(b.label));
    // Group by category
    return [...items].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  }, [symptomSort]);

  const prevIllnesses = useMemo(() => {
    const items: { label: string; category: string; field: keyof OnboardingFormData; notesField?: keyof OnboardingFormData }[] = [
      { label: "Brain Damage", category: "Nervous System", field: "prev_brain_damage", notesField: "prev_brain_damage_notes" },
      { label: "Osteoporotic Fracture", category: "Musculoskeletal", field: "prev_osteoporotic_fracture", notesField: "prev_osteoporotic_fracture_notes" },
      { label: "Cancer", category: "Cancer", field: "prev_cancer", notesField: "prev_cancer_notes" },
      { label: "Precancerous Condition", category: "Cancer", field: "prev_precancerous", notesField: "prev_precancerous_notes" },
    ];
    if (prevIllnessSort === "alphabetical") return [...items].sort((a, b) => a.label.localeCompare(b.label));
    return [...items].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  }, [prevIllnessSort]);

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
          <div className="flex gap-2">
            <Select value={form.phone_country_code || "+44"} onValueChange={(v) => updateField("phone_country_code", v)}>
              <SelectTrigger className="w-[100px] shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="+44">🇬🇧 +44</SelectItem>
                <SelectItem value="+1">🇺🇸 +1</SelectItem>
                <SelectItem value="+46">🇸🇪 +46</SelectItem>
                <SelectItem value="+47">🇳🇴 +47</SelectItem>
                <SelectItem value="+45">🇩🇰 +45</SelectItem>
                <SelectItem value="+49">🇩🇪 +49</SelectItem>
                <SelectItem value="+33">🇫🇷 +33</SelectItem>
                <SelectItem value="+34">🇪🇸 +34</SelectItem>
                <SelectItem value="+39">🇮🇹 +39</SelectItem>
                <SelectItem value="+31">🇳🇱 +31</SelectItem>
                <SelectItem value="+61">🇦🇺 +61</SelectItem>
                <SelectItem value="+91">🇮🇳 +91</SelectItem>
                <SelectItem value="+86">🇨🇳 +86</SelectItem>
                <SelectItem value="+81">🇯🇵 +81</SelectItem>
                <SelectItem value="+82">🇰🇷 +82</SelectItem>
                <SelectItem value="+55">🇧🇷 +55</SelectItem>
                <SelectItem value="+353">🇮🇪 +353</SelectItem>
                <SelectItem value="+41">🇨🇭 +41</SelectItem>
                <SelectItem value="+43">🇦🇹 +43</SelectItem>
                <SelectItem value="+48">🇵🇱 +48</SelectItem>
              </SelectContent>
            </Select>
            <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="flex-1" />
          </div>
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
        <SortToggle mode={illnessSort} onChange={setIllnessSort} />
        {currentIllnesses.map((item) => (
          <BoolField
            key={item.field}
            label={item.label}
            value={form[item.field] as boolean}
            onChange={(v) => updateField(item.field, v)}
            notesField={!!item.notesField}
            notesValue={item.notesField ? (form[item.notesField] as string) : undefined}
            onNotesChange={item.notesField ? (v) => updateField(item.notesField!, v) : undefined}
          />
        ))}
      </div>
    );
  }

  if (step === 7) {
    let lastCategory = "";
    return (
      <div className="space-y-4">
        <SortToggle mode={symptomSort} onChange={setSymptomSort} />
        {symptoms.map((item) => {
          const showHeader = symptomSort === "category" && item.category !== lastCategory;
          lastCategory = item.category;
          return (
            <div key={item.field}>
              {showHeader && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">{item.category}</p>}
              <BoolField
                label={item.label}
                value={form[item.field] as boolean}
                onChange={(v) => updateField(item.field, v)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (step === 8) {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">Previous Illnesses</h4>
          <SortToggle mode={prevIllnessSort} onChange={setPrevIllnessSort} />
          <div className="space-y-3">
            {prevIllnesses.map((item) => (
              <BoolField
                key={item.field}
                label={item.label}
                value={form[item.field] as boolean}
                onChange={(v) => updateField(item.field, v)}
                notesField={!!item.notesField}
                notesValue={item.notesField ? (form[item.notesField] as string) : undefined}
                onNotesChange={item.notesField ? (v) => updateField(item.notesField!, v) : undefined}
              />
            ))}
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

  // Step 9 — Other info
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
