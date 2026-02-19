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
  const [yScale, setYScale] = useState<{ min: number; max: number; top: number; bottom: number } | null>(null);

  // Keep latest onRefChange in a ref to avoid stale closures
  const onRefChangeRef = useRef(onRefChange);
  onRefChangeRef.current = onRefChange;
  const refValuesRef = useRef(refValues);
  refValuesRef.current = refValues;

  const dataValues = chartData.map((d) => d.value);
  const dataMin = Math.min(...dataValues);
  const dataMax = Math.max(...dataValues);
  const yMin = Math.floor(Math.min(dataMin, refValues?.low ?? dataMin) * 0.85);
  const yMax = Math.ceil(Math.max(dataMax, refValues?.high ?? dataMax) * 1.15);

  const calibrateScale = useCallback(() => {
    if (!containerRef.current) return;
    const plotArea = containerRef.current.querySelector(".recharts-cartesian-grid");
    if (!plotArea) return;
    const plotRect = plotArea.getBoundingClientRect();
    setYScale({ min: yMin, max: yMax, top: plotRect.top, bottom: plotRect.bottom });
  }, [yMin, yMax]);

  // Recalibrate on mount, resize, and data changes
  useEffect(() => {
    const timer = setTimeout(calibrateScale, 150);
    window.addEventListener("resize", calibrateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calibrateScale);
    };
  }, [calibrateScale, chartData, refValues]);

  // Drag logic using window events
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scale = yScale;
      if (!scale || scale.bottom === scale.top) return;
      const ratio = (e.clientY - scale.top) / (scale.bottom - scale.top);
      const val = Math.round((scale.max - ratio * (scale.max - scale.min)) * 10) / 10;
      const rv = refValuesRef.current;

      if (dragging === "high") {
        const low = rv?.low;
        const clamped = low != null ? Math.max(val, low + 0.1) : val;
        onRefChangeRef.current({ high: Math.round(clamped * 10) / 10 });
      } else {
        const high = rv?.high;
        const clamped = high != null ? Math.min(val, high - 0.1) : val;
        onRefChangeRef.current({ low: Math.max(0, Math.round(clamped * 10) / 10) });
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, yScale]);

  const low = refValues?.low;
  const high = refValues?.high;

  // Compute drag handle positions relative to container
  const getHandleTop = (value: number): number | null => {
    if (!yScale || !containerRef.current) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const ratio = (yScale.max - value) / (yScale.max - yScale.min);
    return yScale.top + ratio * (yScale.bottom - yScale.top) - containerRect.top;
  };

  const highTop = high != null ? getHandleTop(high) : null;
  const lowTop = low != null ? getHandleTop(low) : null;

  return (
    <div
      ref={containerRef}
      className="h-[300px] relative select-none"
      style={{ cursor: dragging ? "ns-resize" : undefined }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 55, left: 0, bottom: 10 }}
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
          {(low != null || high != null) && (
            <ReferenceArea
              y1={low ?? yMin}
              y2={high ?? yMax}
              fill="hsl(142 71% 45%)"
              fillOpacity={0.1}
              ifOverflow="extendDomain"
            />
          )}
          {high != null && (
            <ReferenceLine
              y={high}
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `High: ${high}`,
                position: "right",
                fontSize: 11,
                fill: "hsl(var(--destructive))",
                fontWeight: 600,
              }}
            />
          )}
          {low != null && (
            <ReferenceLine
              y={low}
              stroke="hsl(45 93% 47%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `Low: ${low}`,
                position: "right",
                fontSize: 11,
                fill: "hsl(45 93% 47%)",
                fontWeight: 600,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Drag handles */}
      {highTop != null && (
        <div
          className="absolute left-0 right-0"
          style={{ top: highTop - 8, height: 16, cursor: "ns-resize", zIndex: 10 }}
          onMouseDown={(e) => { e.preventDefault(); setDragging("high"); }}
          title="Drag to adjust high reference"
        >
          <div className="absolute left-10 top-1/2 -translate-y-1/2 flex gap-0.5">
            <div className="w-5 h-[2px] rounded bg-destructive" />
            <div className="w-5 h-[2px] rounded bg-destructive translate-y-[3px]" />
          </div>
        </div>
      )}
      {lowTop != null && (
        <div
          className="absolute left-0 right-0"
          style={{ top: lowTop - 8, height: 16, cursor: "ns-resize", zIndex: 10 }}
          onMouseDown={(e) => { e.preventDefault(); setDragging("low"); }}
          title="Drag to adjust low reference"
        >
          <div className="absolute left-10 top-1/2 -translate-y-1/2 flex gap-0.5">
            <div className="w-5 h-[2px] rounded" style={{ backgroundColor: "hsl(45 93% 47%)" }} />
            <div className="w-5 h-[2px] rounded translate-y-[3px]" style={{ backgroundColor: "hsl(45 93% 47%)" }} />
          </div>
        </div>
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
