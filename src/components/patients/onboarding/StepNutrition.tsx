import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useOnboardingForm, calcFiberFromFruitVeg } from "./OnboardingFormContext";
import { CalculatedField, FieldLabel, NumberInput, SectionHeading } from "./shared";

const DIET_TYPES = [
  "Gluten-free",
  "Mixed",
  "No red meat",
  "Pescatarian",
  "Vegetarian",
  "Vegan",
  "Other",
];

/** Step 6 — Nutrition. */
export function StepNutrition() {
  const { form, set } = useOnboardingForm();
  const fiber = calcFiberFromFruitVeg(form.fruits_vegetables_g_per_day);

  return (
    <div className="space-y-6">
      <SectionHeading>Nutrition</SectionHeading>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Diet</FieldLabel>
          <Select value={form.diet_type} onValueChange={(v) => set("diet_type", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select diet" />
            </SelectTrigger>
            <SelectContent>
              {DIET_TYPES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Water (litres/day)</FieldLabel>
          <NumberInput
            value={form.water_litres_per_day}
            onChange={(v) => set("water_litres_per_day", v)}
            min={0}
            step={0.1}
          />
        </div>
        <div>
          <FieldLabel>Fruit & vegetables (g/day)</FieldLabel>
          <NumberInput
            value={form.fruits_vegetables_g_per_day}
            onChange={(v) => set("fruits_vegetables_g_per_day", v)}
            min={0}
          />
        </div>
        <CalculatedField
          label="Fiber (g/day)"
          sublabel="estimated"
          value={fiber !== null ? fiber.toFixed(1) : "—"}
        />
        <div>
          <FieldLabel>Fish (g/day)</FieldLabel>
          <NumberInput
            value={form.fish_g_per_day}
            onChange={(v) => set("fish_g_per_day", v)}
            min={0}
          />
        </div>
        <div>
          <FieldLabel>Red meat (g/day)</FieldLabel>
          <NumberInput
            value={form.red_meat_g_per_day}
            onChange={(v) => set("red_meat_g_per_day", v)}
            min={0}
          />
        </div>
        <div>
          <FieldLabel>Sugar (g/day)</FieldLabel>
          <NumberInput
            value={form.sugar_g_per_day}
            onChange={(v) => set("sugar_g_per_day", v)}
            min={0}
          />
        </div>
        <div>
          <FieldLabel>Salt (g/day)</FieldLabel>
          <NumberInput
            value={form.sodium_g_per_day}
            onChange={(v) => set("sodium_g_per_day", v)}
            min={0}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );
}
