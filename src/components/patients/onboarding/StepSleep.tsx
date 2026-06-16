import { Input } from "@/components/ui/input";
import { useOnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";
import { SleepPanel, type SleepData } from "../panels/SleepPanel";

/** Step 7 — Sleep. Wraps SleepPanel and adds onboarding-only fields. */
export function StepSleep() {
  const { form, patch, set } = useOnboardingForm();
  const value: SleepData = {
    sleep_quality: form.sleep_quality,
    daytime_fatigue: form.daytime_fatigue,
    sleep_total_hours: form.sleep_total_hours,
    sleep_latency_mins: form.sleep_latency_mins,
    insomnia: form.insomnia,
    restless_legs: form.restless_legs,
    sleep_apnea: form.sleep_apnea,
    sleep_apnea_type: form.sleep_apnea_type,
    sleep_apnea_severity: form.sleep_apnea_severity,
  };

  return (
    <div className="space-y-8">
      <SleepPanel value={value} onChange={(u) => patch(u)} />

      <div>
        <SectionHeading>Additional Sleep Detail</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Bedtime, avg</FieldLabel>
            <Input type="time" value={form.sleep_bedtime} onChange={(e) => set("sleep_bedtime", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Waking time, avg</FieldLabel>
            <Input type="time" value={form.sleep_waking_time} onChange={(e) => set("sleep_waking_time", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Deep sleep (avg %)</FieldLabel>
            <NumberInput value={form.sleep_deep_percent} onChange={(v) => set("sleep_deep_percent", v)} min={0} max={100} />
          </div>
          <div>
            <FieldLabel>Sleep efficiency (%)</FieldLabel>
            <NumberInput value={form.sleep_efficiency_percent} onChange={(v) => set("sleep_efficiency_percent", v)} min={0} max={100} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          These fields can later be populated from Oura or wearables export.
        </p>
      </div>
    </div>
  );
}
