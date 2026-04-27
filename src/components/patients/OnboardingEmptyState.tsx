import { useEffect, useState } from "react";
import { ClipboardList, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { PatientOnboardingDialog } from "./onboarding/PatientOnboardingDialog";

type OnboardingEmptyStateProps = {
  patientName: string;
  patientId: string;
  onCompleted?: () => void;
};

const TOTAL_STEPS = 10;

/**
 * Shown on the patient overview when onboarding has not yet been completed.
 *
 * Two states:
 *   - No draft exists  → "Start Onboarding"
 *   - Draft in progress → "Continue Onboarding" + "Step N of 10 completed"
 *
 * Clicking the button opens the dialog, which already loads the saved draft
 * and resumes at `current_step`.
 */
export function OnboardingEmptyState({ patientName, patientId, onCompleted }: OnboardingEmptyStateProps) {
  const [open, setOpen] = useState(false);
  const [draftStep, setDraftStep] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("patient_onboarding")
      .select("current_step, extra_data")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (data) {
      setDraftStep((data as any).current_step ?? 1);
      const extra = ((data as any).extra_data ?? {}) as Record<string, unknown>;
      const completed = Array.isArray((extra as any).completed_steps)
        ? ((extra as any).completed_steps as number[]).length
        : 0;
      setCompletedCount(completed);
    } else {
      setDraftStep(null);
      setCompletedCount(0);
    }
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const firstName = patientName.includes(",")
    ? patientName.split(",")[1]?.trim() || patientName
    : patientName.split(/\s+/)[0];

  const hasDraft = draftStep !== null;

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-muted/20 px-8 py-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
          <ClipboardList className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {hasDraft ? "Onboarding in progress" : "No onboarding data yet"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasDraft
            ? `Continue where you left off to complete ${firstName}'s clinical baseline.`
            : `Complete onboarding for ${firstName} to populate their clinical dashboard.`}
        </p>
        {hasDraft && (
          <p className="mt-2 text-xs text-muted-foreground">
            Step {completedCount} of {TOTAL_STEPS} completed
          </p>
        )}
        <Button className="mt-6 gap-2" onClick={() => setOpen(true)} disabled={!loaded}>
          {hasDraft ? "Continue Onboarding" : "Start Onboarding"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <PatientOnboardingDialog
        patientId={patientId}
        patientName={patientName}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // When the dialog closes, refresh draft state so the button reflects
          // any saved-as-draft progress.
          if (!next) refresh();
        }}
        onCompleted={onCompleted}
      />
    </div>
  );
}
