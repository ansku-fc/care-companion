import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useOnboardingForm, type OnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";
import { yearOptions } from "@/lib/onboardingTaxonomy";

const SCREENINGS: {
  label: string;
  toggleKey: keyof OnboardingForm;
  yearKey: keyof OnboardingForm;
}[] = [
  { label: "Breast", toggleKey: "screen_breast", yearKey: "screen_breast_year" },
  { label: "Cervix", toggleKey: "screen_cervix", yearKey: "screen_cervix_year" },
  { label: "Colorectum", toggleKey: "screen_colorectum", yearKey: "screen_colorectum_year" },
  { label: "Prostate", toggleKey: "screen_prostate", yearKey: "screen_prostate_year" },
  { label: "Skin (dermatoscopy)", toggleKey: "screen_skin", yearKey: "screen_skin_year" },
  { label: "Lung (low-dose CT)", toggleKey: "screen_lung", yearKey: "screen_lung_year" },
];

const PRECANCERS: {
  label: string;
  toggleKey: keyof OnboardingForm;
  yearKey: keyof OnboardingForm;
}[] = [
  { label: "Skin (actinic keratosis / dysplastic nevus)", toggleKey: "precancer_skin", yearKey: "precancer_skin_year" },
  { label: "Cervix (CIN)", toggleKey: "precancer_cervix", yearKey: "precancer_cervix_year" },
  { label: "Colorectum (polyps)", toggleKey: "precancer_colorectum", yearKey: "precancer_colorectum_year" },
];

/** Step 9 — Cancer screenings, precancerous changes, sun protection. */
export function StepCancer() {
  const { form, set } = useOnboardingForm();
  const years = yearOptions(80);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Cancer Screenings</SectionHeading>
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
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  year: number | null;
  onYearChange: (y: number | null) => void;
  years: number[];
  yearLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-3">
          {checked && (
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
          <Switch checked={checked} onCheckedChange={onToggle} />
        </div>
      </div>
    </div>
  );
}
