// A single dimension's derived-score trend, shown in the Detail panel (same card
// pattern as LabChartCard). The series is derived from visit history via
// dimensionTrend — recomputing the dimension score at each past visit. Reuses the
// lab charts' palette/line treatment for coherence; adds a fixed 1–10 Y domain
// (higher = worse per the taxonomy) and band coloring (low/med/high) via
// scoreColor. Value list below shows date + score, consistent with lab cards.
import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { X } from "lucide-react";
import {
  dimensionLabel,
  dimensionTrend,
  scoreBand,
  type DimensionKey,
  type PatientBaseline,
  type ClinicalVisit,
  type DimensionTrendPoint,
} from "@/lib/visits";
import { scoreColorClass, scoreTone, type ScoreInput } from "@/lib/scoreColor";

// Shared tokens — identical to LabMiniChart.
const ESPRESSO = "#2E1F14";
const HAIR = "#E8E0D4";
const HAIR_STRONG = "#D9CFBE";
const INK_FAINT = "#9A8D7E";

const BAND_HEX: Record<string, string> = {
  green: "#0EA5A0",
  amber: "#C9A227",
  red: "#E8446A",
  muted: "#9B8775",
};
const bandColor = (score: ScoreInput) => BAND_HEX[scoreTone(score)];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtTick(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
}
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function DimensionMiniChart({ points }: { points: DimensionTrendPoint[] }) {
  // Stable ref across re-renders → draw-on animation fires once per open.
  const data = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points]);
  const renderDot = (props: { cx?: number; cy?: number; index?: number; payload?: DimensionTrendPoint }) => {
    const { cx, cy, index, payload } = props;
    if (cx == null || cy == null || payload == null) return <g key={`d-${index}`} />;
    const isLatest = index === data.length - 1;
    return (
      <circle key={`d-${index}`} cx={cx} cy={cy} r={isLatest ? 3.5 : 2.5} fill={bandColor(payload.score)} stroke="#FFFFFF" strokeWidth={1} />
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
          {/* Higher = worse; fix the scale to the full 1–10 band. */}
          <YAxis domain={[1, 10]} hide />
          <Line type="monotone" dataKey="score" stroke={ESPRESSO} strokeWidth={1.5} isAnimationActive animationDuration={500} animationEasing="ease-out" dot={renderDot as never} activeDot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DimensionChartCard({
  dimensionKey,
  baseline,
  visits,
  onClose,
}: {
  dimensionKey: DimensionKey;
  baseline: PatientBaseline;
  visits: ClinicalVisit[];
  onClose: () => void;
}) {
  // Memoized on its stable inputs so note-typing re-renders don't rebuild the
  // series (which would re-trigger the chart's draw-on animation).
  const trend = useMemo(() => dimensionTrend(dimensionKey, baseline, visits), [dimensionKey, baseline, visits]);
  const latest = trend.length ? trend[trend.length - 1] : null;
  const rows = [...trend].sort((a, b) => b.date.localeCompare(a.date)); // most recent first

  return (
    <div className="rounded-[8px] p-2.5" style={{ border: "1px solid #E7DCCD", background: "#FFFDFB" }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#2E1F14] truncate">{dimensionLabel(dimensionKey)}</span>
        <div className="flex items-baseline gap-1.5 shrink-0">
          {latest && (
            <span className="flex items-baseline gap-1">
              <span className={`text-[13px] font-semibold tabular-nums ${scoreColorClass(latest.score)}`}>{latest.score.toFixed(1)}</span>
              <span className={`text-[10px] font-medium ${scoreColorClass(latest.score)}`}>{scoreBand(latest.score)}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${dimensionLabel(dimensionKey)}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] text-[#9B8775] hover:bg-[#F0EBE4] hover:text-[#2E1F14] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-0.5 text-[10px] text-[#9B8775]">Derived score across visits · 1–10, higher = worse</div>

      {trend.length === 0 ? (
        <p className="mt-2 text-[11px] italic text-[#9B8775]">No visit history to derive a trend.</p>
      ) : (
        <>
          <div className="mt-1.5">
            <DimensionMiniChart points={trend} />
          </div>
          <div className="mt-1.5 text-[11px]">
            {rows.map((p, i) => (
              <div
                key={p.date}
                className="flex items-baseline justify-between gap-2 py-0.5"
                style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
              >
                <span className="text-[#9B8775]">{fmtDate(p.date)}</span>
                <span className={`tabular-nums font-medium shrink-0 ${scoreColorClass(p.score)}`}>{p.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
