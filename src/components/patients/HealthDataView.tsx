import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import { cn } from "@/lib/utils";
import {
  CARTER_DIAGNOSES,
  DIMENSION_LABEL_TO_KEY,
  fmtClinicalDate,
} from "@/lib/patientClinicalData";

// Same dummy varied risk-index values used elsewhere
const DIMENSION_RISK_SCORES: Record<string, number> = {
  brain_mental: 3.2,
  metabolic: 6.7,
  cardiovascular: 8.4,
  exercise_functional: 2.1,
  digestion: 5.5,
  respiratory_immune: 4.8,
  cancer_risk: 7.3,
  skin_oral_mucosal: 1.9,
  reproductive_sexual: 3.6,
};

// Dummy "last updated" dates per dimension for now
const DIMENSION_LAST_UPDATED: Record<string, string> = {
  brain_mental: "12 Mar 2025",
  metabolic: "28 Feb 2025",
  cardiovascular: "5 Mar 2025",
  exercise_functional: "18 Jan 2025",
  digestion: "22 Feb 2025",
  respiratory_immune: "3 Mar 2025",
  cancer_risk: "10 Feb 2025",
  skin_oral_mucosal: "15 Jan 2025",
  reproductive_sexual: "8 Feb 2025",
};

function riskTone(score: number) {
  if (score <= 3)
    return {
      text: "text-[hsl(189_94%_43%)]",
      ring: "border-[hsl(189_94%_43%/0.4)] bg-[hsl(189_94%_43%/0.06)]",
      label: "Low",
    };
  if (score <= 6)
    return {
      text: "text-[hsl(28_63%_44%)]",
      ring: "border-[hsl(28_63%_44%/0.4)] bg-[hsl(28_63%_44%/0.06)]",
      label: "Medium",
    };
  return {
    text: "text-[hsl(0_57%_39%)]",
    ring: "border-[hsl(0_57%_39%/0.4)] bg-[hsl(0_57%_39%/0.08)]",
    label: "High",
  };
}

interface Props {
  onSelectDimension: (key: string) => void;
}

export function HealthDataView({ onSelectDimension }: Props) {
  const elevatedCount = HEALTH_TAXONOMY.filter(
    (m) => (DIMENSION_RISK_SCORES[m.key] ?? 0) >= 4,
  ).length;

  const activeDx = CARTER_DIAGNOSES.filter((d) => d.status === "active");
  const pastDx = CARTER_DIAGNOSES.filter((d) => d.status === "resolved");
  const [pastOpen, setPastOpen] = useState(false);

  return (
    <div className="space-y-5 p-1 overflow-auto h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Health Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Health dimensions</p>
      </div>

      {/* Summary line */}
      {elevatedCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-[hsl(28_63%_44%)]" />
          <span className="text-foreground font-medium">
            {elevatedCount} dimension{elevatedCount === 1 ? "" : "s"} require attention
          </span>
        </div>
      )}

      {/* Dimension grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {HEALTH_TAXONOMY.map((dim) => {
          const Icon = dim.icon;
          const score = DIMENSION_RISK_SCORES[dim.key] ?? 1;
          const tone = riskTone(score);
          const updated = DIMENSION_LAST_UPDATED[dim.key];

          return (
            <button
              key={dim.key}
              onClick={() => onSelectDimension(dim.key)}
              className="text-left group"
            >
              <Card className="shadow-card hover:shadow-md hover:border-primary/40 transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{dim.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Updated {updated}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-full border-2",
                      tone.ring,
                    )}
                  >
                    <span className={cn("text-base font-bold leading-none", tone.text)}>
                      {score.toFixed(1)}
                    </span>
                    <span className={cn("text-[9px] uppercase tracking-wide mt-0.5", tone.text)}>
                      {tone.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Diagnoses */}
      <section className="space-y-2 pt-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Diagnoses
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeDx.length} active · {pastDx.length} past
          </p>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0 divide-y">
            {activeDx.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectDimension(DIMENSION_LABEL_TO_KEY[d.dimension])}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{d.icd10}</Badge>
                    <span className="text-[11px] text-muted-foreground">{d.dimension}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  Diagnosed {fmtClinicalDate(d.diagnosedDate)}
                </span>
              </button>
            ))}
            {activeDx.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                No active diagnoses recorded.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Past Diagnoses (collapsible) */}
        <Card className="shadow-card">
          <button
            onClick={() => setPastOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">
              Past Diagnoses ({pastDx.length})
            </span>
            {pastOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {pastOpen && (
            <CardContent className="p-0 divide-y border-t">
              {pastDx.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  No resolved diagnoses on record.
                </p>
              ) : (
                pastDx.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onSelectDimension(DIMENSION_LABEL_TO_KEY[d.dimension])}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{d.icd10}</Badge>
                        <span className="text-[11px] text-muted-foreground">{d.dimension}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {fmtClinicalDate(d.diagnosedDate)}
                      {d.resolvedDate ? ` → ${fmtClinicalDate(d.resolvedDate)}` : ""}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
