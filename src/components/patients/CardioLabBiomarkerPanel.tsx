import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceDot,
} from "recharts";
import { MessageSquarePlus, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────
// In-memory annotation store (module-scoped). Resets on full reload.
// ──────────────────────────────────────────────────────────────────────
export type LabAnnotation = {
  id: string;
  biomarkerKey: string; // e.g. "ldl_mmol_l"
  biomarkerLabel: string; // e.g. "LDL"
  date: string; // ISO yyyy-mm-dd
  text: string;
  doctor: string;
  createdAt: string; // ISO timestamp
  includedInSummary?: boolean;
  includedInRecommendations?: boolean;
};

const annotationStore: LabAnnotation[] = [
  {
    id: "ann-seed-1",
    biomarkerKey: "ldl_mmol_l",
    biomarkerLabel: "LDL",
    date: "2024-02-10",
    text: "Started Atorvastatin 20mg — monitoring response",
    doctor: "Dr. Laine",
    createdAt: "2024-02-10T09:15:00Z",
  },
  {
    id: "ann-seed-2",
    biomarkerKey: "ldl_mmol_l",
    biomarkerLabel: "LDL",
    date: "2024-08-15",
    text: "LDL responding well, continue current dose",
    doctor: "Dr. Laine",
    createdAt: "2024-08-15T10:30:00Z",
  },
];

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getAnnotations(): LabAnnotation[] {
  return [...annotationStore];
}

export function getAnnotationsForBiomarker(key: string): LabAnnotation[] {
  return annotationStore.filter((a) => a.biomarkerKey === key);
}

export function addAnnotation(a: Omit<LabAnnotation, "id" | "createdAt">): LabAnnotation {
  const ann: LabAnnotation = {
    ...a,
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  annotationStore.push(ann);
  notify();
  return ann;
}

export function markIncluded(ids: string[], target: "summary" | "recommendations") {
  for (const a of annotationStore) {
    if (ids.includes(a.id)) {
      if (target === "summary") a.includedInSummary = true;
      else a.includedInRecommendations = true;
    }
  }
  notify();
}

export function useAnnotationsVersion() {
  const [, setV] = useState(0);
  useMemo(() => {
    const fn = () => setV((x) => x + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Dummy longitudinal data per biomarker (≈ every 3-6 months over ~4 yrs)
// ──────────────────────────────────────────────────────────────────────
type Point = { date: string; value: number; label?: string };
type BPPoint = { date: string; systolic: number; diastolic: number };

const LDL_DATA: Point[] = [
  { date: "2022-03-12", value: 4.8 },
  { date: "2022-09-04", value: 4.7 },
  { date: "2023-02-18", value: 4.9 },
  { date: "2023-08-22", value: 4.6 },
  { date: "2024-02-10", value: 4.5 }, // Atorvastatin started
  { date: "2024-05-14", value: 3.4 },
  { date: "2024-08-15", value: 2.9 },
  { date: "2024-12-03", value: 2.8 },
  { date: "2025-04-19", value: 2.7 },
  { date: "2025-10-08", value: 2.6 },
  { date: "2026-03-12", value: 2.7 },
];

const BP_DATA: BPPoint[] = [
  { date: "2022-04-10", systolic: 138, diastolic: 88 },
  { date: "2022-10-15", systolic: 142, diastolic: 90 },
  { date: "2023-03-20", systolic: 148, diastolic: 92 },
  { date: "2023-07-08", systolic: 145, diastolic: 91 }, // Lisinopril added
  { date: "2023-11-12", systolic: 132, diastolic: 84 },
  { date: "2024-04-22", systolic: 128, diastolic: 82 },
  { date: "2024-10-05", systolic: 124, diastolic: 80 },
  { date: "2025-03-18", systolic: 122, diastolic: 80 },
  { date: "2025-09-10", systolic: 126, diastolic: 82 },
  { date: "2026-02-14", systolic: 124, diastolic: 80 },
];

const ALAT_DATA: Point[] = [
  { date: "2022-04-10", value: 24 },
  { date: "2022-10-15", value: 28 },
  { date: "2023-04-22", value: 22 },
  { date: "2023-10-08", value: 30 },
  { date: "2024-04-12", value: 32 },
  { date: "2024-10-22", value: 28 },
  { date: "2025-04-09", value: 26 },
  { date: "2025-11-04", value: 38 },
  { date: "2026-03-15", value: 30 },
];

const AFOS_DATA: Point[] = [
  { date: "2022-04-10", value: 68 },
  { date: "2022-10-15", value: 72 },
  { date: "2023-04-22", value: 66 },
  { date: "2023-10-08", value: 70 },
  { date: "2024-04-12", value: 78 },
  { date: "2024-10-22", value: 74 },
  { date: "2025-04-09", value: 80 },
  { date: "2025-11-04", value: 76 },
  { date: "2026-03-15", value: 72 },
];

const GT_DATA: Point[] = [
  { date: "2022-04-10", value: 28 },
  { date: "2023-04-22", value: 32 },
  { date: "2024-04-12", value: 30 },
  { date: "2024-10-22", value: 35 },
  { date: "2025-04-09", value: 33 },
  { date: "2025-11-04", value: 36 },
  { date: "2026-03-15", value: 32 },
];

const ALAT_ASAT_DATA: Point[] = [
  { date: "2022-04-10", value: 0.85 },
  { date: "2023-04-22", value: 0.78 },
  { date: "2024-04-12", value: 0.82 },
  { date: "2024-10-22", value: 0.88 },
  { date: "2025-04-09", value: 0.84 },
  { date: "2025-11-04", value: 0.92 },
  { date: "2026-03-15", value: 0.86 },
];

const HBA1C_DATA: Point[] = [
  { date: "2022-04-10", value: 38 },
  { date: "2022-10-15", value: 39 },
  { date: "2023-04-22", value: 40 },
  { date: "2023-10-08", value: 38 },
  { date: "2024-04-12", value: 39 },
  { date: "2024-10-22", value: 37 },
  { date: "2025-04-09", value: 38 },
  { date: "2025-11-04", value: 39 },
  { date: "2026-03-15", value: 38 },
];

export const CARDIO_DUMMY_SERIES: Record<string, { single?: Point[]; bp?: BPPoint[] }> = {
  ldl_mmol_l: { single: LDL_DATA },
  blood_pressure_systolic: { bp: BP_DATA },
  alat_u_l: { single: ALAT_DATA },
  afos_alp_u_l: { single: AFOS_DATA },
  gt_u_l: { single: GT_DATA },
  alat_asat_ratio: { single: ALAT_ASAT_DATA },
  hba1c_mmol_mol: { single: HBA1C_DATA },
};

// ──────────────────────────────────────────────────────────────────────
// Time window
// ──────────────────────────────────────────────────────────────────────
type Window = "6m" | "1y" | "3y" | "all";
const WINDOW_LABELS: Record<Window, string> = {
  "6m": "6m",
  "1y": "1y",
  "3y": "3y",
  all: "All",
};

function filterByWindow<T extends { date: string }>(data: T[], window: Window): T[] {
  if (window === "all" || data.length === 0) return data;
  const last = new Date(data[data.length - 1].date).getTime();
  const months = window === "6m" ? 6 : window === "1y" ? 12 : 36;
  const cutoff = last - months * 30.44 * 24 * 3600 * 1000;
  return data.filter((d) => new Date(d.date).getTime() >= cutoff);
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────
type Props = {
  biomarkerKey: string;
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  selected?: boolean;
  onSelect?: () => void;
  doctor?: string;
};

export function CardioLabBiomarkerPanel({
  biomarkerKey,
  label,
  unit,
  refLow,
  refHigh,
  selected,
  onSelect,
  doctor = "Dr. Laine",
}: Props) {
  useAnnotationsVersion();
  const [window, setWindow] = useState<Window>("3y");
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const series = CARDIO_DUMMY_SERIES[biomarkerKey];
  const isBP = !!series?.bp;
  const rawData: Array<{ date: string }> = isBP ? series!.bp! : series?.single ?? [];
  const data = useMemo(() => filterByWindow(rawData, window), [rawData, window]);

  const annotations = useMemo(
    () => getAnnotationsForBiomarker(biomarkerKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [biomarkerKey, annotationStore.length],
  );

  // Map annotation date → annotation list (multiple per date possible)
  const annByDate = useMemo(() => {
    const m = new Map<string, LabAnnotation[]>();
    for (const a of annotations) {
      const arr = m.get(a.date) ?? [];
      arr.push(a);
      m.set(a.date, arr);
    }
    return m;
  }, [annotations]);

  // Y-domain for ReferenceDots (we plot annotations at the chart's lower bound)
  const yMin = useMemo(() => {
    if (data.length === 0) return 0;
    if (isBP) {
      return Math.min(...(data as unknown as BPPoint[]).map((d) => d.diastolic));
    }
    return Math.min(...(data as unknown as Point[]).map((d) => d.value));
  }, [data, isBP]);

  const handleAdd = () => {
    if (!draftText.trim()) return;
    const date = draftDate || new Date().toISOString().slice(0, 10);
    addAnnotation({
      biomarkerKey,
      biomarkerLabel: label,
      date,
      text: draftText.trim(),
      doctor,
    });
    setDraftText("");
    setDraftDate("");
    setPopoverOpen(false);
  };

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const date = payload[0].payload.date as string;
    const dayAnns = annByDate.get(date) ?? [];
    return (
      <div className="rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-md">
        <p className="font-medium">{date}</p>
        {isBP ? (
          <>
            <p className="text-destructive">Systolic: {payload[0].payload.systolic} mmHg</p>
            <p className="text-primary">Diastolic: {payload[0].payload.diastolic} mmHg</p>
          </>
        ) : (
          <p>
            {label}: {payload[0].value} {unit}
          </p>
        )}
        {dayAnns.length > 0 && (
          <div className="mt-1 pt-1 border-t">
            {dayAnns.map((a) => (
              <p key={a.id} className="text-[11px] italic text-muted-foreground max-w-[220px]">
                <StickyNote className="inline h-3 w-3 mr-1" />
                {a.text}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "transition-colors",
        selected ? "border-primary" : "hover:border-primary/50",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {label} {unit && <span className="text-xs font-normal text-muted-foreground">({unit})</span>}
        </CardTitle>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex rounded-md border bg-muted/50 p-0.5 text-[10px]">
            {(["6m", "1y", "3y", "all"] as Window[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={cn(
                  "px-1.5 py-0.5 rounded-sm transition-colors",
                  window === w
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {WINDOW_LABELS[w]}
              </button>
            ))}
          </div>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Add annotation"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <p className="text-xs font-medium">Add annotation — {label}</p>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                  placeholder="Date (defaults to today)"
                />
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="e.g. started Atorvastatin Feb 2024 — monitoring response"
                  className="min-h-[70px] text-xs resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPopoverOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAdd} disabled={!draftText.trim()}>
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data in this time window.</p>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip content={renderTooltip} />
                {refLow !== undefined && refHigh !== undefined && (
                  <ReferenceArea
                    y1={refLow}
                    y2={refHigh}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.08}
                    label={{ value: "Reference", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  />
                )}
                {refLow === undefined && refHigh !== undefined && (
                  <ReferenceArea y1={0} y2={refHigh} fill="hsl(var(--primary))" fillOpacity={0.08} />
                )}
                {refLow !== undefined && refHigh === undefined && (
                  <ReferenceArea y1={refLow} y2={9999} fill="hsl(var(--primary))" fillOpacity={0.08} />
                )}
                {isBP ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Systolic"
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Diastolic"
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={label}
                  />
                )}
                {/* Annotation markers */}
                {annotations
                  .filter((a) => data.find((d) => d.date === a.date))
                  .map((a) => (
                    <ReferenceDot
                      key={a.id}
                      x={a.date}
                      y={yMin}
                      r={5}
                      fill="hsl(var(--accent-foreground))"
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                      ifOverflow="extendDomain"
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {annotations.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <StickyNote className="h-3 w-3" />
            <span>
              {annotations.length} annotation{annotations.length === 1 ? "" : "s"} on this biomarker
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
