// Small presentational helpers for the visit-intake surface. Mirrors the warm
// palette of the consultation prototype so the two flows feel consistent.
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-[8px] flex flex-col gap-2" style={{ border: "1px solid #E7DCCD", padding: "16px" }}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9B8775]">{children}</div>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-medium text-[#6E5A48] hover:bg-[#F0EBE4] transition-colors h-8 px-3 " +
        className
      }
      style={{ border: "1px solid #E7DCCD" }}
    >
      {children}
    </button>
  );
}

export function AutoTextarea({
  placeholder,
  value,
  onChange,
  minHeight = 72,
}: {
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange?.(e.target.value);
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
      className="w-full resize-none bg-transparent outline-none text-[14px] font-normal text-[#1F1611] placeholder:text-[#C9BBA9] leading-relaxed py-1"
      style={{ minHeight, border: "none" }}
    />
  );
}

/** A removable list row with a hover-reveal delete affordance. */
export function Row({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="group relative py-1.5 pr-6" style={{ borderTop: "0.5px solid #F0EBE4" }}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" style={{ color: "#C9BBA9" }} />
      </button>
    </div>
  );
}

export function FlagToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2">
      <span
        className="relative inline-flex items-center w-8 h-[18px] rounded-full transition-colors duration-150"
        style={{ background: on ? "#E8446A" : "#E7DCCD" }}
      >
        <span
          className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-150"
          style={{ left: on ? "16px" : "2px" }}
        />
      </span>
      <span className="text-[12px] text-[#6E5A48]">Flag for review</span>
    </button>
  );
}
