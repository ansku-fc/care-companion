import { useOnboardingForm, calcMetHours } from "./OnboardingFormContext";
import { CalculatedField, FieldLabel, NumberInput, SectionHeading } from "./shared";

/** Step 5 — Physical Activity. */
export function StepActivity() {
  const { form, set } = useOnboardingForm();
  const met = calcMetHours(
    form.cardio_easy_hours_per_week,
    form.cardio_moderate_hours_per_week,
    form.cardio_vigorous_hours_per_week,
    form.strength_hours_per_week,
  );

  return (
    <div className="space-y-6">
      <SectionHeading>Physical Activity</SectionHeading>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Cardiovascular — Easy (hrs/week)</FieldLabel>
          <NumberInput
            value={form.cardio_easy_hours_per_week}
            onChange={(v) => set("cardio_easy_hours_per_week", v)}
            min={0}
            step={0.5}
          />
        </div>
        <div>
          <FieldLabel>Cardiovascular — Moderate (hrs/week)</FieldLabel>
          <NumberInput
            value={form.cardio_moderate_hours_per_week}
            onChange={(v) => set("cardio_moderate_hours_per_week", v)}
            min={0}
            step={0.5}
          />
        </div>
        <div>
          <FieldLabel>Cardiovascular — Vigorous (hrs/week)</FieldLabel>
          <NumberInput
            value={form.cardio_vigorous_hours_per_week}
            onChange={(v) => set("cardio_vigorous_hours_per_week", v)}
            min={0}
            step={0.5}
          />
        </div>
        <div>
          <FieldLabel>Strength training (hrs/week)</FieldLabel>
          <NumberInput
            value={form.strength_hours_per_week}
            onChange={(v) => set("strength_hours_per_week", v)}
            min={0}
            step={0.5}
          />
        </div>
        <div>
          <FieldLabel>Sedentary hours / day</FieldLabel>
          <NumberInput
            value={form.sedentary_hours_per_day}
            onChange={(v) => set("sedentary_hours_per_day", v)}
            min={0}
            max={24}
            step={0.5}
          />
        </div>
        <CalculatedField
          label="MET hours / week"
          sublabel="calculated"
          value={met !== null ? met.toFixed(1) : "—"}
        />
      </div>
    </div>
  );
}
