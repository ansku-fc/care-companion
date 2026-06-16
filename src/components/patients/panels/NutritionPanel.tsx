import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalculatedField, FieldLabel, NumberInput, SectionHeading } from "../onboarding/shared";
import { calcFiberFromFruitVeg } from "../onboarding/OnboardingFormContext";

const DIET_TYPES = ["Gluten-free", "Mixed", "No red meat", "Pescatarian", "Vegetarian", "Vegan", "Other"];

export type NutritionData = {
  diet_type: string;
  water_litres_per_day: number | null;
  fruits_vegetables_g_per_day: number | null;
};

export const defaultNutritionData: NutritionData = {
  diet_type: "",
  water_litres_per_day: null,
  fruits_vegetables_g_per_day: null,
};

export function NutritionPanel({
  value, onChange,
}: { value: NutritionData; onChange: (updates: Partial<NutritionData>) => void }) {
  const fiber = calcFiberFromFruitVeg(value.fruits_vegetables_g_per_day);

  return (
    <div className="space-y-4">
      <SectionHeading>Nutrition</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Diet</FieldLabel>
          <Select value={value.diet_type} onValueChange={(v) => onChange({ diet_type: v })}>
            <SelectTrigger><SelectValue placeholder="Select diet" /></SelectTrigger>
            <SelectContent>
              {DIET_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Water (litres/day)</FieldLabel>
          <NumberInput value={value.water_litres_per_day} onChange={(v) => onChange({ water_litres_per_day: v })} min={0} step={0.1} />
        </div>
        <div>
          <FieldLabel>Fruit & vegetables (g/day)</FieldLabel>
          <NumberInput value={value.fruits_vegetables_g_per_day} onChange={(v) => onChange({ fruits_vegetables_g_per_day: v })} min={0} />
        </div>
        <CalculatedField label="Fiber (g/day)" sublabel="estimated" value={fiber !== null ? fiber.toFixed(1) : "—"} />
      </div>
    </div>
  );
}
