import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useOnboardingForm, type OnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";
import { yearOptions } from "@/lib/onboardingTaxonomy";

type ScreeningRow = {
  label: string;
  toggleKey: keyof OnboardingForm;
  yearKey: keyof OnboardingForm;
  /** If set, the row is only applicable to patients of this biological sex. */
  applicableTo?: "male" | "female";
};

const SCREENINGS: ScreeningRow[] = [
  { label: "Breast", toggleKey: "screen_breast", yearKey: "screen_breast_year", applicableTo: "female" },
  { label: "Cervix", toggleKey: "screen_cervix", yearKey: "screen_cervix_year", applicableTo: "female" },
  { label: "Colorectum", toggleKey: "screen_colorectum", yearKey: "screen_colorectum_year" },
  { label: "Prostate", toggleKey: "screen_prostate", yearKey: "screen_prostate_year", applicableTo: "male" },
  { label: "Skin (dermatoscopy)", toggleKey: "screen_skin", yearKey: "screen_skin_year" },
  { label: "Lung (low-dose CT)", toggleKey: "screen_lung", yearKey: "screen_lung_year" },
];

const PRECANCERS: ScreeningRow[] = [
  { label: "Skin (actinic keratosis / dysplastic nevus)", toggleKey: "precancer_skin", yearKey: "precancer_skin_year" },
  { label: "Cervix (CIN)", toggleKey: "precancer_cervix", yearKey: "precancer_cervix_year", applicableTo: "female" },
  { label: "Colorectum (polyps)", toggleKey: "precancer_colorectum", yearKey: "precancer_colorectum_year" },
];

/** Step 9 — Cancer Risks: screenings, precancerous changes, sun protection. */
export function StepCancer() {
  const { form, set, patientGender } = useOnboardingForm();
  const years = yearOptions(80);
  const gender = (patientGender || "").toLowerCase();

  const isDisabled = (row: ScreeningRow) =>
    Boolean(row.applicableTo && gender && row.applicableTo !== gender);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-8">
        <div>
          <SectionHeading>Cancer Risks — Screenings</SectionHeading>
          <div className="mt-4 space-y-2">
            {SCREENINGS.map((s) => (
              <YearToggleRow
                key={s.label}
                label={s.label}
                checked={Boolean(form[s.toggleKey])}
                onToggle={(v) => set(s.toggleKey, v as never)}
                year={form[s.yearKey] as number | null}
                onYearChange={(y) => set(s.yearKey, y as never)}
                years={years}
                yearLabel="Last screened"
                disabled={isDisabled(s)}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionHeading>Precancerous Changes</SectionHeading>
          <div className="mt-4 space-y-2">
            {PRECANCERS.map((p) => (
              <YearToggleRow
                key={p.label}
                label={p.label}
                checked={Boolean(form[p.toggleKey])}
                onToggle={(v) => set(p.toggleKey, v as never)}
                year={form[p.yearKey] as number | null}
                onYearChange={(y) => set(p.yearKey, y as never)}
                years={years}
                yearLabel="Year diagnosed"
                disabled={isDisabled(p)}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionHeading>Sun Protection</SectionHeading>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Regular sun exposure</span>
                <Switch
                  checked={form.sun_exposure}
                  onCheckedChange={(v) => set("sun_exposure", v)}
                />
              </div>
              <div
                className={cn(
                  "grid transition-all duration-200",
                  form.sun_exposure ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden pl-3 border-l-2 border-border/60">
                  <FieldLabel>Protection method</FieldLabel>
                  <Select
                    value={form.sun_protection_method}
                    onValueChange={(v) => set("sun_protection_method", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Sunscreen", "Protective clothing", "Both", "None"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">History of severe sunburns</span>
              <Switch
                checked={form.severe_sunburns_history}
                onCheckedChange={(v) => set("severe_sunburns_history", v)}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function YearToggleRow({
  label,
  checked,
  onToggle,
  year,
  onYearChange,
  years,
  yearLabel,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  year: number | null;
  onYearChange: (y: number | null) => void;
  years: number[];
  yearLabel: string;
  disabled?: boolean;
}) {
  const row = (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/40 px-4 py-3 transition-opacity",
        disabled && "opacity-50 pointer-events-none select-none",
      )}
      aria-disabled={disabled || undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <span
          className={cn(
            "text-sm font-medium",
            disabled ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {label}
          {disabled && (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground no-underline">
              N/A
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {checked && !disabled && (
            <div className="w-32">
              <NumberInput
                value={year}
                onChange={onYearChange}
                placeholder={yearLabel}
                min={1900}
                max={new Date().getFullYear()}
              />
            </div>
          )}
          <Switch checked={checked && !disabled} onCheckedChange={onToggle} disabled={disabled} />
        </div>
      </div>
    </div>
  );

  if (!disabled) return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Wrapper enables hover events even though inner is pointer-events-none */}
        <div className="cursor-not-allowed">{row}</div>
      </TooltipTrigger>
      <TooltipContent>Not applicable for this patient</TooltipContent>
    </Tooltip>
  );
}
