import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useOnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";

/** Step 7 — Sleep. */
export function StepSleep() {
  const { form, set } = useOnboardingForm();

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Sleep Metrics</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Quality of sleep (1–10)</FieldLabel>
            <NumberInput
              value={form.sleep_quality}
              onChange={(v) => set("sleep_quality", v)}
              min={1}
              max={10}
            />
          </div>
          <div>
            <FieldLabel>Daytime fatigue (1–10)</FieldLabel>
            <NumberInput
              value={form.daytime_fatigue}
              onChange={(v) => set("daytime_fatigue", v)}
              min={1}
              max={10}
            />
          </div>
          <div>
            <FieldLabel>Bedtime, avg</FieldLabel>
            <Input
              type="time"
              value={form.sleep_bedtime}
              onChange={(e) => set("sleep_bedtime", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Waking time, avg</FieldLabel>
            <Input
              type="time"
              value={form.sleep_waking_time}
              onChange={(e) => set("sleep_waking_time", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Sleep latency (avg mins)</FieldLabel>
            <NumberInput
              value={form.sleep_latency_mins}
              onChange={(v) => set("sleep_latency_mins", v)}
              min={0}
            />
          </div>
          <div>
            <FieldLabel>Total sleep (avg hrs)</FieldLabel>
            <NumberInput
              value={form.sleep_total_hours}
              onChange={(v) => set("sleep_total_hours", v)}
              min={0}
              step={0.1}
            />
          </div>
          <div>
            <FieldLabel>Deep sleep (avg %)</FieldLabel>
            <NumberInput
              value={form.sleep_deep_percent}
              onChange={(v) => set("sleep_deep_percent", v)}
              min={0}
              max={100}
            />
          </div>
          <div>
            <FieldLabel>Sleep efficiency (%)</FieldLabel>
            <NumberInput
              value={form.sleep_efficiency_percent}
              onChange={(v) => set("sleep_efficiency_percent", v)}
              min={0}
              max={100}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          These fields can later be populated from Oura or wearables export.
        </p>
      </div>

      <div>
        <SectionHeading>Sleep Disorders</SectionHeading>
        <div className="mt-4 space-y-3">
          <DisorderRow
            label="Insomnia"
            checked={form.insomnia}
            onChange={(v) => set("insomnia", v)}
          />
          <DisorderRow
            label="Restless legs"
            checked={form.restless_legs}
            onChange={(v) => set("restless_legs", v)}
          />
          <DisorderRow
            label="Sleep apnea"
            checked={form.sleep_apnea}
            onChange={(v) => set("sleep_apnea", v)}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={form.sleep_apnea_type}
                  onValueChange={(v) => set("sleep_apnea_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Obstructive", "Positional", "Central"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Severity</FieldLabel>
                <Select
                  value={form.sleep_apnea_severity}
                  onValueChange={(v) => set("sleep_apnea_severity", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Mild", "Moderate", "Severe"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DisorderRow>
        </div>
      </div>
    </div>
  );
}

function DisorderRow({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {children && (
        <div
          className={cn(
            "grid transition-all duration-200",
            checked ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden pl-3 border-l-2 border-border/60">{children}</div>
        </div>
      )}
    </div>
  );
}
