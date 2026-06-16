import { useOnboardingForm } from "./OnboardingFormContext";
import { SectionHeading } from "./shared";
import { MolesPanel } from "@/components/patients/panels/MolesPanel";

/** Step 11 — Moles. Thin wrapper around the shared MolesPanel. */
export function StepMoles() {
  const { form, set } = useOnboardingForm();
  return (
    <div className="space-y-4">
      <SectionHeading>Moles</SectionHeading>
      <MolesPanel moles={form.moles} onChange={(next) => set("moles", next)} />
    </div>
  );
}
