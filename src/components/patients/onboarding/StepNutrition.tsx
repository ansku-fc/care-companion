import { useOnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";
import { NutritionPanel, type NutritionData } from "../panels/NutritionPanel";

/** Step 6 — Nutrition. Wraps NutritionPanel and adds onboarding-only fields. */
export function StepNutrition() {
  const { form, patch, set } = useOnboardingForm();
  const value: NutritionData = {
    diet_type: form.diet_type,
    water_litres_per_day: form.water_litres_per_day,
    fruits_vegetables_g_per_day: form.fruits_vegetables_g_per_day,
  };

  return (
    <div className="space-y-8">
      <NutritionPanel value={value} onChange={(u) => patch(u)} />

      <div>
        <SectionHeading>Macros & Sodium</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Fish (g/day)</FieldLabel>
            <NumberInput value={form.fish_g_per_day} onChange={(v) => set("fish_g_per_day", v)} min={0} />
          </div>
          <div>
            <FieldLabel>Red meat (g/day)</FieldLabel>
            <NumberInput value={form.red_meat_g_per_day} onChange={(v) => set("red_meat_g_per_day", v)} min={0} />
          </div>
          <div>
            <FieldLabel>Sugar (g/day)</FieldLabel>
            <NumberInput value={form.sugar_g_per_day} onChange={(v) => set("sugar_g_per_day", v)} min={0} />
          </div>
          <div>
            <FieldLabel>Salt (g/day)</FieldLabel>
            <NumberInput value={form.sodium_g_per_day} onChange={(v) => set("sodium_g_per_day", v)} min={0} step={0.1} />
          </div>
        </div>
      </div>
    </div>
  );
}
