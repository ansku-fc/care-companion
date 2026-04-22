import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, Plus, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock medication data — keep aligned with PatientMedicationsView ──
// In a future iteration these should be lifted to a shared store / fetched.
type DimMed = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  dimension: string;
  remainingPills: number;
  totalPills: number;
  renewalDate?: string;
  status: "active" | "past";
  startDate?: string;
  endDate?: string;
  discontinuationReason?: string;
  discontinuedBy?: string;
  hadInteractionAlertAtDiscontinuation?: { drugs: [string, string]; severity: "severe" | "moderate" | "mild"; description: string };
};

const SEED_MEDS: DimMed[] = [
  { id: "m1", name: "Atorvastatin", dose: "20 mg", frequency: "Once daily (evening)", dimension: "Cardiovascular Health", remainingPills: 18, totalPills: 90, renewalDate: "2026-05-08", status: "active", startDate: "2024-02-10" },
  { id: "m2", name: "Lisinopril", dose: "10 mg", frequency: "Once daily (morning)", dimension: "Cardiovascular Health", remainingPills: 42, totalPills: 90, renewalDate: "2026-06-02", status: "active", startDate: "2023-07-08" },
  { id: "m3", name: "Metformin", dose: "500 mg", frequency: "Twice daily with meals", dimension: "Metabolic Health", remainingPills: 6, totalPills: 180, renewalDate: "2026-04-29", status: "active" },
  { id: "m4", name: "Levothyroxine", dose: "75 mcg", frequency: "Once daily (fasting)", dimension: "Metabolic Health", remainingPills: 60, totalPills: 100, renewalDate: "2026-07-14", status: "active" },
  { id: "m5", name: "Sertraline", dose: "50 mg", frequency: "Once daily", dimension: "Brain & Mental Health", remainingPills: 24, totalPills: 60, renewalDate: "2026-05-20", status: "active" },
  { id: "m6", name: "Warfarin", dose: "3 mg", frequency: "Once daily", dimension: "Cardiovascular Health", remainingPills: 30, totalPills: 90, renewalDate: "2026-06-15", status: "active" },
  { id: "m7", name: "Ibuprofen", dose: "400 mg", frequency: "Up to 3x daily as needed", dimension: "Exercise & Functional Health", remainingPills: 12, totalPills: 60, renewalDate: "2026-05-15", status: "active" },
  // ── Past medications (dummy) ──
  {
    id: "m-past-1",
    name: "Aspirin",
    dose: "100 mg",
    frequency: "Once daily",
    dimension: "Cardiovascular Health",
    remainingPills: 0,
    totalPills: 90,
    status: "past",
    startDate: "2022-01-15",
    endDate: "2023-11-20",
    discontinuationReason: "Replaced by Atorvastatin",
    discontinuedBy: "Dr. Laine",
    hadInteractionAlertAtDiscontinuation: {
      drugs: ["Aspirin", "Warfarin"],
      severity: "moderate",
      description: "Combined antiplatelet + anticoagulant — bleeding risk monitored throughout treatment.",
    },
  },
];

type DimInteraction = {
  drugs: [string, string];
  severity: "severe" | "moderate" | "mild";
  description: string;
};

const SEED_INTERACTIONS: DimInteraction[] = [
  { drugs: ["Warfarin", "Ibuprofen"], severity: "severe", description: "NSAIDs significantly increase bleeding risk when combined with anticoagulants." },
  { drugs: ["Warfarin", "Sertraline"], severity: "moderate", description: "SSRIs may potentiate anticoagulant effect — monitor INR closely." },
  { drugs: ["Lisinopril", "Ibuprofen"], severity: "moderate", description: "NSAIDs reduce ACE inhibitor efficacy and raise renal injury risk." },
  { drugs: ["Atorvastatin", "Warfarin"], severity: "mild", description: "May modestly increase INR — periodic monitoring advised." },
];

// Map dimension key (from healthDimensions) → human dimension label used on meds
const DIMENSION_LABEL_MAP: Record<string, string[]> = {
  cardiovascular: ["Cardiovascular Health"],
  metabolic: ["Metabolic Health"],
  endocrine: ["Metabolic Health"],
  kidneys: ["Metabolic Health"],
  body_composition: ["Metabolic Health"],
  nutrition: ["Metabolic Health"],
  metabolism: ["Metabolic Health"],
  brain_mental: ["Brain & Mental Health"],
  brain: ["Brain & Mental Health"],
  mental_health: ["Brain & Mental Health"],
  exercise: ["Exercise & Functional Health"],
  exercise_functional: ["Exercise & Functional Health"],
  musculoskeletal: ["Exercise & Functional Health"],
  respiratory: ["Respiratory & Immune Health"],
  immune: ["Respiratory & Immune Health"],
  respiratory_immune: ["Respiratory & Immune Health"],
  digestion: ["Digestion & Liver Health"],
  liver: ["Digestion & Liver Health"],
  digestion_liver: ["Digestion & Liver Health"],
};

const SEVERITY_BORDER: Record<DimInteraction["severity"], string> = {
  severe: "border-l-4 border-destructive bg-destructive/5",
  moderate: "border-l-4 border-amber-500 bg-amber-500/5",
  mild: "border-l-4 border-muted-foreground/40 bg-muted/40",
};

const SEVERITY_BADGE: Record<DimInteraction["severity"], string> = {
  severe: "bg-destructive text-destructive-foreground",
  moderate: "bg-amber-500 text-white",
  mild: "bg-muted text-foreground",
};

interface Props {
  /** dimension key from healthDimensions — used to look up matching dimension labels */
  dimensionKey: string;
  /** human-readable dimension label for the section header / add-flow pre-fill */
  dimensionLabel: string;
  /** navigates to the medications tab in the patient profile */
  onNavigateToMedications: () => void;
}

export function DimensionMedicationsSection({ dimensionKey, dimensionLabel, onNavigateToMedications }: Props) {
  const matchingLabels = DIMENSION_LABEL_MAP[dimensionKey] ?? [dimensionLabel];

  const meds = useMemo(
    () => SEED_MEDS.filter((m) => m.status === "active" && matchingLabels.includes(m.dimension)),
    [matchingLabels],
  );

  const medNames = useMemo(() => new Set(meds.map((m) => m.name)), [meds]);

  // Surface SEVERE / MODERATE alerts that involve at least one med in this dimension
  const alerts = useMemo(
    () =>
      SEED_INTERACTIONS.filter(
        (i) =>
          (i.severity === "severe" || i.severity === "moderate") &&
          (medNames.has(i.drugs[0]) || medNames.has(i.drugs[1])),
      ),
    [medNames],
  );

  // Map medication name → involved interaction severities for inline pill on card
  const medAlertSeverity: Record<string, DimInteraction["severity"]> = {};
  for (const a of alerts) {
    for (const d of a.drugs) {
      if (medNames.has(d)) {
        const prev = medAlertSeverity[d];
        if (!prev || (prev === "moderate" && a.severity === "severe")) {
          medAlertSeverity[d] = a.severity;
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-4 w-4 text-primary" />
          Medications
          <span className="text-xs font-normal text-muted-foreground">— {dimensionLabel}</span>
        </CardTitle>
        <Button size="sm" variant="outline" className="gap-1" onClick={onNavigateToMedications}>
          <Plus className="h-4 w-4" /> Add Medication
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Interaction alerts (severe / moderate only) */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, idx) => (
              <button
                key={idx}
                onClick={onNavigateToMedications}
                className={cn(
                  "w-full text-left rounded-md p-3 transition-colors hover:brightness-95",
                  SEVERITY_BORDER[a.severity],
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      a.severity === "severe" ? "text-destructive" : "text-amber-600",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {a.drugs[0]} + {a.drugs[1]}
                      </span>
                      <Badge className={cn("text-[10px] uppercase tracking-wide", SEVERITY_BADGE[a.severity])}>
                        {a.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Medication cards */}
        {meds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No medications tagged to this dimension.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {meds.map((m) => {
              const supplyPct = m.totalPills > 0 ? Math.round((m.remainingPills / m.totalPills) * 100) : 0;
              const supplyLow = supplyPct < 25;
              const renewIn = m.renewalDate
                ? Math.ceil((new Date(m.renewalDate).getTime() - Date.now()) / 86_400_000)
                : null;
              const renewSoon = renewIn !== null && renewIn <= 30;
              const showRenew = supplyLow || renewSoon;
              const sev = medAlertSeverity[m.name];

              return (
                <button
                  key={m.id}
                  onClick={onNavigateToMedications}
                  className="text-left rounded-md border bg-card p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                        {sev && (
                          <Badge className={cn("text-[10px] uppercase", SEVERITY_BADGE[sev])}>
                            {sev}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.dose} • {m.frequency}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-xs",
                        supplyLow ? "text-destructive font-medium" : "text-muted-foreground",
                      )}
                    >
                      Supply: {m.remainingPills}/{m.totalPills} ({supplyPct}%)
                    </span>
                    {showRenew && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <RefreshCw className="h-3 w-3" /> Renew
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
