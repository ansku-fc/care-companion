// Compact lab trend for the sidebar labs mirror (~90px, fits the 280px column).
// Richer than a bare sparkline — minimal dated X-axis and teal reference band —
// using the EXACT MarkerDetailChart palette/line styling so it reads as the same
// chart family (espresso line, blush latest dot, amber out-of-range dots). No
// hover tooltip: exact values are read from the visible value list LabsPanel
// renders below. The Y-axis is omitted to maximise plot width.
import { ResponsiveContainer, LineChart, Line, XAxis, CartesianGrid, ReferenceArea, ReferenceLine } from "recharts";
import type { LabPoint } from "@/lib/labs";

// Shared tokens — identical to MarkerDetailChart.
const ESPRESSO = "#2E1F14";
const BLUSH = "#B0455F";
const TEAL_INK = "#0E8A85";
const AMBER_INK = "#A86A1A";
const HAIR = "#E8E0D4";
const HAIR_STRONG = "#D9CFBE";
const INK_FAINT = "#9A8D7E";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-06-20" → "Jun '25" (compact axis tick). */
function fmtTick(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
}

export function LabMiniChart({
  points,
  refLow,
  refHigh,
}: {
  points: LabPoint[];
  refLow?: number;
  refHigh?: number;
}) {
  const data = [...points].sort((a, b) => a.date.localeCompare(b.date));

  const renderDot = (props: { cx?: number; cy?: number; index?: number; payload?: LabPoint }) => {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null || payload == null) return <g key={`d-${index}`} />;
    const v = payload.value;
    const isLatest = index === data.length - 1;
    const out = (refHigh !== undefined && v > refHigh) || (refLow !== undefined && v < refLow);
    const fill = isLatest ? BLUSH : out ? AMBER_INK : ESPRESSO;
    return (
      <circle
        key={`d-${index}`}
        cx={cx}
        cy={cy}
        r={isLatest ? 3.5 : 2.5}
        fill={fill}
        stroke="#FFFFFF"
        strokeWidth={1}
      />
    );
  };

  return (
    <div className="h-[90px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: 8, bottom: 2 }}>
          <CartesianGrid strokeDasharray="2 3" stroke={HAIR} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtTick}
            tick={{ fontSize: 9, fill: INK_FAINT }}
            axisLine={{ stroke: HAIR_STRONG }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          {(refLow !== undefined || refHigh !== undefined) && (
            <ReferenceArea y1={refLow ?? 0} y2={refHigh ?? 9999} fill={TEAL_INK} fillOpacity={0.08} />
          )}
          {refLow !== undefined && (
            <ReferenceLine y={refLow} stroke={TEAL_INK} strokeOpacity={0.35} strokeDasharray="3 3" />
          )}
          {refHigh !== undefined && (
            <ReferenceLine y={refHigh} stroke={TEAL_INK} strokeOpacity={0.35} strokeDasharray="3 3" />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={ESPRESSO}
            strokeWidth={1.5}
            isAnimationActive={false}
            dot={renderDot as never}
            activeDot={{ r: 4, fill: BLUSH, stroke: "#FFFFFF", strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
