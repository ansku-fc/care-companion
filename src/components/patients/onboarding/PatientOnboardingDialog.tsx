import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";

import { toast } from "sonner";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import {
  OnboardingFormProvider,
  useOnboardingForm,
  blankOnboardingForm,
  calcBmi,
  calcWaistHipRatio,
  calcMetHours,
  calcFiberFromFruitVeg,
  type OnboardingForm,
} from "./OnboardingFormContext";
import { StepBasicInfo } from "./StepBasicInfo";
import { StepIllnesses } from "./StepIllnesses";
import { StepFamilyHistory } from "./StepFamilyHistory";
import { StepLifestyle } from "./StepLifestyle";
import { StepActivity } from "./StepActivity";
import { StepNutrition } from "./StepNutrition";
import { StepSleep } from "./StepSleep";
import { StepMentalHealth } from "./StepMentalHealth";
import { StepCancer } from "./StepCancer";
import { StepStatus } from "./StepStatus";
import { blankExamFindings, type AllergyEntry } from "./OnboardingFormContext";
import { findAllergen } from "@/lib/allergens";

function normalizeAllergies(raw: unknown): AllergyEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): AllergyEntry | null => {
      if (typeof item === "string") {
        // Legacy string[] format
        const trimmed = item.trim();
        if (!trimmed) return null;
        return { name: trimmed, icd_code: findAllergen(trimmed)?.icd10 ?? null, severity: null };
      }
      if (item && typeof item === "object" && typeof (item as any).name === "string") {
        const name = (item as any).name.trim();
        if (!name) return null;
        return {
          name,
          icd_code: (item as any).icd_code ?? findAllergen(name)?.icd10 ?? null,
          severity: ((item as any).severity ?? null) as AllergyEntry["severity"],
        };
      }
      return null;
    })
    .filter((x): x is AllergyEntry => x !== null);
}

type Props = {
  patientId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once after the doctor finishes the final step. */
  onCompleted?: () => void;
};

const STEP_LABELS = [
  "Basic Information",
  "Illnesses & Medications",
  "Family History",
  "Lifestyle",
  "Physical Activity",
  "Nutrition",
  "Sleep",
  "Mental Health",
  "Cancer",
  "Status",
];
const TOTAL_STEPS = STEP_LABELS.length;

/**
 * Public wrapper. Loads any existing draft for the patient, then mounts the
 * form provider so children share state.
 */
export function PatientOnboardingDialog(props: Props) {
  const [initial, setInitial] = useState<Partial<OnboardingForm> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!props.open) {
      setInitial(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data }, { data: patientRow }] = await Promise.all([
        supabase
          .from("patient_onboarding")
          .select("*")
          .eq("patient_id", props.patientId)
          .maybeSingle(),
        supabase
          .from("patients")
          .select("date_of_birth")
          .eq("id", props.patientId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const dobAge = patientRow?.date_of_birth
        ? Math.floor((Date.now() - new Date(patientRow.date_of_birth).getTime()) / 31557600000)
        : null;
      if (data) {
        const extra = ((data as any).extra_data ?? {}) as Record<string, unknown>;
        setInitial({
          age: data.age ?? dobAge,
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          waist_circumference_cm: data.waist_circumference_cm,
          hip_circumference_cm: data.hip_circumference_cm,
          occupation: ((data as any).occupation as string) ?? "",
          education_level: ((data as any).education_level as string) ?? "",
          shift_work: Boolean((data as any).shift_work),
          bp1_systolic: (data as any).bp1_systolic ?? null,
          bp1_diastolic: (data as any).bp1_diastolic ?? null,
          bp2_systolic: (data as any).bp2_systolic ?? null,
          bp2_diastolic: (data as any).bp2_diastolic ?? null,
          ecg_notes: ((data as any).ecg_notes as string) ?? "",
          allergies: normalizeAllergies(extra.allergies),
          supplements: (extra.supplements as string[]) ?? [],
          current_illnesses: (extra.current_illnesses as any[]) ?? [],
          previous_illnesses: (extra.previous_illnesses as any[]) ?? [],
          family_history: (extra.family_history as any[]) ?? [],

          // Step 4 — Lifestyle (mostly extra_data; alcohol_units_per_week is a column)
          smoking_current: Boolean(extra.smoking_current),
          smoking_cigs_per_day: (extra.smoking_cigs_per_day as number) ?? null,
          smoking_years: (extra.smoking_years as number) ?? null,
          smoking_previous: Boolean(extra.smoking_previous),
          smoking_previous_years: (extra.smoking_previous_years as number) ?? null,
          alcohol_current: Boolean(extra.alcohol_current),
          alcohol_units_per_week: (data as any).alcohol_units_per_week ?? null,
          caffeine_current: Boolean(extra.caffeine_current),
          caffeine_cups_per_day: (extra.caffeine_cups_per_day as number) ?? null,
          caffeine_last_cup_time: (extra.caffeine_last_cup_time as string) ?? "",
          nicotine_pouches_current: Boolean(extra.nicotine_pouches_current),
          nicotine_pouches_per_day: (extra.nicotine_pouches_per_day as number) ?? null,
          nicotine_pouches_strength: (extra.nicotine_pouches_strength as string) ?? "",
          drugs_current: Boolean(extra.drugs_current),
          drugs_notes: (extra.drugs_notes as string) ?? "",

          // Step 5 — Physical Activity (all dedicated columns)
          cardio_easy_hours_per_week: (data as any).cardio_easy_hours_per_week ?? null,
          cardio_moderate_hours_per_week: (data as any).cardio_moderate_hours_per_week ?? null,
          cardio_vigorous_hours_per_week: (data as any).cardio_vigorous_hours_per_week ?? null,
          strength_hours_per_week: (data as any).strength_hours_per_week ?? null,
          sedentary_hours_per_day: (data as any).sedentary_hours_per_day ?? null,

          // Step 6 — Nutrition
          diet_type: (extra.diet_type as string) ?? "",
          water_litres_per_day: (extra.water_litres_per_day as number) ?? null,
          fruits_vegetables_g_per_day: (data as any).fruits_vegetables_g_per_day ?? null,
          fish_g_per_day: (data as any).fish_g_per_day ?? null,
          red_meat_g_per_day: (data as any).red_meat_g_per_day ?? null,
          sugar_g_per_day: (data as any).sugar_g_per_day ?? null,
          sodium_g_per_day: (data as any).sodium_g_per_day ?? null,

          // Step 7 — Sleep
          sleep_quality: (data as any).sleep_quality ?? null,
          sleep_bedtime: (extra.sleep_bedtime as string) ?? "",
          sleep_waking_time: (extra.sleep_waking_time as string) ?? "",
          sleep_latency_mins: (extra.sleep_latency_mins as number) ?? null,
          sleep_total_hours: (data as any).sleep_hours_per_night ?? null,
          sleep_deep_percent: (data as any).deep_sleep_percent ?? null,
          sleep_efficiency_percent: (extra.sleep_efficiency_percent as number) ?? null,
          daytime_fatigue: (extra.daytime_fatigue as number) ?? null,
          insomnia: Boolean((data as any).insomnia),
          restless_legs: Boolean(extra.restless_legs),
          sleep_apnea: Boolean(extra.sleep_apnea),
          sleep_apnea_type: (extra.sleep_apnea_type as string) ?? "",
          sleep_apnea_severity: (extra.sleep_apnea_severity as string) ?? "",

          // Step 8 — Mental Health
          social_support_perceived: (data as any).social_support_perceived ?? null,
          recovery_perceived: (extra.recovery_perceived as number) ?? null,
          workload_perceived: (extra.workload_perceived as number) ?? null,
          stress_perceived: (data as any).stress_perceived ?? null,
          gad2_enabled: Boolean(extra.gad2_enabled),
          gad2_q1: (extra.gad2_q1 as number) ?? null,
          gad2_q2: (extra.gad2_q2 as number) ?? null,
          phq2_enabled: Boolean(extra.phq2_enabled),
          phq2_q1: (extra.phq2_q1 as number) ?? null,
          phq2_q2: (extra.phq2_q2 as number) ?? null,

          // Step 9 — Cancer
          screen_breast: Boolean((data as any).cancer_screening_breast),
          screen_breast_year: (extra.screen_breast_year as number) ?? null,
          screen_cervix: Boolean((data as any).cancer_screening_cervical),
          screen_cervix_year: (extra.screen_cervix_year as number) ?? null,
          screen_colorectum: Boolean((data as any).cancer_screening_colorectal),
          screen_colorectum_year: (extra.screen_colorectum_year as number) ?? null,
          screen_prostate: Boolean(extra.screen_prostate),
          screen_prostate_year: (extra.screen_prostate_year as number) ?? null,
          screen_skin: Boolean(extra.screen_skin),
          screen_skin_year: (extra.screen_skin_year as number) ?? null,
          screen_lung: Boolean(extra.screen_lung),
          screen_lung_year: (extra.screen_lung_year as number) ?? null,
          precancer_skin: Boolean((data as any).prev_precancerous),
          precancer_skin_year: (extra.precancer_skin_year as number) ?? null,
          precancer_cervix: Boolean(extra.precancer_cervix),
          precancer_cervix_year: (extra.precancer_cervix_year as number) ?? null,
          precancer_colorectum: Boolean(extra.precancer_colorectum),
          precancer_colorectum_year: (extra.precancer_colorectum_year as number) ?? null,
          sun_exposure: Boolean((data as any).sun_exposure),
          sun_protection_method: (extra.sun_protection_method as string) ?? "",
          severe_sunburns_history: Boolean(extra.severe_sunburns_history),

          // Step 10 — Status
          exam_findings: (extra.exam_findings as any) ?? blankExamFindings(),
          moles_enabled: Boolean(extra.moles_enabled),
          moles: (extra.moles as any[]) ?? [],

          current_step: ((data as any).current_step as number) ?? 1,
          completed_steps: (extra.completed_steps as number[]) ?? [],
          skipped_steps: (extra.skipped_steps as number[]) ?? [],
        });
      } else {
        setInitial(dobAge != null ? { age: dobAge } : {});
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.patientId]);

  if (!props.open) return null;
  if (loading || initial === null) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="sr-only">Loading onboarding</DialogTitle>
          <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <OnboardingFormProvider initial={initial}>
      <DialogShell {...props} />
    </OnboardingFormProvider>
  );
}

/* ---------------- Shell ---------------- */

function DialogShell({ patientId, patientName, open, onOpenChange, onCompleted }: Props) {
  const { form, set } = useOnboardingForm();
  const { user } = useAuth();
  const [saving, setSaving] = useState<"draft" | "save" | "skip" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollMemory = useRef<Record<number, number>>({});

  const today = useMemo(() => format(new Date(), "MMM d, yyyy"), []);

  // Save & restore scroll position per step
  useEffect(() => {
    const node = scrollRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
    if (!node) return;
    node.scrollTop = scrollMemory.current[form.current_step] ?? 0;
  }, [form.current_step]);

  const setStep = (next: number) => {
    const node = scrollRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
    if (node) scrollMemory.current[form.current_step] = node.scrollTop;
    set("current_step", Math.min(Math.max(next, 1), TOTAL_STEPS));
  };

  const persist = async (
    nextForm: OnboardingForm,
    options: { isComplete?: boolean } = {},
  ) => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    const bmi = calcBmi(nextForm.height_cm, nextForm.weight_kg);
    const whr = calcWaistHipRatio(nextForm.waist_circumference_cm, nextForm.hip_circumference_cm);
    const met = calcMetHours(
      nextForm.cardio_easy_hours_per_week,
      nextForm.cardio_moderate_hours_per_week,
      nextForm.cardio_vigorous_hours_per_week,
      nextForm.strength_hours_per_week,
    );
    const fiber = calcFiberFromFruitVeg(nextForm.fruits_vegetables_g_per_day);

    // Split form: dedicated columns vs extra_data JSONB
    const payload: Record<string, unknown> = {
      patient_id: patientId,
      created_by: user.id,
      age: nextForm.age,
      height_cm: nextForm.height_cm,
      weight_kg: nextForm.weight_kg,
      waist_circumference_cm: nextForm.waist_circumference_cm,
      hip_circumference_cm: nextForm.hip_circumference_cm,
      bmi,
      waist_to_hip_ratio: whr,
      occupation: nextForm.occupation || null,
      education_level: nextForm.education_level || null,
      shift_work: nextForm.shift_work,
      bp1_systolic: nextForm.bp1_systolic,
      bp1_diastolic: nextForm.bp1_diastolic,
      bp2_systolic: nextForm.bp2_systolic,
      bp2_diastolic: nextForm.bp2_diastolic,
      ecg_notes: nextForm.ecg_notes || null,

      // Step 4 — Lifestyle
      alcohol_units_per_week: nextForm.alcohol_units_per_week,

      // Step 5 — Physical Activity
      cardio_easy_hours_per_week: nextForm.cardio_easy_hours_per_week,
      cardio_moderate_hours_per_week: nextForm.cardio_moderate_hours_per_week,
      cardio_vigorous_hours_per_week: nextForm.cardio_vigorous_hours_per_week,
      strength_hours_per_week: nextForm.strength_hours_per_week,
      sedentary_hours_per_day: nextForm.sedentary_hours_per_day,
      exercise_met_hours: met,

      // Step 6 — Nutrition
      fruits_vegetables_g_per_day: nextForm.fruits_vegetables_g_per_day,
      fish_g_per_day: nextForm.fish_g_per_day,
      red_meat_g_per_day: nextForm.red_meat_g_per_day,
      sugar_g_per_day: nextForm.sugar_g_per_day,
      sodium_g_per_day: nextForm.sodium_g_per_day,
      fiber_g_per_day: fiber,

      // Step 7 — Sleep
      sleep_quality: nextForm.sleep_quality,
      sleep_hours_per_night: nextForm.sleep_total_hours,
      deep_sleep_percent: nextForm.sleep_deep_percent,
      insomnia: nextForm.insomnia,

      // Step 8 — Mental Health (dedicated columns where they exist)
      social_support_perceived: nextForm.social_support_perceived,
      stress_perceived: nextForm.stress_perceived,
      gad2_score:
        nextForm.gad2_enabled && nextForm.gad2_q1 !== null && nextForm.gad2_q2 !== null
          ? nextForm.gad2_q1 + nextForm.gad2_q2
          : null,
      phq2_score:
        nextForm.phq2_enabled && nextForm.phq2_q1 !== null && nextForm.phq2_q2 !== null
          ? nextForm.phq2_q1 + nextForm.phq2_q2
          : null,

      // Step 9 — Cancer (dedicated columns where they exist)
      cancer_screening_breast: nextForm.screen_breast,
      cancer_screening_cervical: nextForm.screen_cervix,
      cancer_screening_colorectal: nextForm.screen_colorectum,
      prev_precancerous: nextForm.precancer_skin || nextForm.precancer_cervix || nextForm.precancer_colorectum,
      sun_exposure: nextForm.sun_exposure,

      current_step: nextForm.current_step,
      draft: !options.isComplete,
      extra_data: {
        allergies: nextForm.allergies,
        supplements: nextForm.supplements,
        current_illnesses: nextForm.current_illnesses,
        previous_illnesses: nextForm.previous_illnesses,
        family_history: nextForm.family_history,

        // Lifestyle (no dedicated columns)
        smoking_current: nextForm.smoking_current,
        smoking_cigs_per_day: nextForm.smoking_cigs_per_day,
        smoking_years: nextForm.smoking_years,
        smoking_previous: nextForm.smoking_previous,
        smoking_previous_years: nextForm.smoking_previous_years,
        alcohol_current: nextForm.alcohol_current,
        caffeine_current: nextForm.caffeine_current,
        caffeine_cups_per_day: nextForm.caffeine_cups_per_day,
        caffeine_last_cup_time: nextForm.caffeine_last_cup_time,
        nicotine_pouches_current: nextForm.nicotine_pouches_current,
        nicotine_pouches_per_day: nextForm.nicotine_pouches_per_day,
        nicotine_pouches_strength: nextForm.nicotine_pouches_strength,
        drugs_current: nextForm.drugs_current,
        drugs_notes: nextForm.drugs_notes,

        // Nutrition extras
        diet_type: nextForm.diet_type,
        water_litres_per_day: nextForm.water_litres_per_day,

        // Sleep extras
        sleep_bedtime: nextForm.sleep_bedtime,
        sleep_waking_time: nextForm.sleep_waking_time,
        sleep_latency_mins: nextForm.sleep_latency_mins,
        sleep_efficiency_percent: nextForm.sleep_efficiency_percent,
        daytime_fatigue: nextForm.daytime_fatigue,
        restless_legs: nextForm.restless_legs,
        sleep_apnea: nextForm.sleep_apnea,
        sleep_apnea_type: nextForm.sleep_apnea_type,
        sleep_apnea_severity: nextForm.sleep_apnea_severity,

        // Mental Health extras
        recovery_perceived: nextForm.recovery_perceived,
        workload_perceived: nextForm.workload_perceived,
        gad2_enabled: nextForm.gad2_enabled,
        gad2_q1: nextForm.gad2_q1,
        gad2_q2: nextForm.gad2_q2,
        phq2_enabled: nextForm.phq2_enabled,
        phq2_q1: nextForm.phq2_q1,
        phq2_q2: nextForm.phq2_q2,

        // Cancer extras (year per screening + non-column toggles)
        screen_breast_year: nextForm.screen_breast_year,
        screen_cervix_year: nextForm.screen_cervix_year,
        screen_colorectum_year: nextForm.screen_colorectum_year,
        screen_prostate: nextForm.screen_prostate,
        screen_prostate_year: nextForm.screen_prostate_year,
        screen_skin: nextForm.screen_skin,
        screen_skin_year: nextForm.screen_skin_year,
        screen_lung: nextForm.screen_lung,
        screen_lung_year: nextForm.screen_lung_year,
        precancer_skin: nextForm.precancer_skin,
        precancer_skin_year: nextForm.precancer_skin_year,
        precancer_cervix: nextForm.precancer_cervix,
        precancer_cervix_year: nextForm.precancer_cervix_year,
        precancer_colorectum: nextForm.precancer_colorectum,
        precancer_colorectum_year: nextForm.precancer_colorectum_year,
        sun_protection_method: nextForm.sun_protection_method,
        severe_sunburns_history: nextForm.severe_sunburns_history,

        // Status
        exam_findings: nextForm.exam_findings,
        moles_enabled: nextForm.moles_enabled,
        moles: nextForm.moles,

        completed_steps: nextForm.completed_steps,
        skipped_steps: nextForm.skipped_steps,
      },
    };

    // Upsert by patient_id
    const { data: existing } = await supabase
      .from("patient_onboarding")
      .select("id")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("patient_onboarding")
        .update(payload as any)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("patient_onboarding")
        .insert(payload as any);
      if (error) throw error;
    }

    // Sync patient onboarding lifecycle status
    const newStatus = options.isComplete ? "complete" : "in_progress";
    await supabase
      .from("patients")
      .update({ onboarding_status: newStatus } as any)
      .eq("id", patientId);

    // Sync allergies to patient_allergies (tag + replace).
    // Idempotent: rows tagged with notes='from_onboarding' are replaced each save.
    try {
      await supabase
        .from("patient_allergies")
        .delete()
        .eq("patient_id", patientId)
        .eq("notes", "from_onboarding");
      if (nextForm.allergies.length > 0) {
        await supabase.from("patient_allergies").insert(
          nextForm.allergies.map((a) => ({
            patient_id: patientId,
            created_by: user.id,
            allergen: a.name,
            icd_code: a.icd_code ?? null,
            severity: a.severity ?? "moderate",
            status: "active",
            notes: "from_onboarding",
          })) as any,
        );
      }
    } catch (e) {
      // Non-fatal: onboarding save already succeeded
      console.warn("Allergy sync failed", e);
    }

    // On completion, auto-create a review task (skip silently if it fails)
    if (options.isComplete) {
      const due = new Date();
      due.setDate(due.getDate() + 3);
      await supabase.from("tasks").insert({
        title: `Review onboarding data — ${patientName}`,
        description: "Auto-generated after the patient completed onboarding.",
        patient_id: patientId,
        created_by: user.id,
        assigned_to: user.id,
        category: "clinical_review",
        priority: "medium",
        status: "todo",
        due_date: due.toISOString().slice(0, 10),
        created_from: "onboarding",
      } as any);

      // Auto-create an "Initial Consultation / Onboarding" visit record (idempotent).
      try {
        const { data: existingVisit } = await supabase
          .from("visit_notes")
          .select("id")
          .eq("patient_id", patientId)
          .eq("chief_complaint", "Initial Consultation / Onboarding")
          .maybeSingle();
        if (!existingVisit?.id) {
          await supabase.from("visit_notes").insert({
            patient_id: patientId,
            provider_id: user.id,
            visit_date: new Date().toISOString().slice(0, 10),
            chief_complaint: "Initial Consultation / Onboarding",
            notes: null,
            vitals: {
              visit_type: "onboarding",
              attending_doctor: "Dr. Laine",
              status: "completed",
              source: "auto_from_onboarding",
            },
          } as any);
        }
      } catch (e) {
        console.warn("Auto-create onboarding visit failed", e);
      }
    }
  };

  const handleSaveDraft = async () => {
    setSaving("draft");
    try {
      await persist(form);
      toast.success("Draft saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save draft");
    } finally {
      setSaving(null);
    }
  };

  const handleSkip = () => {
    const skipped = Array.from(new Set([...form.skipped_steps, form.current_step]));
    set("skipped_steps", skipped);
    if (form.current_step < TOTAL_STEPS) setStep(form.current_step + 1);
  };

  const handleSave = async () => {
    setSaving("save");
    try {
      const completed = Array.from(new Set([...form.completed_steps, form.current_step]));
      const isLast = form.current_step === TOTAL_STEPS;
      const nextStep = isLast ? form.current_step : form.current_step + 1;
      const nextForm: OnboardingForm = {
        ...form,
        completed_steps: completed,
        current_step: nextStep,
      };
      await persist(nextForm, { isComplete: isLast });
      // Reflect locally
      set("completed_steps", completed);
      if (!isLast) setStep(nextStep);
      toast.success(isLast ? "Onboarding complete" : "Step saved");
      if (isLast) {
        onOpenChange(false);
        onCompleted?.();
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] p-0 rounded-xl flex flex-col gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {patientName}: Onboarding
          </DialogTitle>
          <div className="flex items-center gap-3 pr-8">
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>
        </div>

        {/* Step pills */}
        <div className="px-6 py-3 border-b overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === form.current_step;
              const isCompleted = form.completed_steps.includes(stepNum);
              const isSkipped = form.skipped_steps.includes(stepNum);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(stepNum)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : isCompleted
                      ? "bg-muted text-foreground border-transparent"
                      : isSkipped
                      ? "bg-background text-muted-foreground border-dashed border-border"
                      : "bg-background text-muted-foreground/70 border-border hover:border-primary/40",
                  )}
                >
                  {isCompleted && !isActive && <span aria-hidden>✓</span>}
                  <span>
                    {stepNum}. {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="px-6 py-6">
            <StepRenderer step={form.current_step} />
          </div>
        </ScrollArea>

        {/* Action bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-card/40">
          <div className="text-xs text-muted-foreground">
            Step {form.current_step} of {TOTAL_STEPS}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleSaveDraft} disabled={saving !== null}>
              {saving === "draft" ? "Saving…" : "Save as Draft"}
            </Button>
            <Button variant="ghost" onClick={handleSkip} disabled={saving !== null}>
              Skip
            </Button>
            <Button onClick={handleSave} disabled={saving !== null}>
              {saving === "save"
                ? "Saving…"
                : form.current_step === TOTAL_STEPS
                ? "Finish"
                : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepRenderer({ step }: { step: number }) {
  switch (step) {
    case 1:
      return <StepBasicInfo />;
    case 2:
      return <StepIllnesses />;
    case 3:
      return <StepFamilyHistory />;
    case 4:
      return <StepLifestyle />;
    case 5:
      return <StepActivity />;
    case 6:
      return <StepNutrition />;
    case 7:
      return <StepSleep />;
    case 8:
      return <StepMentalHealth />;
    case 9:
      return <StepCancer />;
    case 10:
      return <StepStatus />;
    default:
      return null;
  }
}

// `blankOnboardingForm` is re-exported so consumers can reuse the shape if needed.
export { blankOnboardingForm };
