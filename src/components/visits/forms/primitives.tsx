// Shared form UI primitives for clinical workspace surfaces (consultation, visit
// intake). Extracted verbatim from ConsultationWorkspacePage so both surfaces
// share one implementation.
import { type ReactNode } from "react";

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-white rounded-[8px] animate-fade-in flex flex-col gap-3"
      style={{ border: "1px solid #E7DCCD", padding: "12px" }}
    >
      {children}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  size?: "md" | "sm";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        "w-full bg-transparent outline-none py-1 placeholder:text-[#C9BBA9] " +
        (size === "md"
          ? "text-[14px] text-[#1F1611]"
          : "text-[12px] text-[#6E5A48]")
      }
      style={{ borderBottom: "1px solid #E7DCCD" }}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent outline-none text-[12px] text-[#6E5A48] py-1 appearance-none cursor-pointer"
      style={{
        borderBottom: "1px solid #E7DCCD",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239B8775' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 2px center",
        paddingRight: 16,
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent outline-none text-[12px] text-[#6E5A48] py-1"
      style={{ borderBottom: "1px solid #E7DCCD" }}
    />
  );
}

export function ChipSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className="rounded-full text-[11px] font-medium"
            style={{
              padding: "3px 8px",
              background: active ? "#2E1F14" : "#F5F0EA",
              color: active ? "#FFFFFF" : "#9B8775",
              border: active ? "1px solid #2E1F14" : "1px solid #E7DCCD",
              transition:
                "background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-7 px-3 rounded-[6px] text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{ background: "#2E1F14" }}
    >
      {children}
    </button>
  );
}

export function CancelLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] text-[#9B8775] hover:text-[#2E1F14] transition-colors"
    >
      Cancel
    </button>
  );
}
