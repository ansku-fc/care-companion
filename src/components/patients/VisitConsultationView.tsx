import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Calendar, ClipboardList, Save } from "lucide-react";
import { LabResultsStep, defaultLabResults, type LabResultsData } from "./LabResultsStep";
import type { Tables } from "@/integrations/supabase/types";

const VISIT_REASONS = [
  "Annual Check-up",
  "Follow-up Visit",
  "Acute Complaint",
  "Lab Review",
  "Medication Review",
  "Mental Health",
  "Lifestyle Counseling",
  "Pre-operative Assessment",
  "Post-operative Follow-up",
  "Vaccination",
  "Referral",
  "Other",
];

const VISIT_STEPS = [
  "Visit Reason",
  "Basic Information",
  "Lifestyle Update",
  "Current Symptoms",
  "Lab Results",
  "Summary & Notes",
];

type VisitFormData = {
  visit_reason: string;
  visit_reason_other: string;
  chief_complaint: string;
  doctor_notes: string;
  // Vitals
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  // Lifestyle updates
  exercise_met_hours: number | null;
  smoking: string;
  alcohol_units_per_week: number | null;
  sleep_hours_per_night: number | null;
  sleep_quality: number | null;
  // Symptoms
  symptom_notes: string;
  new_symptoms: string[];
};

const defaultVisitForm: VisitFormData = {
  visit_reason: "",
  visit_reason_other: "",
  chief_complaint: "",
  doctor_notes: "",
  blood_pressure_systolic: null,
  blood_pressure_diastolic: null,
  heart_rate: null,
  temperature: null,
  weight_kg: null,
  height_cm: null,
  bmi: null,
  exercise_met_hours: null,
  smoking: "",
  alcohol_units_per_week: null,
  sleep_hours_per_night: null,
  sleep_quality: null,
  symptom_notes: "",
  new_symptoms: [],
};

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

const SYMPTOM_OPTIONS = [
  "Smell changes", "Vision changes", "Hearing changes", "Neurological symptoms",
  "Immune/Allergies", "Respiratory", "Skin rash", "Menstruation/Menopause",
  "Mucous membranes", "Mobility restriction", "Kidney function", "Joint pain",
  "Gastrointestinal", "Balance issues", "Sleep apnoea",
];

interface Props {
  patient: Tables<"patients">;
  appointment?: Tables<"appointments">;
  onBack: () => void;
  onSaved: () => void;
}

export function VisitConsultationView({ patient, appointment, onBack, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<VisitFormData>({
    ...defaultVisitForm,
    visit_reason: appointment?.appointment_type === "follow_up" ? "Follow-up Visit" :
      appointment?.appointment_type === "check_up" ? "Annual Check-up" :
      appointment?.appointment_type === "urgent" ? "Acute Complaint" : "",
  });
  const [labResults, setLabResults] = useState<LabResultsData>({ ...defaultLabResults });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const updateField = (field: keyof VisitFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSymptom = (symptom: string) => {
    setForm((prev) => ({
      ...prev,
      new_symptoms: prev.new_symptoms.includes(symptom)
        ? prev.new_symptoms.filter((s) => s !== symptom)
        : [...prev.new_symptoms, symptom],
    }));
  };

  const handleSave = async () => {
    if (!user) { toast.error("You must be logged in"); return; }
    if (!form.visit_reason) { toast.error("Please select a visit reason"); return; }

    setSaving(true);
    try {
      const visitReason = form.visit_reason === "Other" ? form.visit_reason_other : form.visit_reason;

      // Create visit note
      const { error: visitErr } = await supabase.from("visit_notes").insert({
        patient_id: patient.id,
        provider_id: user.id,
        chief_complaint: visitReason,
        notes: form.doctor_notes || null,
        visit_date: new Date().toISOString().split("T")[0],
        vitals: {
          blood_pressure_systolic: form.blood_pressure_systolic,
          blood_pressure_diastolic: form.blood_pressure_diastolic,
          heart_rate: form.heart_rate,
          temperature: form.temperature,
          weight_kg: form.weight_kg,
          height_cm: form.height_cm,
          bmi: form.bmi,
          symptoms: form.new_symptoms,
          symptom_notes: form.symptom_notes,
          lifestyle: {
            exercise_met_hours: form.exercise_met_hours,
            smoking: form.smoking || null,
            alcohol_units_per_week: form.alcohol_units_per_week,
            sleep_hours_per_night: form.sleep_hours_per_night,
            sleep_quality: form.sleep_quality,
          },
        },
      });

      if (visitErr) throw visitErr;

      // Save lab results if any
      const hasLabData = labResults.ldl_mmol_l !== null || labResults.hba1c_mmol_mol !== null ||
        labResults.blood_pressure_systolic !== null || labResults.alat_u_l !== null ||
        labResults.egfr !== null || labResults.tsh_mu_l !== null;

      if (hasLabData) {
        const { error: labErr } = await supabase.from("patient_lab_results").insert({
          patient_id: patient.id,
          created_by: user.id,
          result_date: labResults.result_date,
          source: labResults.source,
          source_filename: labResults.source_filename,
          ldl_mmol_l: labResults.ldl_mmol_l,
          hba1c_mmol_mol: labResults.hba1c_mmol_mol,
          blood_pressure_systolic: labResults.blood_pressure_systolic,
          blood_pressure_diastolic: labResults.blood_pressure_diastolic,
          alat_u_l: labResults.alat_u_l,
          afos_alp_u_l: labResults.afos_alp_u_l,
          gt_u_l: labResults.gt_u_l,
          alat_asat_ratio: labResults.alat_asat_ratio,
          egfr: labResults.egfr,
          cystatin_c: labResults.cystatin_c,
          u_alb_krea_abnormal: labResults.u_alb_krea_abnormal,
          tsh_mu_l: labResults.tsh_mu_l,
          testosterone_estrogen_abnormal: labResults.testosterone_estrogen_abnormal,
          apoe_e4: labResults.apoe_e4,
        });
        if (labErr) throw labErr;
      }

      toast.success("Visit saved successfully");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Visits
        </Button>
        <h2 className="text-lg font-semibold">
          Visit — {patient.full_name}
          {appointment && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({appointment.title})
            </span>
          )}
        </h2>
      </div>

      {/* Step indicator */}
      <nav className="flex flex-wrap gap-1.5 pb-3 border-b">
        {VISIT_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
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

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Reason for Visit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Reason *</Label>
                <Select value={form.visit_reason} onValueChange={(v) => updateField("visit_reason", v)}>
                  <SelectTrigger><SelectValue placeholder="Choose visit reason..." /></SelectTrigger>
                  <SelectContent>
                    {VISIT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.visit_reason === "Other" && (
                <div className="space-y-1">
                  <Label>Specify Reason</Label>
                  <Input value={form.visit_reason_other} onChange={(e) => updateField("visit_reason_other", e.target.value)} placeholder="Enter visit reason..." />
                </div>
              )}
              <div className="space-y-2">
                <Label>Chief Complaint / Presenting Issue</Label>
                <Textarea
                  value={form.chief_complaint}
                  onChange={(e) => updateField("chief_complaint", e.target.value)}
                  placeholder="Describe the patient's main concern..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Doctor's Notes</Label>
                <Textarea
                  value={form.doctor_notes}
                  onChange={(e) => updateField("doctor_notes", e.target.value)}
                  placeholder="Your clinical observations and notes..."
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Vitals & Measurements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Blood Pressure (mmHg)</Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" placeholder="Systolic" value={form.blood_pressure_systolic ?? ""} onChange={(e) => updateField("blood_pressure_systolic", e.target.value === "" ? null : Number(e.target.value))} />
                  <span className="text-muted-foreground">/</span>
                  <Input type="number" placeholder="Diastolic" value={form.blood_pressure_diastolic ?? ""} onChange={(e) => updateField("blood_pressure_diastolic", e.target.value === "" ? null : Number(e.target.value))} />
                </div>
              </div>
              <NumField label="Heart Rate" suffix="bpm" value={form.heart_rate} onChange={(v) => updateField("heart_rate", v)} min={0} />
              <NumField label="Temperature" suffix="°C" value={form.temperature} onChange={(v) => updateField("temperature", v)} min={30} max={45} step={0.1} />
              <NumField label="Weight" suffix="kg" value={form.weight_kg} onChange={(v) => updateField("weight_kg", v)} min={0} />
              <NumField label="Height" suffix="cm" value={form.height_cm} onChange={(v) => updateField("height_cm", v)} min={0} />
              <NumField label="BMI" value={form.bmi} onChange={(v) => updateField("bmi", v)} min={0} step={0.1} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Lifestyle Update</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Exercise" suffix="MET hours/week" value={form.exercise_met_hours} onChange={(v) => updateField("exercise_met_hours", v)} min={0} />
              <div className="space-y-1">
                <Label>Smoking</Label>
                <Select value={form.smoking} onValueChange={(v) => updateField("smoking", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="previously">Previously</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <NumField label="Alcohol" suffix="units/week" value={form.alcohol_units_per_week} onChange={(v) => updateField("alcohol_units_per_week", v)} min={0} />
              <NumField label="Sleep" suffix="hours/night" value={form.sleep_hours_per_night} onChange={(v) => updateField("sleep_hours_per_night", v)} min={0} max={24} step={0.5} />
              <NumField label="Sleep Quality" suffix="1-10" value={form.sleep_quality} onChange={(v) => updateField("sleep_quality", v)} min={1} max={10} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Current Symptoms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((symptom) => (
                <Badge
                  key={symptom}
                  variant={form.new_symptoms.includes(symptom) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Symptom Details</Label>
              <Textarea
                value={form.symptom_notes}
                onChange={(e) => updateField("symptom_notes", e.target.value)}
                placeholder="Describe symptoms in detail..."
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <LabResultsStep data={labResults} onChange={setLabResults} />
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Visit Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Reason: </span>
              <span className="font-medium">{form.visit_reason === "Other" ? form.visit_reason_other : form.visit_reason || "—"}</span>
            </div>
            {form.chief_complaint && (
              <div>
                <span className="text-muted-foreground">Chief Complaint: </span>
                <span>{form.chief_complaint}</span>
              </div>
            )}
            {(form.blood_pressure_systolic || form.heart_rate || form.temperature) && (
              <div>
                <span className="text-muted-foreground">Vitals: </span>
                {form.blood_pressure_systolic && <span>BP {form.blood_pressure_systolic}/{form.blood_pressure_diastolic} </span>}
                {form.heart_rate && <span>HR {form.heart_rate} </span>}
                {form.temperature && <span>Temp {form.temperature}°C </span>}
              </div>
            )}
            {form.new_symptoms.length > 0 && (
              <div>
                <span className="text-muted-foreground">Symptoms: </span>
                <span>{form.new_symptoms.join(", ")}</span>
              </div>
            )}
            {form.doctor_notes && (
              <div>
                <p className="text-muted-foreground mb-1">Doctor's Notes:</p>
                <p className="whitespace-pre-wrap bg-muted/40 rounded-md p-3">{form.doctor_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => step === 0 ? onBack() : setStep((s) => s - 1)}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        <div className="flex gap-2">
          {step < VISIT_STEPS.length - 1 && step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>Skip</Button>
          )}
          {step < VISIT_STEPS.length - 1 ? (
            <Button onClick={() => {
              if (step === 0 && !form.visit_reason) {
                toast.error("Please select a visit reason");
                return;
              }
              setStep((s) => s + 1);
            }}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Visit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
