import { useRef, useState, useCallback, useEffect } from "react";
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

interface DraggableReferenceChartProps {
  chartData: { date: string; value: number }[];
  refValues: { low?: number; high?: number } | null;
  onRefChange: (ref: { low?: number; high?: number }) => void;
}

export function DraggableReferenceChart({
  chartData,
  refValues,
  onRefChange,
}: DraggableReferenceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"low" | "high" | null>(null);
  const yScaleRef = useRef<{ min: number; max: number; top: number; bottom: number } | null>(null);

  // Compute Y domain that includes ref values
  const dataValues = chartData.map((d) => d.value);
  const dataMin = Math.min(...dataValues);
  const dataMax = Math.max(...dataValues);
  const yMin = Math.floor(
    Math.min(dataMin, refValues?.low ?? dataMin) * 0.85
  );
  const yMax = Math.ceil(
    Math.max(dataMax, refValues?.high ?? dataMax) * 1.15
  );

  const yToValue = useCallback(
    (clientY: number) => {
      const scale = yScaleRef.current;
      if (!scale) return null;
      const ratio = (clientY - scale.top) / (scale.bottom - scale.top);
      // top = max, bottom = min
      const val = scale.max - ratio * (scale.max - scale.min);
      return Math.round(val * 10) / 10;
    },
    []
  );

  const handleMouseDown = useCallback(
    (which: "low" | "high") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(which);
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const val = yToValue(e.clientY);
      if (val == null) return;
      if (dragging === "high") {
        const low = refValues?.low;
        const clamped = low != null ? Math.max(val, low + 0.1) : val;
        onRefChange({ high: clamped });
      } else {
        const high = refValues?.high;
        const clamped = high != null ? Math.min(val, high - 0.1) : val;
        onRefChange({ low: Math.max(0, clamped) });
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, refValues, onRefChange, yToValue]);

  // Capture the Y axis pixel coordinates after render
  const handleChartUpdate = useCallback(() => {
    if (!containerRef.current) return;
    // Find the recharts y-axis ticks to calibrate
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // The chart area is inside the margins: top=10, bottom=10+60(xaxis)
    // We use the plotArea approach
    const plotArea = svg.querySelector(".recharts-cartesian-grid");
    if (plotArea) {
      const plotRect = plotArea.getBoundingClientRect();
      yScaleRef.current = {
        min: yMin,
        max: yMax,
        top: plotRect.top,
        bottom: plotRect.bottom,
      };
    }
  }, [yMin, yMax]);

  useEffect(() => {
    // Recalculate on resize
    const timer = setTimeout(handleChartUpdate, 100);
    window.addEventListener("resize", handleChartUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleChartUpdate);
    };
  }, [handleChartUpdate, chartData]);

  const low = refValues?.low;
  const high = refValues?.high;

  return (
    <div
      ref={containerRef}
      className="h-[300px] relative select-none"
      style={{ cursor: dragging ? "ns-resize" : undefined }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 50, left: 0, bottom: 10 }}
          onMouseMove={handleChartUpdate}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            domain={[yMin, yMax]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 6 }}
          />
          {/* Shaded normal range */}
          {(low != null || high != null) && (
            <ReferenceArea
              y1={low ?? yMin}
              y2={high ?? yMax}
              fill="hsl(142 71% 45%)"
              fillOpacity={0.1}
              ifOverflow="extendDomain"
            />
          )}
          {/* High reference line - draggable */}
          {high != null && (
            <ReferenceLine
              y={high}
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `▲ High: ${high}`,
                position: "right",
                fontSize: 11,
                fill: "hsl(var(--destructive))",
                fontWeight: 600,
              }}
            />
          )}
          {/* Low reference line - draggable */}
          {low != null && (
            <ReferenceLine
              y={low}
              stroke="hsl(45 93% 47%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `▼ Low: ${low}`,
                position: "right",
                fontSize: 11,
                fill: "hsl(45 93% 47%)",
                fontWeight: 600,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Invisible drag handles overlaid on the reference lines */}
      {high != null && yScaleRef.current && (
        <DragHandle
          value={high}
          scale={yScaleRef.current}
          containerRef={containerRef}
          color="hsl(var(--destructive))"
          onMouseDown={handleMouseDown("high")}
          label="Drag to adjust high"
        />
      )}
      {low != null && yScaleRef.current && (
        <DragHandle
          value={low}
          scale={yScaleRef.current}
          containerRef={containerRef}
          color="hsl(45 93% 47%)"
          onMouseDown={handleMouseDown("low")}
          label="Drag to adjust low"
        />
      )}

      {(low != null || high != null) && (
        <div className="absolute top-2 left-12 flex items-center gap-2 text-[10px] text-muted-foreground bg-background/80 rounded px-2 py-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(142 71% 45%)", opacity: 0.3 }} />
          Normal range — drag lines to adjust
        </div>
      )}
    </div>
  );
}

function DragHandle({
  value,
  scale,
  containerRef,
  color,
  onMouseDown,
  label,
}: {
  value: number;
  scale: { min: number; max: number; top: number; bottom: number };
  containerRef: React.RefObject<HTMLDivElement>;
  color: string;
  onMouseDown: (e: React.MouseEvent) => void;
  label: string;
}) {
  const container = containerRef.current;
  if (!container) return null;

  const containerRect = container.getBoundingClientRect();
  const ratio = (scale.max - value) / (scale.max - scale.min);
  const pixelY = scale.top + ratio * (scale.bottom - scale.top) - containerRect.top;

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center"
      style={{
        top: pixelY - 6,
        height: 12,
        cursor: "ns-resize",
        zIndex: 10,
      }}
      onMouseDown={onMouseDown}
      title={label}
    >
      {/* Wider invisible hit area */}
      <div className="absolute inset-0 opacity-0" />
      {/* Small drag grip indicator on the left */}
      <div
        className="absolute left-8 flex flex-col items-center gap-px"
        style={{ pointerEvents: "none" }}
      >
        <div className="w-4 h-[2px] rounded" style={{ backgroundColor: color }} />
        <div className="w-4 h-[2px] rounded" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}
