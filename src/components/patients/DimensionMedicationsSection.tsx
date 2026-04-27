import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, Plus, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CARTER_MEDICATIONS,
  CARTER_INTERACTIONS,
  isCarter,
} from "@/lib/patientClinicalData";

// ── Mock medication data — sourced from the central clinical data module ──
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
  ...CARTER_MEDICATIONS.map((m) => ({
    id: m.id,
    name: m.name,
    dose: m.dose,
    frequency: m.frequency,
    dimension: m.dimension,
    remainingPills: m.remainingPills,
    totalPills: m.totalPills,
    renewalDate: m.renewalDate,
    status: m.status,
    startDate: m.startDate,
  })),
  // Past
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

const SEED_INTERACTIONS: DimInteraction[] = CARTER_INTERACTIONS.map((i) => ({
  drugs: i.drugs,
  severity: i.severity,
  description: i.description,
}));

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
  mental_wellbeing: ["Brain & Mental Health"],
  sleep_recovery: ["Brain & Mental Health"],
  exercise: ["Exercise & Functional Health"],
  exercise_functional: ["Exercise & Functional Health"],
  musculoskeletal: ["Exercise & Functional Health"],
  respiratory: ["Respiratory & Immune Health"],
  immune: ["Respiratory & Immune Health"],
  respiratory_immune: ["Respiratory & Immune Health"],
  digestion: ["Digestion", "Digestion & Liver Health"],
  liver: ["Digestion", "Digestion & Liver Health"],
  digestion_liver: ["Digestion", "Digestion & Liver Health"],
  gastrointestinal: ["Digestion", "Digestion & Liver Health"],
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
  /** patient id — used to gate seed/demo data so it only shows for the demo patient */
  patientId?: string;
  /** patient full name — fallback for demo patient detection */
  patientName?: string;
}

export function DimensionMedicationsSection({ dimensionKey, dimensionLabel, onNavigateToMedications, patientId, patientName }: Props) {
  const matchingLabels = DIMENSION_LABEL_MAP[dimensionKey] ?? [dimensionLabel];
  const [pastOpen, setPastOpen] = useState(false);
  const [expandedPastIds, setExpandedPastIds] = useState<Set<string>>(new Set());

  // Only the demo patient (Carter) has seeded clinical data. Every other patient
  // starts empty until medications are explicitly added.
  const showSeed = isCarter(patientId, patientName);
  const sourceMeds = showSeed ? SEED_MEDS : [];
  const sourceInteractions = showSeed ? SEED_INTERACTIONS : [];

  const meds = useMemo(
    () => sourceMeds.filter((m) => m.status === "active" && matchingLabels.includes(m.dimension)),
    [matchingLabels, sourceMeds],
  );

  const pastMeds = useMemo(
    () => sourceMeds.filter((m) => m.status === "past" && matchingLabels.includes(m.dimension)),
    [matchingLabels, sourceMeds],
  );

  const medNames = useMemo(() => new Set(meds.map((m) => m.name)), [meds]);

  // Surface SEVERE / MODERATE alerts that involve at least one med in this dimension
  const alerts = useMemo(
    () =>
      sourceInteractions.filter(
        (i) =>
          (i.severity === "severe" || i.severity === "moderate") &&
          (medNames.has(i.drugs[0]) || medNames.has(i.drugs[1])),
      ),
    [medNames, sourceInteractions],
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

        {/* ── Past medications ── */}
        {pastMeds.length > 0 && (
          <div className="pt-2 border-t">
            <button
              onClick={() => setPastOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {pastOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <History className="h-3.5 w-3.5" />
              Past medications ({pastMeds.length})
            </button>

            {pastOpen && (
              <div className="mt-2 space-y-2">
                {pastMeds.map((m) => {
                  const isExpanded = expandedPastIds.has(m.id);
                  const toggle = () =>
                    setExpandedPastIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(m.id)) next.delete(m.id);
                      else next.add(m.id);
                      return next;
                    });
                  return (
                    <div key={m.id} className="rounded-md border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{m.name}</span>
                            <span className="text-xs text-muted-foreground">{m.dose} • {m.frequency}</span>
                            {m.hadInteractionAlertAtDiscontinuation && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggle(); }}
                                className="inline-flex items-center gap-1 text-[10px] text-amber-600 hover:underline"
                                title="Had active interaction alert at discontinuation"
                              >
                                <AlertTriangle className="h-3 w-3" /> Historical alert
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.startDate} → {m.endDate}
                          </p>
                          {m.discontinuationReason && (
                            <p className="text-xs text-foreground mt-1">
                              <span className="text-muted-foreground">Reason:</span> {m.discontinuationReason}
                              {m.discontinuedBy && (
                                <span className="text-muted-foreground"> • by {m.discontinuedBy}</span>
                              )}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={toggle}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </div>
                      {isExpanded && m.hadInteractionAlertAtDiscontinuation && (
                        <div className={cn("mt-2 rounded-md p-2 text-xs", SEVERITY_BORDER[m.hadInteractionAlertAtDiscontinuation.severity])}>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="font-medium text-foreground">
                              {m.hadInteractionAlertAtDiscontinuation.drugs[0]} + {m.hadInteractionAlertAtDiscontinuation.drugs[1]}
                            </span>
                            <Badge className={cn("text-[9px] uppercase", SEVERITY_BADGE[m.hadInteractionAlertAtDiscontinuation.severity])}>
                              {m.hadInteractionAlertAtDiscontinuation.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{m.hadInteractionAlertAtDiscontinuation.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

