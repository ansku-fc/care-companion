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

// Care Companion chart tokens (warm tonal axis, status palette only)
const ESPRESSO = "#2E1F14";
const BLUSH = "#B0455F";        // latest dot
const TEAL_INK = "#0E8A85";     // optimal band ink
const AMBER_INK = "#A86A1A";    // out-of-range dot
const HAIR = "#E8E0D4";
const HAIR_STRONG = "#D9CFBE";
const INK_DIM = "#6B5E51";
const INK_FAINT = "#9A8D7E";
const PRIMARY_LINE = ESPRESSO;

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
    const isLatest = index === data.length - 1;
    const out =
      typeof v === "number" &&
      ((refHigh !== undefined && v > refHigh) || (refLow !== undefined && v < refLow));
    const fill = isLatest ? BLUSH : out ? AMBER_INK : PRIMARY_LINE;
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={isLatest ? 4.5 : 3}
        fill={fill}
        stroke="#FFFFFF"
        strokeWidth={isLatest ? 1.5 : 1}
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
                <CartesianGrid strokeDasharray="2 3" stroke={HAIR} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: INK_FAINT }} axisLine={{ stroke: HAIR_STRONG }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: INK_FAINT }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: `1px solid ${HAIR_STRONG}`,
                    borderRadius: 6,
                    fontSize: 11,
                    color: ESPRESSO,
                    boxShadow: "0 4px 12px rgba(46,31,20,0.08)",
                  }}
                  labelStyle={{ color: INK_DIM, fontSize: 10 }}
                />

                {(refLow !== undefined || refHigh !== undefined) && (
                  <ReferenceArea
                    y1={refLow ?? 0}
                    y2={refHigh ?? 9999}
                    fill={TEAL_INK}
                    fillOpacity={0.08}
                  />
                )}
                {refLow !== undefined && (
                  <ReferenceLine
                    y={refLow}
                    stroke={TEAL_INK}
                    strokeOpacity={0.35}
                    strokeDasharray="3 3"
                    label={{
                      value: `${refLow}`,
                      position: "right",
                      fontSize: 9,
                      fill: INK_FAINT,
                    }}
                  />
                )}
                {refHigh !== undefined && (
                  <ReferenceLine
                    y={refHigh}
                    stroke={TEAL_INK}
                    strokeOpacity={0.35}
                    strokeDasharray="3 3"
                    label={{
                      value: `${refHigh}`,
                      position: "right",
                      fontSize: 9,
                      fill: INK_FAINT,
                    }}
                  />
                )}

                {secondaryRefValues?.high !== undefined && (
                  <ReferenceLine
                    y={secondaryRefValues.high}
                    stroke={TEAL_INK}
                    strokeOpacity={0.2}
                    strokeDasharray="3 3"
                    label={{
                      value: `${secondaryRefValues.high}`,
                      position: "right",
                      fontSize: 9,
                      fill: INK_FAINT,
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  name={label}
                  stroke={PRIMARY_LINE}
                  strokeWidth={1.5}
                  dot={renderDot as any}
                  activeDot={{ r: 5, fill: BLUSH, stroke: "#FFFFFF", strokeWidth: 1.5 }}
                />
                {secondarySeries && (
                  <Line
                    type="monotone"
                    dataKey="value2"
                    name={secondaryLabel}
                    stroke={INK_DIM}
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                    dot={{ r: 2.5, fill: INK_DIM, stroke: "#FFFFFF", strokeWidth: 1 }}
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
