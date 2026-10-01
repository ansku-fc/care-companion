// A single lab marker's detail card, shown in the Detail panel (relocated from
// the former sidebar LabsPanel — same pieces, new home). Medium view: compact
// LabMiniChart + a visible value list; "Enlarge" opens the full MarkerDetailChart
// in the Dialog (the one sanctioned overlay). Reads a LabSeries from the shared
// lab repository (passed in). Nothing here is rewritten vs. the old panel.
import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import { LabMiniChart } from "./LabMiniChart";
import { MarkerDetailChart } from "@/components/patients/MarkerDetailChart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LabSeries } from "@/lib/labs";

const AMBER_INK = "#A86A1A";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}
function refRangeText(s: LabSeries): string {
  const u = s.unit ? ` ${s.unit}` : "";
  if (s.refLow !== undefined && s.refHigh !== undefined) return `${s.refLow} – ${s.refHigh}${u}`;
  if (s.refHigh !== undefined) return `< ${s.refHigh}${u}`;
  if (s.refLow !== undefined) return `> ${s.refLow}${u}`;
  return "—";
}
function isOut(s: LabSeries, value: number): boolean {
  return (s.refHigh !== undefined && value > s.refHigh) || (s.refLow !== undefined && value < s.refLow);
}

/** Visible data-point list (most-recent-first; out-of-range amber). */
function LabValueList({ series, showUnit = false, className = "" }: { series: LabSeries; showUnit?: boolean; className?: string }) {
  const rows = [...series.points].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className={className}>
      {rows.map((p, i) => (
        <div
          key={p.date}
          className="flex items-baseline justify-between gap-2 py-0.5"
          style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0EBE4" }}
        >
          <span className="text-[#9B8775]">{fmtDate(p.date)}</span>
          <span className="tabular-nums font-medium shrink-0" style={{ color: isOut(series, p.value) ? AMBER_INK : "#2E1F14" }}>
            {p.value}
            {showUnit && series.unit && <span className="ml-0.5 font-normal text-[#9B8775]">{series.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LabChartCard({ series, onClose }: { series: LabSeries; onClose: () => void }) {
  const [enlarged, setEnlarged] = useState(false);
  const sorted = [...series.points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.length ? sorted[sorted.length - 1] : null;
  const refValues =
    series.refLow !== undefined || series.refHigh !== undefined ? { low: series.refLow, high: series.refHigh } : null;

  return (
    <div className="rounded-[8px] p-2.5" style={{ border: "1px solid #E7DCCD", background: "#FFFDFB" }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#2E1F14] truncate">{series.label}</span>
        <div className="flex items-baseline gap-1.5 shrink-0">
          {latest && (
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: isOut(series, latest.value) ? AMBER_INK : "#2E1F14" }}>
              {latest.value}
              {series.unit && <span className="ml-0.5 text-[11px] font-normal text-[#9B8775]">{series.unit}</span>}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${series.label}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] text-[#9B8775] hover:bg-[#F0EBE4] hover:text-[#2E1F14] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-[#9B8775]">
        <span>Ref: {refRangeText(series)}</span>
        {latest && <span>latest {latest.date}</span>}
      </div>

      <button
        type="button"
        onClick={() => setEnlarged(true)}
        title="Enlarge trend"
        className="mt-1.5 w-full rounded-[6px] hover:bg-[#F0EBE4]/50 transition-colors"
      >
        <LabMiniChart points={series.points} refLow={series.refLow} refHigh={series.refHigh} />
      </button>

      <LabValueList series={series} className="mt-1.5 text-[11px]" />

      <button
        type="button"
        onClick={() => setEnlarged(true)}
        className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
      >
        <Maximize2 className="h-3 w-3" /> Enlarge
      </button>

      {/* Full view — dismiss via ✕ / click-outside / Esc. */}
      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {series.label}
              {series.unit ? ` (${series.unit})` : ""} — trend
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <MarkerDetailChart
                label={series.label}
                unit={series.unit}
                chartData={series.points}
                refValues={refValues}
                displayOnly
                showPointLabels
              />
            </div>
            <div className="w-[150px] shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B8775] mb-1">Values</div>
              <LabValueList series={series} showUnit className="text-[12px] max-h-[220px] overflow-y-auto pr-1" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
