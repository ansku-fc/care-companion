import { useOnboardingForm } from "./OnboardingFormContext";
import { ActivityPanel, type ActivityData } from "../panels/ActivityPanel";

/** Step 5 — Physical Activity. Thin wrapper around ActivityPanel. */
export function StepActivity() {
  const { form, patch } = useOnboardingForm();
  const value: ActivityData = {
    cardio_easy_hours_per_week: form.cardio_easy_hours_per_week,
    cardio_moderate_hours_per_week: form.cardio_moderate_hours_per_week,
    cardio_vigorous_hours_per_week: form.cardio_vigorous_hours_per_week,
    strength_hours_per_week: form.strength_hours_per_week,
    sedentary_hours_per_day: form.sedentary_hours_per_day,
  };
  return <ActivityPanel value={value} onChange={(u) => patch(u)} />;
}
