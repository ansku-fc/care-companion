import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  defs as _defs,
} from "recharts";
import { cn } from "@/lib/utils";

export type BiometricHistoryEntry = { date: string; value: number };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  metricLabel: string;
  patientName: string;
  unit: string;
  decimals: number;
  lowerIsBetter: boolean;
  staticValue?: boolean;
  /** newest-first series, INCLUDING current as the first entry (date "Today") */
  series: BiometricHistoryEntry[];
  /** optional clinical reference range */
  refRange?: { low: number; high: number; label?: string };
}

type RangeKey = "6m" | "1y" | "3y" | "all";

// Try to parse the human-readable date strings used throughout the app
// (e.g. "12 Aug 2025", "Today"). Returns ms epoch or null.
function parseEntryDate(s: string): number | null {
  if (s === "Today") return Date.now();
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

const RANGE_MS: Record<Exclude<RangeKey, "all">, number> = {
  "6m": 1000 * 60 * 60 * 24 * 30 * 6,
  "1y": 1000 * 60 * 60 * 24 * 365,
  "3y": 1000 * 60 * 60 * 24 * 365 * 3,
};

export function BiometricHistoryModal({
  open,
  onOpenChange,
  metricLabel,
  patientName,
  unit,
  decimals,
  lowerIsBetter,
  staticValue = false,
  series,
  refRange,
}: Props) {
  const [range, setRange] = useState<RangeKey>("3y");

  // Chart data is oldest-first
  const chartData = useMemo(() => {
    const reversed = [...series].reverse(); // oldest → newest
    if (range === "all") return reversed;
    const cutoff = Date.now() - RANGE_MS[range];
    return reversed.filter((e) => {
      const t = parseEntryDate(e.date);
      return t == null ? true : t >= cutoff;
    });
  }, [series, range]);

  const fmt = (n: number) => n.toFixed(decimals);

  const ImprovedColor = "text-[hsl(142_71%_35%)]";
  const WorsenedColor = "text-[hsl(0_57%_39%)]";

  const RANGES: { key: RangeKey; label: string }[] = [
    { key: "6m", label: "6m" },
    { key: "1y", label: "1y" },
    { key: "3y", label: "3y" },
    { key: "all", label: "All" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl p-0 overflow-hidden border-0 shadow-2xl"
        style={{ borderRadius: 20 }}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-base font-semibold">
            {metricLabel} history — {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-0">
          {/* LEFT: chart */}
          <div className="p-5 border-r">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {chartData.length} measurement{chartData.length === 1 ? "" : "s"} shown
              </p>
              <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-[5px] transition-colors",
                      range === r.key
                        ? "bg-background shadow-sm text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 24 }}>
                  <defs>
                    <linearGradient id={`bio-grad-${metricLabel}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(270 70% 60%)" />
                      <stop offset="100%" stopColor="hsl(180 70% 45%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${fmt(Number(v))}${unit ? " " + unit : ""}`, metricLabel]}
                  />
                  {refRange && (
                    <ReferenceArea
                      y1={refRange.low}
                      y2={refRange.high}
                      fill="hsl(142 71% 45%)"
                      fillOpacity={0.08}
                      ifOverflow="extendDomain"
                      label={{
                        value: refRange.label ?? `Healthy ${refRange.low}–${refRange.high}`,
                        position: "insideTopRight",
                        fontSize: 10,
                        fill: "hsl(142 71% 30%)",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={`url(#bio-grad-${metricLabel})`}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(270 70% 55%)", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: full table */}
          <div className="flex flex-col max-h-[440px]">
            <div className="px-5 py-3 border-b">
              <p className="text-xs font-semibold">All measurements</p>
              <p className="text-[11px] text-muted-foreground">{series.length} entries</p>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Date</th>
                    <th className="text-left font-medium px-4 py-2">Value</th>
                    <th className="text-left font-medium px-4 py-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((entry, idx) => {
                    const prev = series[idx + 1];
                    let deltaText = "—";
                    let positive: boolean | null = null;
                    if (!staticValue && prev) {
                      const diff = +(entry.value - prev.value).toFixed(decimals);
                      if (diff !== 0) {
                        const dir = diff < 0 ? "▼" : "▲";
                        positive = lowerIsBetter ? diff < 0 : diff > 0;
                        deltaText = `${dir} ${Math.abs(diff).toFixed(decimals)}${unit ? " " + unit : ""}`;
                      }
                    }
                    return (
                      <tr key={entry.date + idx} className="border-t">
                        <td className="px-4 py-2 text-foreground whitespace-nowrap">{entry.date}</td>
                        <td className="px-4 py-2 text-foreground tabular-nums whitespace-nowrap">
                          {fmt(entry.value)}{unit ? ` ${unit}` : ""}
                        </td>
                        <td className={cn(
                          "px-4 py-2 tabular-nums whitespace-nowrap",
                          positive === true && ImprovedColor,
                          positive === false && WorsenedColor,
                          positive === null && "text-muted-foreground",
                        )}>
                          {deltaText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
