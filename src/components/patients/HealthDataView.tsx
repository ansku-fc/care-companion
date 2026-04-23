import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { HEALTH_TAXONOMY } from "@/lib/healthDimensions";
import { cn } from "@/lib/utils";

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
  if (score < 7)
    return {
      text: "text-[hsl(28_63%_44%)]",
      ring: "border-[hsl(28_63%_44%/0.4)] bg-[hsl(28_63%_44%/0.06)]",
      label: "Medium",
    };
  return {
    text: "text-[hsl(0_72%_45%)]",
    ring: "border-[hsl(0_72%_45%/0.5)] bg-[hsl(0_72%_45%/0.08)]",
    label: "High",
  };
}

interface Props {
  onSelectDimension: (key: string) => void;
}

export function HealthDataView({ onSelectDimension }: Props) {
  const highDims = HEALTH_TAXONOMY.filter(
    (m) => (DIMENSION_RISK_SCORES[m.key] ?? 0) >= 7,
  );

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Health Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Health dimensions</p>
      </div>

      {/* High-risk summary with clickable dimension names */}
      {highDims.length > 0 && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <AlertTriangle className="h-4 w-4 text-[hsl(0_72%_45%)]" />
          <span className="text-foreground">
            <span className="font-semibold">{highDims.length}</span> dimension
            {highDims.length === 1 ? "" : "s"}{" "}
            <span className="font-semibold text-[hsl(0_72%_45%)]">HIGH risk</span>
            {" — "}
          </span>
          {highDims.map((d, i) => (
            <span key={d.key} className="inline-flex items-center">
              <button
                onClick={() => onSelectDimension(d.key)}
                className="text-foreground font-medium underline-offset-2 hover:underline hover:text-[hsl(0_72%_45%)] transition-colors"
              >
                {d.label}
              </button>
              {i < highDims.length - 1 && (
                <span className="text-muted-foreground mx-1">,</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Dimension grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {HEALTH_TAXONOMY.map((dim) => {
          const Icon = dim.icon;
          const score = DIMENSION_RISK_SCORES[dim.key] ?? 1;
          const tone = riskTone(score);
          const updated = DIMENSION_LAST_UPDATED[dim.key];
          const isHigh = score >= 7;

          return (
            <button
              key={dim.key}
              onClick={() => onSelectDimension(dim.key)}
              className="text-left group relative"
            >
              {/* Pulsing dot for high-risk dimensions */}
              {isHigh && (
                <span className="absolute -top-1 -right-1 z-10 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(0_72%_45%)] opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[hsl(0_72%_45%)]" />
                </span>
              )}
              <Card
                className={cn(
                  "shadow-card transition-all",
                  isHigh
                    ? "hover:border-[hsl(0_72%_45%/0.6)] hover:shadow-md border-[hsl(0_72%_45%/0.25)]"
                    : "hover:shadow-md hover:border-primary/40",
                )}
              >
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
    </div>
  );
}
