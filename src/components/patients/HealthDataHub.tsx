import { useState } from "react";
import { cn } from "@/lib/utils";
import { HealthDataView } from "./HealthDataView";
import { DiagnosesView } from "./DiagnosesView";
import { OnboardingEmptyState } from "./OnboardingEmptyState";
import type { Tables } from "@/integrations/supabase/types";

type Tab = "dimensions" | "labs" | "diagnoses";

interface Props {
  patientId: string;
  patientName?: string;
  patientStatus?: string | null;
  labResults: Tables<"patient_lab_results">[];
  onboarding: Tables<"patient_onboarding"> | null;
  healthCategories: Tables<"patient_health_categories">[];
  onLabResultsAdded: () => void;
  onSelectDimension: (key: string) => void;
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  labResultsSlot: React.ReactNode;
  initialTab?: Tab;
  onOnboardingCompleted?: () => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "dimensions", label: "Dimensions" },
  { key: "labs", label: "Laboratory Results" },
  { key: "diagnoses", label: "Diagnoses" },
];

export function HealthDataHub({
  patientId,
  patientName,
  patientStatus,
  labResults,
  onboarding,
  healthCategories,
  onSelectDimension,
  labResultsSlot,
  initialTab = "dimensions",
  onOnboardingCompleted,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // A patient is not yet onboarded when status is pending and no onboarding row exists.
  // Show the empty state until the doctor finishes the final onboarding step.
  // Drafts (status 'pending' or 'in_progress') must not surface clinical data.
  const notOnboarded = patientStatus !== "complete";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-1 pt-1 pb-3 space-y-3 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Health Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dimensions, laboratory results, and diagnoses
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "dimensions" && (
          notOnboarded ? (
            <OnboardingEmptyState
              patientName={patientName || ""}
              patientId={patientId}
              onCompleted={onOnboardingCompleted}
            />
          ) : (
            <div className="[&>div>div:first-child]:hidden">
              <HealthDataView
                patientId={patientId}
                onboarding={onboarding}
                labResults={labResults}
                healthCategories={healthCategories}
                onSelectDimension={onSelectDimension}
              />
            </div>
          )
        )}
        {tab === "labs" && (
          notOnboarded ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No lab results yet.</p>
          ) : (
            labResultsSlot
          )
        )}
        {tab === "diagnoses" && (
          notOnboarded ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No diagnoses recorded.</p>
          ) : (
            <DiagnosesView
              patientId={patientId}
              patientName={patientName}
              onSelectDimension={onSelectDimension}
            />
          )
        )}
      </div>
    </div>
  );
}

