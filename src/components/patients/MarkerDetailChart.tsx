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
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

type ChartPoint = { date: string; value: number };
type AnnotationPoint = { id: string; date: string; text: string };
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
  chartData: ChartPoint[];
  refValues: { low?: number; high?: number } | null;
  annotations?: AnnotationPoint[];
}

const PRIMARY_LINE = "hsl(var(--foreground))";

export function MarkerDetailChart({ chartData, refValues, annotations = [] }: MarkerDetailChartProps) {
  const [window, setWindow] = useState<Window>("3y");

  const data = useMemo(
    () =>
      filterByWindow(
        [...chartData].sort((a, b) => a.date.localeCompare(b.date)),
        window,
      ),
    [chartData, window],
  );

  const refLow = refValues?.low;
  const refHigh = refValues?.high;

  // Annotation markers visible within current data window
  const annotationFlags = useMemo(() => {
    if (!annotations.length || data.length === 0) return [];
    const visible = new Set(data.map((d) => d.date));
    return annotations
      .filter((a) => visible.has(a.date))
      .map((a) => ({
        ...a,
        idx: data.findIndex((d) => d.date === a.date),
      }))
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
      {/* Time window selector */}
      <div className="flex justify-end">
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

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={PRIMARY_LINE}
                  strokeWidth={2}
                  dot={renderDot as any}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Annotation flags row */}
          {annotationFlags.length > 0 && (
            <div
              className="relative h-5"
              style={{ marginLeft: 50, marginRight: 56 }}
            >
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
    </div>
  );
}
