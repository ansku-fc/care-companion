import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Stethoscope, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  patient: Tables<"patients">;
  visit: Tables<"visit_notes">;
  onBack: () => void;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

export function OnboardingVisitDetailView({ patient, visit, onBack }: Props) {
  const [onboarding, setOnboarding] = useState<any>(null);
  const [allergies, setAllergies] = useState<Tables<"patient_allergies">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [obRes, alRes] = await Promise.all([
        supabase.from("patient_onboarding").select("*").eq("patient_id", patient.id).maybeSingle(),
        supabase.from("patient_allergies").select("*").eq("patient_id", patient.id),
      ]);
      if (cancelled) return;
      setOnboarding(obRes.data);
      setAllergies(alRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patient.id]);

  const ex = (onboarding?.extra_data ?? {}) as any;
  const moles: any[] = Array.isArray(ex.moles) ? ex.moles : [];
  const family: any[] = Array.isArray(ex.family_history) ? ex.family_history : [];
  const currentIllnesses: any[] = Array.isArray(ex.current_illnesses) ? ex.current_illnesses : [];
  const previousIllnesses: any[] = Array.isArray(ex.previous_illnesses) ? ex.previous_illnesses : [];
  const supplements: string[] = Array.isArray(ex.supplements) ? ex.supplements : [];

  const whRatio = onboarding?.waist_circumference_cm && onboarding?.hip_circumference_cm
    ? (Number(onboarding.waist_circumference_cm) / Number(onboarding.hip_circumference_cm)).toFixed(2)
    : null;

  const meaningfulCurrent = currentIllnesses.filter((i: any) => i?.illness_name?.trim());
  const meaningfulPrevious = previousIllnesses.filter((i: any) => i?.illness_name?.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Visits
        </Button>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Initial Consultation / Onboarding</h2>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {fmtDate(visit.visit_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Dr. Laine
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{patient.full_name}</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading onboarding data…</p>
      ) : !onboarding ? (
        <p className="text-sm text-muted-foreground">No onboarding data found for this patient.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Basic Information">
            <Field label="Age" value={onboarding.age} />
            <Field label="Height" value={onboarding.height_cm ? `${onboarding.height_cm} cm` : null} />
            <Field label="Weight" value={onboarding.weight_kg ? `${onboarding.weight_kg} kg` : null} />
            <Field label="BMI" value={onboarding.bmi} />
            <Field label="Waist" value={onboarding.waist_circumference_cm ? `${onboarding.waist_circumference_cm} cm` : null} />
            <Field label="Hip" value={onboarding.hip_circumference_cm ? `${onboarding.hip_circumference_cm} cm` : null} />
            <Field label="W/H" value={whRatio} />
            <Separator className="my-2" />
            <Field label="Occupation" value={onboarding.occupation} />
            <Field label="Education" value={onboarding.education_level} />
            <Field label="Shift work" value={onboarding.shift_work === true ? "Yes" : onboarding.shift_work === false ? "No" : null} />
          </Section>

          <Section title="Diagnostics">
            <Field
              label="Blood pressure 1st"
              value={onboarding.bp1_systolic && onboarding.bp1_diastolic ? `${onboarding.bp1_systolic}/${onboarding.bp1_diastolic} mmHg` : null}
            />
            <Field
              label="Blood pressure 2nd"
              value={onboarding.bp2_systolic && onboarding.bp2_diastolic ? `${onboarding.bp2_systolic}/${onboarding.bp2_diastolic} mmHg` : null}
            />
            <Field label="ECG notes" value={onboarding.ecg_notes} />
            <Separator className="my-2" />
            <div className="text-sm">
              <span className="text-muted-foreground">Allergies: </span>
              {allergies.length === 0 ? (
                <span>None recorded</span>
              ) : (
                <span className="font-medium">
                  {allergies.map((a) => `${a.allergen}${a.icd_code ? ` (${a.icd_code})` : ""}${a.severity ? ` — ${a.severity}` : ""}`).join(", ")}
                </span>
              )}
            </div>
            <Field label="Supplements" value={supplements.length > 0 ? supplements.join(", ") : null} />
          </Section>

          <Section title="Illnesses & Medications">
            <div className="text-sm">
              <span className="text-muted-foreground">Current illnesses: </span>
              <span className="font-medium">
                {meaningfulCurrent.length === 0
                  ? "None recorded"
                  : meaningfulCurrent.map((i: any) => i.illness_name).join(", ")}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Previous illnesses: </span>
              <span className="font-medium">
                {meaningfulPrevious.length === 0
                  ? "None recorded"
                  : meaningfulPrevious.map((i: any) => i.illness_name).join(", ")}
              </span>
            </div>
          </Section>

          <Section title="Family History">
            {family.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              family.map((f: any) => (
                <div key={f.id} className="text-sm">
                  <span className="font-medium">{f.relative}</span>
                  <span className="text-muted-foreground"> · {f.illness_name}</span>
                  {f.age_at_diagnosis ? <span className="text-muted-foreground"> · {f.age_at_diagnosis}</span> : null}
                </div>
              ))
            )}
          </Section>

          <Section title="Lifestyle">
            <Field
              label="Nicotine pouches"
              value={
                ex.nicotine_pouches_current
                  ? `${ex.nicotine_pouches_per_day ?? "—"}/day · ${ex.nicotine_pouches_strength ?? ""}`.trim()
                  : null
              }
            />
            <Field label="Smoking" value={ex.smoking_current ? "Yes" : ex.smoking_previous ? "Previously" : "No"} />
            <Field label="Alcohol" value={ex.alcohol_current ? `${onboarding.alcohol_units_per_week ?? ""} units/week` : "No"} />
            <Field label="Caffeine" value={ex.caffeine_current ? `${ex.caffeine_cups_per_day ?? ""} cups/day` : "No"} />
            <Field label="Drugs" value={ex.drugs_current ? "Yes" : "No"} />
          </Section>

          <Section title="Physical Activity">
            <Field label="Cardio easy" value={onboarding.cardio_easy_hours_per_week ? `${onboarding.cardio_easy_hours_per_week} h/week` : null} />
            <Field label="Cardio moderate" value={onboarding.cardio_moderate_hours_per_week ? `${onboarding.cardio_moderate_hours_per_week} h/week` : null} />
            <Field label="Cardio vigorous" value={onboarding.cardio_vigorous_hours_per_week ? `${onboarding.cardio_vigorous_hours_per_week} h/week` : null} />
            <Field label="Strength" value={onboarding.strength_hours_per_week ? `${onboarding.strength_hours_per_week} h/week` : null} />
            <Field label="MET" value={onboarding.exercise_met_hours ? `${onboarding.exercise_met_hours} hours/week` : null} />
            <Field label="Sedentary" value={onboarding.sedentary_hours_per_day ? `${onboarding.sedentary_hours_per_day} h/day` : "not recorded"} />
          </Section>

          <Section title="Nutrition">
            <Field label="Diet" value={ex.diet_type} />
            <Field label="Water" value={ex.water_litres_per_day ? `${ex.water_litres_per_day} L/day` : null} />
            <Field label="Fruit & veg" value={onboarding.fruits_vegetables_g_per_day ? `${onboarding.fruits_vegetables_g_per_day} g` : null} />
            <Field label="Red meat" value={onboarding.red_meat_g_per_day ? `${onboarding.red_meat_g_per_day} g` : null} />
            <Field label="Sugar" value={onboarding.sugar_g_per_day ? `${onboarding.sugar_g_per_day} g` : null} />
            <Field label="Fiber" value={onboarding.fiber_g_per_day ? `${onboarding.fiber_g_per_day} g (estimated)` : null} />
          </Section>

          <Section title="Sleep">
            <Field label="Quality" value={onboarding.sleep_quality ? `${onboarding.sleep_quality}/10` : null} />
            <Field label="Daytime fatigue" value={ex.daytime_fatigue ? `${ex.daytime_fatigue}/10` : null} />
            <Field label="Bedtime" value={ex.sleep_bedtime} />
            <Field label="Wake" value={ex.sleep_waking_time} />
            <Field label="Deep sleep" value={onboarding.deep_sleep_percent ? `${onboarding.deep_sleep_percent}%` : null} />
            <Field
              label="Sleep disorders"
              value={
                ex.sleep_apnea || ex.restless_legs
                  ? [ex.sleep_apnea ? "Sleep apnea" : null, ex.restless_legs ? "Restless legs" : null].filter(Boolean).join(", ")
                  : "None"
              }
            />
          </Section>

          <Section title="Mental Health">
            <Field label="Stress" value={onboarding.stress_perceived ? `${onboarding.stress_perceived}/10` : null} />
            <Field label="Workload" value={ex.workload_perceived ? `${ex.workload_perceived}/10` : null} />
            <Field label="Recovery" value={ex.recovery_perceived ? `${ex.recovery_perceived}/10` : null} />
            <Field label="Social support" value={onboarding.social_support_perceived ? `${onboarding.social_support_perceived}/10` : null} />
            <Field label="GAD-2" value={onboarding.gad2_score} />
            <Field label="PHQ-2" value={onboarding.phq2_score} />
          </Section>

          <Section title="Cancer & Screening">
            <Field label="Breast screening" value={ex.screen_breast_year} />
            <Field label="Cervix screening" value={ex.screen_cervix_year} />
            <Field label="Colorectum screening" value={ex.screen_colorectum_year} />
            <Field label="Skin screening" value={ex.screen_skin_year} />
            <Field label="Sun exposure" value={onboarding.sun_exposure === true ? "Yes" : onboarding.sun_exposure === false ? "No" : null} />
            <Field label="Protection" value={ex.sun_protection_method} />
          </Section>

          <Section title="Physical Examination (Status)">
            {moles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No moles recorded</p>
            ) : (
              moles.map((m: any) => {
                const flags = [m.asymmetry, m.borders, m.color, m.size, m.change, m.symptoms].filter((v) => v && v !== "Symmetrical" && v !== "Regular" && v !== "Single color" && v !== "No change" && v !== "None");
                return (
                  <div key={m.id} className="text-sm">
                    <div className="font-medium">{m.label}: {m.location}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {[m.asymmetry, m.borders, m.color, m.size, m.change, m.symptoms].filter(Boolean).join(" · ")}
                      {flags.length > 0 ? ` — ${flags.length} ABCDE flag${flags.length === 1 ? "" : "s"}` : ""}
                    </div>
                  </div>
                );
              })
            )}
          </Section>

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Clinical Synthesis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Doctor's Summary</div>
                <div className="text-sm italic text-muted-foreground">(empty — to be filled by doctor)</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Recommendations</div>
                <div className="text-sm italic text-muted-foreground">(empty — to be filled by doctor)</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
