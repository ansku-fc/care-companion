import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FieldLabel, NumberInput, SectionHeading } from "../onboarding/shared";

export type SleepData = {
  sleep_quality: number | null;
  daytime_fatigue: number | null;
  sleep_total_hours: number | null;
  sleep_latency_mins: number | null;
  insomnia: boolean;
  restless_legs: boolean;
  sleep_apnea: boolean;
  sleep_apnea_type: string;
  sleep_apnea_severity: string;
};

export const defaultSleepData: SleepData = {
  sleep_quality: null,
  daytime_fatigue: null,
  sleep_total_hours: null,
  sleep_latency_mins: null,
  insomnia: false,
  restless_legs: false,
  sleep_apnea: false,
  sleep_apnea_type: "",
  sleep_apnea_severity: "",
};

type Baselines = Partial<Record<keyof SleepData, string | number>>;

export function SleepPanel({
  value,
  onChange,
  baselines,
}: {
  value: SleepData;
  onChange: (updates: Partial<SleepData>) => void;
  baselines?: Baselines;
}) {
  const baseline = (k: keyof SleepData) =>
    baselines?.[k] !== undefined && baselines?.[k] !== null && baselines?.[k] !== "" ? (
      <p className="mt-1 text-[11px] text-muted-foreground">Baseline: {String(baselines[k])} · from onboarding</p>
    ) : null;

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading>Sleep Metrics</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Quality of sleep (1–10)</FieldLabel>
            <NumberInput value={value.sleep_quality} onChange={(v) => onChange({ sleep_quality: v })} min={1} max={10} />
            {baseline("sleep_quality")}
          </div>
          <div>
            <FieldLabel>Daytime fatigue (1–10)</FieldLabel>
            <NumberInput value={value.daytime_fatigue} onChange={(v) => onChange({ daytime_fatigue: v })} min={1} max={10} />
            {baseline("daytime_fatigue")}
          </div>
          <div>
            <FieldLabel>Total sleep (avg hrs)</FieldLabel>
            <NumberInput value={value.sleep_total_hours} onChange={(v) => onChange({ sleep_total_hours: v })} min={0} step={0.1} />
            {baseline("sleep_total_hours")}
          </div>
          <div>
            <FieldLabel>Sleep latency (avg mins)</FieldLabel>
            <NumberInput value={value.sleep_latency_mins} onChange={(v) => onChange({ sleep_latency_mins: v })} min={0} />
            {baseline("sleep_latency_mins")}
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>Sleep Disorders</SectionHeading>
        <div className="mt-4 space-y-3">
          <DisorderRow label="Insomnia" checked={value.insomnia} onChange={(v) => onChange({ insomnia: v })} />
          <DisorderRow label="Restless legs" checked={value.restless_legs} onChange={(v) => onChange({ restless_legs: v })} />
          <DisorderRow label="Sleep apnea" checked={value.sleep_apnea} onChange={(v) => onChange({ sleep_apnea: v })}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select value={value.sleep_apnea_type} onValueChange={(v) => onChange({ sleep_apnea_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["Obstructive", "Positional", "Central"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Severity</FieldLabel>
                <Select value={value.sleep_apnea_severity} onValueChange={(v) => onChange({ sleep_apnea_severity: v })}>
                  <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
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
  label, checked, onChange, children,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {children && (
        <div className={cn("grid transition-all duration-200", checked ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden pl-3 border-l-2 border-border/60">{children}</div>
        </div>
      )}
    </div>
  );
}
