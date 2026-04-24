import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Shared primitives used across onboarding steps. Kept tiny so each step file
 * stays focused on its own field layout.
 */

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
      {children}
    </h3>
  );
}

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {children}
      </Label>
      {hint && <span className="text-[11px] italic text-muted-foreground/80">{hint}</span>}
    </div>
  );
}

export function CalculatedField({
  label,
  sublabel,
  value,
}: {
  label: string;
  sublabel: string;
  value: string;
}) {
  return (
    <div>
      <FieldLabel hint={sublabel}>{label}</FieldLabel>
      <div
        className={cn(
          "h-11 w-full rounded-xl border border-transparent bg-muted/60 px-4 flex items-center text-sm text-foreground/80 pointer-events-none",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const num = Number(raw);
        onChange(Number.isFinite(num) ? num : null);
      }}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
    />
  );
}
