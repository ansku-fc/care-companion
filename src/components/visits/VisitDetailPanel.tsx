// The fourth "Detail" column — sits between the left rail and center, mounted
// only when it holds ≥1 item (so closed = zero width, center reclaims space).
// Pure flex sibling: it PUSHES center, never overlays. Hosts a stack of cards —
// lab charts and past-visit summaries intermixed — newest on top, each ✕-able,
// scrolling internally when full. Reuses LabChartCard + VisitSummaryContent;
// reads series/visits passed from the page (shared lab repository + visit data).
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { VISIT_TYPE_META } from "@/lib/episodes";
import { type ClinicalVisit, type PatientBaseline, type DimensionKey } from "@/lib/visits";
import type { LabSeries } from "@/lib/labs";
import { SectionLabel } from "./visitUi";
import { LabChartCard } from "./LabChartCard";
import { DimensionChartCard } from "./DimensionChartCard";
import { VisitSummaryContent } from "./VisitSummaryContent";

export type DetailItem =
  | { id: string; kind: "lab"; markerKey: string }
  | { id: string; kind: "dimension"; dimensionKey: DimensionKey }
  | { id: string; kind: "visit"; visitId: string };

/** Scrolls itself into view when it mounts — the just-opened (top) card. */
function ScrollIntoViewOnMount({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  return <div ref={ref}>{children}</div>;
}

function CardShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="rounded-[8px] flex flex-col" style={{ border: "1px solid #E7DCCD", background: "#FFFDFB" }}>
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B8775] truncate">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] text-[#9B8775] hover:bg-[#F0EBE4] hover:text-[#2E1F14] transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

export function VisitDetailPanel({
  items,
  onClose,
  onCloseAll,
  labs,
  visits,
  baseline,
}: {
  items: DetailItem[];
  onClose: (id: string) => void;
  onCloseAll: () => void;
  labs: LabSeries[];
  visits: ClinicalVisit[];
  baseline: PatientBaseline;
}) {
  return (
    <aside className="w-[320px] xl:w-[360px] shrink-0 flex flex-col" style={{ borderRight: "1px solid #E7DCCD", background: "#F9F7F4" }}>
      <div className="shrink-0 flex items-center justify-between px-4 h-11 bg-white" style={{ borderBottom: "1px solid #E7DCCD" }}>
        <SectionLabel>Detail · {items.length}</SectionLabel>
        <button
          type="button"
          onClick={onCloseAll}
          className="text-[11px] font-medium text-[#6E5A48] hover:text-[#2E1F14] transition-colors"
        >
          Close all
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {items.map((item) => {
          if (item.kind === "lab") {
            const s = labs.find((l) => l.key === item.markerKey);
            if (!s) return null;
            return (
              <ScrollIntoViewOnMount key={item.id}>
                <LabChartCard series={s} onClose={() => onClose(item.id)} />
              </ScrollIntoViewOnMount>
            );
          }
          if (item.kind === "dimension") {
            return (
              <ScrollIntoViewOnMount key={item.id}>
                <DimensionChartCard
                  dimensionKey={item.dimensionKey}
                  baseline={baseline}
                  visits={visits}
                  onClose={() => onClose(item.id)}
                />
              </ScrollIntoViewOnMount>
            );
          }
          const v = visits.find((x) => x.id === item.visitId);
          if (!v) return null;
          const title = `${VISIT_TYPE_META[v.reason].label} · ${new Date(v.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
          return (
            <ScrollIntoViewOnMount key={item.id}>
              <CardShell title={title} onClose={() => onClose(item.id)}>
                <VisitSummaryContent visit={v} allVisits={visits} baseline={baseline} compact />
              </CardShell>
            </ScrollIntoViewOnMount>
          );
        })}
      </div>
    </aside>
  );
}
