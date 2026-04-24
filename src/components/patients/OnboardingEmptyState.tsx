import { useState } from "react";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingDialog } from "./OnboardingDialog";

type OnboardingEmptyStateProps = {
  patientName: string;
  patientId: string;
};

/**
 * Shown on the patient overview when onboarding has not yet been completed.
 * Replaces the clinical dashboard with a single centred call-to-action that
 * launches the onboarding flow.
 */
export function OnboardingEmptyState({ patientName, patientId }: OnboardingEmptyStateProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-muted/20 px-8 py-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
          <ClipboardList className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No onboarding data yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete onboarding for {patientName.split(",")[1]?.trim() || patientName} to populate
          their clinical dashboard.
        </p>
        <Button className="mt-6 gap-2" onClick={() => setOpen(true)}>
          Start Onboarding
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/*
        Onboarding wizard. Currently uses the legacy multi-step component as a
        placeholder while the redesigned 10-step flow is being built in the next
        rounds. The placeholder still creates onboarding/lab/medication records
        for the existing patient.
      */}
      <OnboardingDialog patientId={patientId} open={open} onOpenChange={setOpen} />
    </div>
  );
}
