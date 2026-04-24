import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Flag, MessageSquarePlus, ListChecks, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChartPoint = { date: string; value: number };
export type MarkerAnnotation = { id: string; date: string; text: string; author?: string };
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

interface MarkerDetailChartProps {
  label: string;
  unit?: string;
  chartData: ChartPoint[];
  refValues: { low?: number; high?: number } | null;
  /** Optional secondary series (e.g. diastolic BP) rendered as a lighter line on the same chart. */
  secondarySeries?: ChartPoint[];
  secondaryLabel?: string;
  secondaryRefValues?: { low?: number; high?: number } | null;
  annotations?: MarkerAnnotation[];
  /** When true, hides the annotation/task icon buttons and inline annotation panel. */
  displayOnly?: boolean;
  annotationText?: string;
  annotationDate?: string;
  onAnnotationTextChange?: (v: string) => void;
  onAnnotationDateChange?: (v: string) => void;
  onSaveAnnotation?: () => void;
  onDeleteAnnotation?: (id: string) => void;
  onCreateTask?: () => void;
}

const PRIMARY_LINE = "hsl(var(--foreground))";

export function MarkerDetailChart({
  label,
  unit,
  chartData,
  refValues,
  secondarySeries,
  secondaryLabel = "Secondary",
  secondaryRefValues,
  annotations = [],
  displayOnly = false,
  annotationText = "",
  annotationDate = "",
  onAnnotationTextChange,
  onAnnotationDateChange,
  onSaveAnnotation,
  onDeleteAnnotation,
  onCreateTask,
}: MarkerDetailChartProps) {
  const [window, setWindow] = useState<Window>("3y");
  const [annotationsOpen, setAnnotationsOpen] = useState(false);

  const data = useMemo(() => {
    const primary = [...chartData].sort((a, b) => a.date.localeCompare(b.date));
    const secMap = new Map<string, number>();
    if (secondarySeries) {
      for (const p of secondarySeries) secMap.set(p.date, p.value);
    }
    const merged = primary.map((p) => ({
      date: p.date,
      value: p.value,
      value2: secMap.get(p.date),
    }));
    return filterByWindow(merged, window);
  }, [chartData, secondarySeries, window]);

  const refLow = refValues?.low;
  const refHigh = refValues?.high;

  const annotationFlags = useMemo(() => {
    if (!annotations.length || data.length === 0) return [];
    const visible = new Set(data.map((d) => d.date));
    return annotations
      .filter((a) => visible.has(a.date))
      .map((a) => ({ ...a, idx: data.findIndex((d) => d.date === a.date) }))
      .filter((a) => a.idx >= 0);
  }, [annotations, data]);

  const renderDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null) return null;
    const v = payload?.value;
    const out =
      typeof v === "number" &&
      ((refHigh !== undefined && v > refHigh) || (refLow !== undefined && v < refLow));
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={out ? "hsl(var(--destructive))" : PRIMARY_LINE}
        stroke="hsl(var(--background))"
        strokeWidth={1}
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Unified header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{label}</span>
          {unit && <span className="ml-1 text-muted-foreground">({unit})</span>}
        </div>
        <div className="flex items-center gap-1">
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
          {!displayOnly && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Add annotation"
                onClick={() => setAnnotationsOpen((o) => !o)}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Create task from this marker"
                onClick={onCreateTask}
              >
                <ListChecks className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No data in this time window.</p>
      ) : (
        <>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />

                {(refLow !== undefined || refHigh !== undefined) && (
                  <ReferenceArea
                    y1={refLow ?? 0}
                    y2={refHigh ?? 9999}
                    fill="hsl(142 70% 45%)"
                    fillOpacity={0.1}
                  />
                )}
                {refLow !== undefined && (
                  <ReferenceLine
                    y={refLow}
                    stroke="hsl(142 60% 40%)"
                    strokeDasharray="4 3"
                    label={{
                      value: `Low ${refLow}`,
                      position: "right",
                      fontSize: 9,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                )}
                {refHigh !== undefined && (
                  <ReferenceLine
                    y={refHigh}
                    stroke="hsl(142 60% 40%)"
                    strokeDasharray="4 3"
                    label={{
                      value: `High ${refHigh}`,
                      position: "right",
                      fontSize: 9,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                )}

                {secondaryRefValues?.high !== undefined && (
                  <ReferenceLine
                    y={secondaryRefValues.high}
                    stroke="hsl(142 50% 55%)"
                    strokeDasharray="4 3"
                    label={{
                      value: `High ${secondaryRefValues.high}`,
                      position: "right",
                      fontSize: 9,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  name={label}
                  stroke={PRIMARY_LINE}
                  strokeWidth={2}
                  dot={renderDot as any}
                  activeDot={{ r: 5 }}
                />
                {secondarySeries && (
                  <Line
                    type="monotone"
                    dataKey="value2"
                    name={secondaryLabel}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--muted-foreground))", stroke: "hsl(var(--background))", strokeWidth: 1 }}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {annotationFlags.length > 0 && (
            <div className="relative h-5" style={{ marginLeft: 50, marginRight: 56 }}>
              {annotationFlags.map((a) => {
                const left = data.length === 1 ? 50 : (a.idx / (data.length - 1)) * 100;
                return (
                  <div
                    key={a.id}
                    title={`${a.date} — ${a.text}`}
                    className="absolute -translate-x-1/2 top-0 inline-flex flex-col items-center"
                    style={{ left: `${left}%` }}
                  >
                    <span className="block w-px h-2 bg-foreground/60" aria-hidden />
                    <Flag className="h-3 w-3 -mt-0.5 fill-primary/30 text-primary" />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Inline annotations panel */}
      {!displayOnly && annotationsOpen && (
        <div className="rounded-md border bg-muted/20 p-2.5 space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Annotation
              </Label>
              <Textarea
                placeholder="Add a clinical annotation..."
                className="mt-1 min-h-[48px] text-xs resize-none"
                value={annotationText}
                onChange={(e) => onAnnotationTextChange?.(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={annotationDate}
                onChange={(e) => onAnnotationDateChange?.(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onSaveAnnotation}
              disabled={!annotationText.trim()}
            >
              Save
            </Button>
          </div>
          {annotations.length > 0 && (
            <ul className="space-y-1">
              {annotations.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded border bg-background px-2 py-1 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1.5">
                      {a.date}
                      {a.author ? ` · ${a.author}` : ""}
                    </span>
                    <span className="text-foreground">{a.text}</span>
                  </div>
                  <button
                    onClick={() => onDeleteAnnotation?.(a.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Delete annotation"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
