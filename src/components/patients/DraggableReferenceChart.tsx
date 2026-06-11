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
      const newScale = {
        min: yMin,
        max: yMax,
        top: plotRect.top,
        bottom: plotRect.bottom,
      };
      yScaleRef.current = newScale;
      setYScale(newScale);
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
          <CartesianGrid strokeDasharray="2 3" stroke="#E8E0D4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9A8D7E" }}
            axisLine={{ stroke: "#D9CFBE" }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9A8D7E" }}
            axisLine={false}
            tickLine={false}
            domain={[yMin, yMax]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9CFBE",
              borderRadius: 6,
              fontSize: 12,
              color: "#2E1F14",
              boxShadow: "0 4px 12px rgba(46,31,20,0.08)",
            }}
            labelStyle={{ color: "#6B5E51", fontSize: 10 }}
          />
          {/* Shaded normal range */}
          {(low != null || high != null) && (
            <ReferenceArea
              y1={low ?? yMin}
              y2={high ?? yMax}
              fill="#0E8A85"
              fillOpacity={0.08}
              ifOverflow="extendDomain"
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2E1F14"
            strokeWidth={1.5}
            dot={(props: any) => {
              const { cx, cy, index } = props;
              if (cx == null || cy == null) return null;
              const isLatest = index === chartData.length - 1;
              return (
                <circle
                  key={`d-${index}`}
                  cx={cx}
                  cy={cy}
                  r={isLatest ? 4.5 : 3}
                  fill={isLatest ? "#B0455F" : "#2E1F14"}
                  stroke="#FFFFFF"
                  strokeWidth={isLatest ? 1.5 : 1}
                />
              );
            }}
            activeDot={{ r: 6, fill: "#B0455F", stroke: "#FFFFFF", strokeWidth: 1.5 }}
          />
          {/* High reference line - draggable */}
          {high != null && (
            <ReferenceLine
              y={high}
              stroke="#0E8A85"
              strokeOpacity={0.6}
              strokeWidth={1.25}
              strokeDasharray="4 3"
              label={{
                value: `High ${high}`,
                position: "right",
                fontSize: 11,
                fill: "#0E8A85",
                fontWeight: 600,
              }}
            />
          )}
          {/* Low reference line - draggable */}
          {low != null && (
            <ReferenceLine
              y={low}
              stroke="#0E8A85"
              strokeOpacity={0.6}
              strokeWidth={1.25}
              strokeDasharray="4 3"
              label={{
                value: `Low ${low}`,
                position: "right",
                fontSize: 11,
                fill: "#0E8A85",
                fontWeight: 600,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Invisible drag handles overlaid on the reference lines */}
      {high != null && yScale && (
        <DragHandle
          value={high}
          scale={yScale}
          containerRef={containerRef}
          color="#0E8A85"
          onMouseDown={handleMouseDown("high")}
          label="Drag to adjust high"
        />
      )}
      {low != null && yScale && (
        <DragHandle
          value={low}
          scale={yScale}
          containerRef={containerRef}
          color="#0E8A85"
          onMouseDown={handleMouseDown("low")}
          label="Drag to adjust low"
        />
      )}

      {(low != null || high != null) && (
        <div className="absolute top-2 left-12 flex items-center gap-2 text-[10px] text-[#6B5E51] bg-white/85 rounded px-2 py-1 border border-[#E8E0D4]">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#0E8A85", opacity: 0.18 }} />
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
