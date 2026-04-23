import { useState } from "react";
import { cn } from "@/lib/utils";
import { HealthDataView } from "./HealthDataView";
import { DiagnosesView } from "./DiagnosesView";
import type { Tables } from "@/integrations/supabase/types";

type Tab = "dimensions" | "labs" | "diagnoses";

interface Props {
  patientId: string;
  labResults: Tables<"patient_lab_results">[];
  onLabResultsAdded: () => void;
  onSelectDimension: (key: string) => void;
  markerNotes: Record<string, string>;
  setMarkerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  // The lab table currently lives inside PatientProfilePage (LabResultsView).
  // We render it via the existing route key by exposing a switcher node.
  labResultsSlot: React.ReactNode;
  initialTab?: Tab;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "dimensions", label: "Dimensions" },
  { key: "labs", label: "Laboratory Results" },
  { key: "diagnoses", label: "Diagnoses" },
];

export function HealthDataHub({
  onSelectDimension,
  labResultsSlot,
  initialTab = "dimensions",
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page title + pill tabs */}
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

      {/* Tab body */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "dimensions" && (
          <div className="[&>div>div:first-child]:hidden">
            <HealthDataView onSelectDimension={onSelectDimension} />
          </div>
        )}
        {tab === "labs" && labResultsSlot}
        {tab === "diagnoses" && <DiagnosesView onSelectDimension={onSelectDimension} />}
      </div>
    </div>
  );
}
