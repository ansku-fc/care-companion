import { CalculatedField, FieldLabel, NumberInput, SectionHeading } from "../onboarding/shared";
import { calcMetHours } from "../onboarding/OnboardingFormContext";

export type ActivityData = {
  cardio_easy_hours_per_week: number | null;
  cardio_moderate_hours_per_week: number | null;
  cardio_vigorous_hours_per_week: number | null;
  strength_hours_per_week: number | null;
  sedentary_hours_per_day: number | null;
};

export const defaultActivityData: ActivityData = {
  cardio_easy_hours_per_week: null,
  cardio_moderate_hours_per_week: null,
  cardio_vigorous_hours_per_week: null,
  strength_hours_per_week: null,
  sedentary_hours_per_day: null,
};

export function ActivityPanel({
  value, onChange,
}: { value: ActivityData; onChange: (updates: Partial<ActivityData>) => void }) {
  const met = calcMetHours(
    value.cardio_easy_hours_per_week,
    value.cardio_moderate_hours_per_week,
    value.cardio_vigorous_hours_per_week,
    value.strength_hours_per_week,
  );

  return (
    <div className="space-y-4">
      <SectionHeading>Physical Activity</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Cardio — Easy (hrs/week)</FieldLabel>
          <NumberInput value={value.cardio_easy_hours_per_week} onChange={(v) => onChange({ cardio_easy_hours_per_week: v })} min={0} step={0.5} />
        </div>
        <div>
          <FieldLabel>Cardio — Moderate (hrs/week)</FieldLabel>
          <NumberInput value={value.cardio_moderate_hours_per_week} onChange={(v) => onChange({ cardio_moderate_hours_per_week: v })} min={0} step={0.5} />
        </div>
        <div>
          <FieldLabel>Cardio — Vigorous (hrs/week)</FieldLabel>
          <NumberInput value={value.cardio_vigorous_hours_per_week} onChange={(v) => onChange({ cardio_vigorous_hours_per_week: v })} min={0} step={0.5} />
        </div>
        <div>
          <FieldLabel>Strength training (hrs/week)</FieldLabel>
          <NumberInput value={value.strength_hours_per_week} onChange={(v) => onChange({ strength_hours_per_week: v })} min={0} step={0.5} />
        </div>
        <div>
          <FieldLabel>Sedentary hours / day</FieldLabel>
          <NumberInput value={value.sedentary_hours_per_day} onChange={(v) => onChange({ sedentary_hours_per_day: v })} min={0} max={24} step={0.5} />
        </div>
        <CalculatedField label="MET hours / week" sublabel="calculated" value={met !== null ? met.toFixed(1) : "—"} />
      </div>
    </div>
  );
}
