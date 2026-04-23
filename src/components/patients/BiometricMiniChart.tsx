import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

type Entry = { date: string; value: number };
type RangeKey = "6m" | "1y" | "3y" | "all";

interface Props {
  label: string;
  unit: string;
  decimals: number;
  /** newest-first series including current ("Today") */
  series: Entry[];
}

const RANGE_MS: Record<Exclude<RangeKey, "all">, number> = {
  "6m": 1000 * 60 * 60 * 24 * 30 * 6,
  "1y": 1000 * 60 * 60 * 24 * 365,
  "3y": 1000 * 60 * 60 * 24 * 365 * 3,
};

function parseEntryDate(s: string): number | null {
  if (s === "Today") return Date.now();
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export function BiometricMiniChart({ label, unit, decimals, series }: Props) {
  const [range, setRange] = useState<RangeKey>("all");

  const data = useMemo(() => {
    const reversed = [...series].reverse(); // oldest → newest
    if (range === "all") return reversed;
    const cutoff = Date.now() - RANGE_MS[range];
    return reversed.filter((e) => {
      const t = parseEntryDate(e.date);
      return t == null ? true : t >= cutoff;
    });
  }, [series, range]);

  const RANGES: { key: RangeKey; label: string }[] = [
    { key: "6m", label: "6m" },
    { key: "1y", label: "1y" },
    { key: "3y", label: "3y" },
    { key: "all", label: "All" },
  ];

  const gradId = `bio-mini-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div>
      <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <div className="inline-flex rounded-md border bg-muted/30 p-0.5 shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "px-1.5 py-0.5 text-[10px] rounded-[4px] transition-colors",
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
      <div className="px-2 pt-1 pb-1 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 14, left: 6, bottom: 4 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(270 70% 60%)" />
                <stop offset="100%" stopColor="hsl(180 70% 45%)" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <RTooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 11,
                padding: "4px 8px",
              }}
              formatter={(v: number) => [
                `${(+v).toFixed(decimals)}${unit ? " " + unit : ""}`,
                label,
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={`url(#${gradId})`}
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(270 70% 55%)", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            >
              <LabelList
                dataKey="value"
                position="top"
                offset={8}
                style={{ fontSize: 9, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                formatter={(v: number) => `${(+v).toFixed(decimals)}`}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
