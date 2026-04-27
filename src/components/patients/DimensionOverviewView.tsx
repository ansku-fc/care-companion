import { useMemo, useState, useEffect, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Activity, Save, X, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { type MainDimension } from "@/lib/healthDimensions";
import {
  CardioLabBiomarkerPanel,
  getSeriesRowsForBiomarker,
} from "@/components/patients/CardioLabBiomarkerPanel";
import { DimensionMedicationsSection } from "@/components/patients/DimensionMedicationsSection";
import {
  ALL_BIOMARKERS,
  getBiomarkersForMainDimension,
  getBiomarkersForSubDimension,
  type BiomarkerDef,
} from "@/components/patients/dimensionRegistry";
import { AddLabResultsDialog } from "@/components/patients/AddLabResultsDialog";
import {
  getLabCategoriesForMainDimension,
  getLabCategoriesForSubDimension,
  type LabMarkerCategory,
  type LabMarkerRow,
} from "@/lib/labMarkerRegistry";
import { useTaskActions } from "@/components/tasks/TaskProvider";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────
export { scoreColorClass, scoreBorderColor } from "@/lib/scoreColor";
import { scoreColorClass, scoreBorderColor } from "@/lib/scoreColor";

// ────────────────────────────────────────────────────────────────────
// (Sub-dimension strip card removed — sub-dim info is now shown only in
// the Risk Factors accordion headers.)
// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
// Lab Results panel (shared by overview + sub-dimension pages)
// ────────────────────────────────────────────────────────────────────
type SelectedMarker = {
  key: string;
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  accentColorVar: string;
};

export function LabResultsBlock({
  /** Pre-grouped categories from the shared registry. Required for the new view. */
  categories,
  /** Legacy flat biomarker list — used only by sub-dimension callers that still pass it. */
  biomarkers,
  filter,
  onFilterChange,
  filterOptions,
  patientId,
  patientName,
  labResults,
  viewMode = "graphs",
}: {
  categories?: LabMarkerCategory[];
  biomarkers?: BiomarkerDef[];
  filter?: string;
  onFilterChange?: (k: string) => void;
  filterOptions?: { key: string; label: string }[];
  patientId?: string;
  patientName?: string;
  labResults?: Array<Record<string, any>> | null;
  viewMode?: "graphs" | "table";
}) {
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null);
  const [sidebarWindow, setSidebarWindow] = useState<"6m" | "1y" | "3y" | "all">("3y");

  // Build a unified `sections` view: prefer the shared registry (categories);
  // fall back to legacy biomarkers list grouped under a single section.
  const sections = useMemo<{ title: string; rows: BiomarkerDef[] }[]>(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => ({
        title: c.title,
        rows: c.rows.map(rowToBiomarkerDef),
      }));
    }
    if (biomarkers && biomarkers.length > 0) {
      return [{ title: "", rows: biomarkers }];
    }
    return [];
  }, [categories, biomarkers]);

  const filteredSections = useMemo(() => {
    if (!filter || filter === "all") return sections;
    return sections
      .map((s) => ({ ...s, rows: s.rows.filter((b) => b.subDimension === filter) }))
      .filter((s) => s.rows.length > 0);
  }, [sections, filter]);

  const allVisibleRows = useMemo(
    () => filteredSections.flatMap((s) => s.rows),
    [filteredSections],
  );

  const selectMarker = (b: BiomarkerDef) =>
    setSelectedMarker({
      key: b.key,
      label: b.sidebarLabel ?? b.label,
      unit: b.unit,
      refLow: b.refLow,
      refHigh: b.refHigh,
      accentColorVar: "#2C1A0E",
    });

  return (
    <div className="space-y-4">
      {filterOptions && filterOptions.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onFilterChange?.("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              (!filter || filter === "all")
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            All
          </button>
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onFilterChange?.(opt.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {allVisibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No biomarkers tracked for this selection yet.
        </p>
      ) : viewMode === "table" ? (
        <DimensionLabTable sections={filteredSections} labResults={labResults} />
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 min-w-0 space-y-6">
            {filteredSections.map((section) => (
              <div key={section.title || "default"} className="space-y-3">
                {section.title && (
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {section.title}
                  </h3>
                )}
                <div className={`grid grid-cols-1 ${selectedMarker ? "lg:grid-cols-1" : "lg:grid-cols-2"} gap-4`}>
                  {section.rows.map((b) => (
                    <CardioLabBiomarkerPanel
                      key={b.key}
                      biomarkerKey={b.key}
                      label={b.label}
                      unit={b.unit}
                      refLow={b.refLow}
                      refHigh={b.refHigh}
                      accentColorVar="#2C1A0E"
                      selected={selectedMarker?.key === b.key}
                      onSelect={() => selectMarker(b)}
                      patientId={patientId}
                      patientName={patientName}
                      labResults={labResults}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedMarker && (() => {
            const rows = getSeriesRowsForBiomarker(
              selectedMarker.key,
              sidebarWindow,
              selectedMarker.refLow,
              selectedMarker.refHigh,
              patientId,
              labResults,
            );
            return (
              <div
                className="w-[340px] shrink-0 border rounded-lg bg-card flex flex-col self-start sticky top-4 max-h-[calc(100vh-2rem)]"
                style={{ borderLeftWidth: 4, borderLeftColor: "#2C1A0E" }}
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{selectedMarker.label}</h3>
                    {selectedMarker.unit && (
                      <p className="text-xs text-muted-foreground">{selectedMarker.unit}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMarker(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-3 border-b flex gap-1">
                  {(["6m", "1y", "3y", "all"] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setSidebarWindow(w)}
                      className={cn(
                        "flex-1 px-2 py-1 rounded text-[11px]",
                        sidebarWindow === w
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70",
                      )}
                    >
                      {w === "all" ? "All" : w}
                    </button>
                  ))}
                </div>
                <div className="overflow-auto p-3">
                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No values in this window.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 text-muted-foreground">{r.date}</td>
                            <td className="py-1.5 text-right font-medium">
                              {r.value}
                              {r.inRange === false && (
                                <span className="ml-1 text-[10px] text-destructive">!</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/** Convert a registry row to the BiomarkerDef shape the chart panel expects. */
function rowToBiomarkerDef(r: LabMarkerRow): BiomarkerDef {
  return {
    key: r.key,
    label: r.label,
    unit: r.unit,
    refLow: r.refLow,
    refHigh: r.refHigh,
    subDimension: r.subDimension ?? "",
  };
}

/** Compact per-dimension table — same shape as the main lab table. */
function DimensionLabTable({
  sections,
  labResults,
}: {
  sections: { title: string; rows: BiomarkerDef[] }[];
  labResults?: Array<Record<string, any>> | null;
}) {
  const labs = (labResults ?? []) as Array<Record<string, any>>;
  const sorted = [...labs].sort((a, b) =>
    String(a.result_date ?? "").localeCompare(String(b.result_date ?? "")),
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No lab results yet.
      </p>
    );
  }

  const cellValue = (lab: Record<string, any>, key: string): string => {
    const v = lab[key];
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "1" : "0";
    return String(v);
  };

  const isOOR = (b: BiomarkerDef, lab: Record<string, any>): "high" | "low" | null => {
    const raw = lab[b.key];
    if (raw === null || raw === undefined || typeof raw === "boolean") return null;
    const n = Number(raw);
    if (isNaN(n)) return null;
    if (b.refHigh != null && n > b.refHigh) return "high";
    if (b.refLow != null && n < b.refLow) return "low";
    return null;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sticky left-0 bg-muted/30 z-10 min-w-[200px]">
                Marker
              </th>
              <th className="h-10 px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[80px]">
                Unit
              </th>
              {sorted.map((lab) => {
                const d = new Date(String(lab.result_date));
                const label = `${d.getFullYear()} / ${String(d.getMonth() + 1).padStart(2, "0")}`;
                return (
                  <th
                    key={String(lab.id)}
                    className="h-10 px-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[90px] whitespace-nowrap"
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.title || "default"}>
                {section.title && (
                  <tr>
                    <td
                      colSpan={2 + sorted.length}
                      className="font-semibold text-[10px] uppercase tracking-[0.08em] text-muted-foreground py-2 px-4 bg-muted/20"
                    >
                      {section.title}
                    </td>
                  </tr>
                )}
                {section.rows.map((b) => (
                  <tr key={b.key} className="border-b hover:bg-primary/[0.04]">
                    <td className="px-4 py-2.5 align-middle font-medium text-sm sticky left-0 bg-card">
                      {b.label}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-muted-foreground">
                      {b.unit}
                    </td>
                    {sorted.map((lab) => {
                      const oor = isOOR(b, lab);
                      return (
                        <td
                          key={String(lab.id)}
                          className={cn(
                            "px-3 py-2.5 align-middle text-center text-sm whitespace-nowrap tabular-nums",
                            oor && "text-[hsl(0_72%_45%)] font-semibold",
                          )}
                        >
                          {cellValue(lab, b.key)}
                          {oor === "high" && " ▲"}
                          {oor === "low" && " ▼"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Doctor's Summary + Recommendations (shared)
// ────────────────────────────────────────────────────────────────────
function ClinicalSynthesis({
  patientId,
  patientName,
  categoryKey,
  categoryLabel,
  initialSummary,
  initialRecommendations,
  storedStatus,
  onSaved,
}: {
  patientId: string;
  patientName?: string;
  categoryKey: string;
  categoryLabel: string;
  initialSummary: string;
  initialRecommendations: string;
  storedStatus?: string;
  onSaved?: () => void;
}) {
  const { openNewTask } = useTaskActions();
  const [summary, setSummary] = useState(initialSummary);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSummary(initialSummary);
    setRecommendations(initialRecommendations);
  }, [categoryKey, initialSummary, initialRecommendations]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("patient_health_categories")
      .upsert({
        patient_id: patientId,
        category: categoryKey,
        summary,
        recommendations,
        status: storedStatus || "normal",
        updated_by: (await supabase.auth.getUser()).data.user?.id || "",
      } as any, { onConflict: "patient_id,category" });
    setSaving(false);
    if (error) toast.error("Failed to save");
    else { toast.success("Saved successfully"); onSaved?.(); }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Doctor's Summary</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Synthesize the risk picture above…"
              className="min-h-[140px] text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recommendations</Label>
            <Textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Next steps, lifestyle, follow-up…"
              className="min-h-[140px] text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              openNewTask({
                title: `Follow up on ${categoryLabel}${patientName ? ` — ${patientName}` : ""}`,
                patient_id: patientId,
                category: "clinical",
                created_from: `${categoryLabel} review`,
                description: recommendations || undefined,
              })
            }
          >
            <ListChecks className="h-3.5 w-3.5" />
            Create task
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Main-dimension OVERVIEW page
// ────────────────────────────────────────────────────────────────────
export function MainDimensionOverview({
  main,
  parentScore,
  subScores,
  patient,
  healthCategories,
  labResults,
  onNavigateToSub,
  onNavigateToMedications,
  renderRiskFactors,
  onDataChanged,
}: {
  main: MainDimension;
  parentScore: number | null;
  subScores: Record<string, number | null>;
  patient: Tables<"patients">;
  healthCategories: Tables<"patient_health_categories">[];
  labResults?: Tables<"patient_lab_results">[] | null;
  onNavigateToSub: (subKey: string) => void;
  onNavigateToMedications: () => void;
  renderRiskFactors: () => React.ReactNode;
  onDataChanged?: () => void;
}) {
  const Icon = main.icon;
  const [showRiskHistory, setShowRiskHistory] = useState(false);
  const [tab, setTab] = useState<"risk_factors" | "lab_results">("risk_factors");
  const [labFilter, setLabFilter] = useState<string>("all");
  const [labViewMode, setLabViewMode] = useState<"graphs" | "table">("graphs");

  const subKeys = main.subDimensions.map((s) => s.key);
  const biomarkers = useMemo(
    () => getBiomarkersForMainDimension(main.key, subKeys),
    [main.key, subKeys.join(",")],
  );

  // Pull the same registry slice the main lab page uses, filtered to this dimension.
  const labCategories = useMemo(
    () => getLabCategoriesForMainDimension(main.key),
    [main.key],
  );

  // Sub-dimension filter options derived from the registry (so order and presence
  // match the main lab table).
  const filterOptions = main.subDimensions
    .filter((s) => labCategories.some((c) => c.rows.some((r) => r.subDimension === s.key)))
    .map((s) => ({ key: s.key, label: s.label }));

  const categoryKey = main.label.toLowerCase();
  const storedCategory = healthCategories.find(
    (c) => c.category.toLowerCase() === categoryKey,
  );

  const scoreColor = parentScore != null ? scoreColorClass(parentScore) : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{main.label}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Risk Index scale: 1 = no action needed → 10 = immediate action
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={cn("text-2xl font-bold leading-none", scoreColor)}>
                  {parentScore != null ? parentScore.toFixed(1) : "—"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowRiskHistory(!showRiskHistory)}
              >
                <Activity className="h-3.5 w-3.5" />
                {showRiskHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showRiskHistory && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground text-center py-6">
              Historical trend for this dimension will appear here once enough data points are available.
            </p>
          </CardContent>
        )}
      </Card>

      {/* RISK PICTURE */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Risk Picture
          </h2>
          <p className="text-xs text-muted-foreground">What is driving the current risk index</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="risk_factors">Risk Factors</TabsTrigger>
                <TabsTrigger value="lab_results">Lab Results</TabsTrigger>
              </TabsList>
              <TabsContent value="risk_factors" className="mt-4">
                {renderRiskFactors()}
              </TabsContent>
              <TabsContent value="lab_results" className="mt-4">
                <LabResultsBlock
                  biomarkers={biomarkers}
                  filter={labFilter}
                  onFilterChange={setLabFilter}
                  filterOptions={filterOptions}
                  patientId={patient.id}
                  patientName={patient.full_name}
                  labResults={labResults}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* MEDICATIONS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medications
          </h2>
          <p className="text-xs text-muted-foreground">What is being done about the risk</p>
        </div>
        <DimensionMedicationsSection
          dimensionKey={main.key}
          dimensionLabel={main.label}
          onNavigateToMedications={onNavigateToMedications}
          patientId={patient.id}
          patientName={patient.full_name}
        />
      </section>

      {/* CLINICAL SYNTHESIS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Clinical Synthesis
          </h2>
          <p className="text-xs text-muted-foreground">Doctor's interpretation and plan</p>
        </div>
        <ClinicalSynthesis
          patientId={patient.id}
          patientName={patient.full_name}
          categoryKey={categoryKey}
          categoryLabel={main.label}
          initialSummary={storedCategory?.summary || ""}
          initialRecommendations={(storedCategory as any)?.recommendations || ""}
          storedStatus={storedCategory?.status}
          onSaved={onDataChanged}
        />
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// SUB-DIMENSION focused page
// ────────────────────────────────────────────────────────────────────
export function SubDimensionView({
  parent,
  subKey,
  parentScore,
  subScore,
  patient,
  healthCategories,
  labResults,
  onNavigateToParent,
  onNavigateToMedications,
  renderRiskFactors,
  onDataChanged,
}: {
  parent: MainDimension;
  subKey: string;
  parentScore: number | null;
  subScore: number | null;
  patient: Tables<"patients">;
  healthCategories: Tables<"patient_health_categories">[];
  labResults?: Tables<"patient_lab_results">[] | null;
  onNavigateToParent: () => void;
  onNavigateToMedications: () => void;
  renderRiskFactors: () => React.ReactNode;
  onDataChanged?: () => void;
}) {
  const sub = parent.subDimensions.find((s) => s.key === subKey);
  const [tab, setTab] = useState<"risk_factors" | "lab_results">("risk_factors");
  const biomarkers = useMemo(() => getBiomarkersForSubDimension(subKey), [subKey]);
  if (!sub) return null;
  const Icon = sub.icon;

  const categoryKey = `${parent.label}__${sub.label}`.toLowerCase();
  const storedCategory = healthCategories.find(
    (c) => c.category.toLowerCase() === categoryKey,
  );

  const subScoreColor = subScore != null ? scoreColorClass(subScore) : "text-muted-foreground";
  const parentScoreColor = parentScore != null ? scoreColorClass(parentScore) : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* HEADER (parent + child context) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <button
                  onClick={onNavigateToParent}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors block"
                >
                  {parent.label}
                </button>
                <CardTitle className="text-lg mt-0.5">{sub.label}</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToParent}
                className="flex items-baseline gap-1.5 hover:bg-muted/40 px-2 py-1 rounded-md transition-colors"
              >
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {parent.label}
                </span>
                <span className={cn("text-base font-semibold leading-none", parentScoreColor)}>
                  {parentScore != null ? parentScore.toFixed(1) : "—"}
                </span>
              </button>
              <span className="text-muted-foreground/50">→</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Risk Index</span>
                <span className={cn("text-2xl font-bold leading-none", subScoreColor)}>
                  {subScore != null ? subScore.toFixed(1) : "—"}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* RISK PICTURE */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Risk Picture
          </h2>
          <p className="text-xs text-muted-foreground">
            What is driving the current risk index
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="risk_factors">Risk Factors</TabsTrigger>
                <TabsTrigger value="lab_results">Lab Results</TabsTrigger>
              </TabsList>
              <TabsContent value="risk_factors" className="mt-4">
                {renderRiskFactors()}
              </TabsContent>
              <TabsContent value="lab_results" className="mt-4">
                <LabResultsBlock biomarkers={biomarkers} patientId={patient.id} patientName={patient.full_name} labResults={labResults} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* MEDICATIONS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medications
          </h2>
          <p className="text-xs text-muted-foreground">What is being done about the risk</p>
        </div>
        <DimensionMedicationsSection
          dimensionKey={subKey}
          dimensionLabel={sub.label}
          onNavigateToMedications={onNavigateToMedications}
          patientId={patient.id}
          patientName={patient.full_name}
        />
      </section>

      {/* CLINICAL SYNTHESIS */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Clinical Synthesis
          </h2>
          <p className="text-xs text-muted-foreground">Doctor's interpretation and plan</p>
        </div>
        <ClinicalSynthesis
          patientId={patient.id}
          patientName={patient.full_name}
          categoryKey={categoryKey}
          categoryLabel={`${parent.label} — ${sub.label}`}
          initialSummary={storedCategory?.summary || ""}
          initialRecommendations={(storedCategory as any)?.recommendations || ""}
          storedStatus={storedCategory?.status}
          onSaved={onDataChanged}
        />
      </section>
    </div>
  );
}
