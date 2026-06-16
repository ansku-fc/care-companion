import { useOnboardingForm } from "./OnboardingFormContext";
import { MentalHealthPanel, type MentalHealthData } from "../panels/MentalHealthPanel";

/** Step 8 — Mental Health. Thin wrapper around MentalHealthPanel. */
export function StepMentalHealth() {
  const { form, patch } = useOnboardingForm();
  const value: MentalHealthData = {
    stress_perceived: form.stress_perceived,
    workload_perceived: form.workload_perceived,
    recovery_perceived: form.recovery_perceived,
    social_support_perceived: form.social_support_perceived,
    gad2_enabled: form.gad2_enabled,
    gad2_q1: form.gad2_q1,
    gad2_q2: form.gad2_q2,
    phq2_enabled: form.phq2_enabled,
    phq2_q1: form.phq2_q1,
    phq2_q2: form.phq2_q2,
  };
  return <MentalHealthPanel value={value} onChange={(u) => patch(u)} />;
}
