import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useOnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";

/** Step 4 — Lifestyle: smoking, alcohol, caffeine, nicotine, drugs. */
export function StepLifestyle() {
  const { form, set } = useOnboardingForm();

  return (
    <div className="space-y-8">
      <SectionHeading>Alcohol & Substances</SectionHeading>

      {/* Smoking */}
      <ToggleRow
        label="Smoking"
        checked={form.smoking_current}
        onChange={(v) => set("smoking_current", v)}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Cigarettes per day</FieldLabel>
            <NumberInput
              value={form.smoking_cigs_per_day}
              onChange={(v) => set("smoking_cigs_per_day", v)}
              min={0}
            />
          </div>
          <div>
            <FieldLabel>Years of smoking</FieldLabel>
            <NumberInput
              value={form.smoking_years}
              onChange={(v) => set("smoking_years", v)}
              min={0}
            />
          </div>
        </div>
      </ToggleRow>

      {/* Previously smoked */}
      <ToggleRow
        label="Previously smoked"
        checked={form.smoking_previous}
        onChange={(v) => set("smoking_previous", v)}
      >
        <div className="max-w-xs">
          <FieldLabel>Years smoked</FieldLabel>
          <NumberInput
            value={form.smoking_previous_years}
            onChange={(v) => set("smoking_previous_years", v)}
            min={0}
          />
        </div>
      </ToggleRow>

      {/* Alcohol */}
      <ToggleRow
        label="Alcohol"
        checked={form.alcohol_current}
        onChange={(v) => set("alcohol_current", v)}
      >
        <div className="max-w-xs">
          <FieldLabel>Units per week</FieldLabel>
          <NumberInput
            value={form.alcohol_units_per_week}
            onChange={(v) => set("alcohol_units_per_week", v)}
            min={0}
          />
        </div>
      </ToggleRow>

      {/* Caffeine */}
      <ToggleRow
        label="Caffeine"
        checked={form.caffeine_current}
        onChange={(v) => set("caffeine_current", v)}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Cups per day</FieldLabel>
            <NumberInput
              value={form.caffeine_cups_per_day}
              onChange={(v) => set("caffeine_cups_per_day", v)}
              min={0}
            />
          </div>
          <div>
            <FieldLabel>Last cup at</FieldLabel>
            <Input
              type="time"
              value={form.caffeine_last_cup_time}
              onChange={(e) => set("caffeine_last_cup_time", e.target.value)}
            />
          </div>
        </div>
      </ToggleRow>

      {/* Nicotine pouches */}
      <ToggleRow
        label="Nicotine pouches"
        checked={form.nicotine_pouches_current}
        onChange={(v) => set("nicotine_pouches_current", v)}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Pouches per day</FieldLabel>
            <NumberInput
              value={form.nicotine_pouches_per_day}
              onChange={(v) => set("nicotine_pouches_per_day", v)}
              min={0}
            />
          </div>
          <div>
            <FieldLabel>Strength</FieldLabel>
            <Select
              value={form.nicotine_pouches_strength}
              onValueChange={(v) => set("nicotine_pouches_strength", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strength" />
              </SelectTrigger>
              <SelectContent>
                {["2mg", "4mg", "6mg", "8mg", "10mg", "14mg"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ToggleRow>

      {/* Drugs */}
      <ToggleRow
        label="Drugs"
        checked={form.drugs_current}
        onChange={(v) => set("drugs_current", v)}
      >
        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea
            value={form.drugs_notes}
            onChange={(e) => set("drugs_notes", e.target.value)}
            placeholder="Substance, frequency, route…"
            rows={3}
          />
        </div>
      </ToggleRow>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      <div
        className={cn(
          "grid transition-all duration-200",
          checked ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden pl-3 border-l-2 border-border/60">
          {children}
        </div>
      </div>
    </div>
  );
}
