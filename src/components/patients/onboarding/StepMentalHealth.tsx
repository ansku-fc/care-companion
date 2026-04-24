import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useOnboardingForm } from "./OnboardingFormContext";
import { FieldLabel, NumberInput, SectionHeading } from "./shared";

const ANSWER_OPTIONS = [
  { value: "0", label: "0 — Not at all" },
  { value: "1", label: "1 — Several days per week" },
  { value: "2", label: "2 — Over half of the days" },
  { value: "3", label: "3 — Almost every day" },
];

/** Step 8 — Mental Health: self-reported scales + GAD-2 / PHQ-2. */
export function StepMentalHealth() {
  const { form, set } = useOnboardingForm();

  const gad2Sum =
    form.gad2_enabled && form.gad2_q1 !== null && form.gad2_q2 !== null
      ? form.gad2_q1 + form.gad2_q2
      : null;
  const phq2Sum =
    form.phq2_enabled && form.phq2_q1 !== null && form.phq2_q2 !== null
      ? form.phq2_q1 + form.phq2_q2
      : null;

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Self-Reported</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Scale
            label="Social support (1–10)"
            sublabel="1 = Very low, 10 = Very high"
            value={form.social_support_perceived}
            onChange={(v) => set("social_support_perceived", v)}
          />
          <Scale
            label="Recovery (1–10)"
            value={form.recovery_perceived}
            onChange={(v) => set("recovery_perceived", v)}
          />
          <Scale
            label="Workload (1–10)"
            value={form.workload_perceived}
            onChange={(v) => set("workload_perceived", v)}
          />
          <Scale
            label="Stress (1–10)"
            value={form.stress_perceived}
            onChange={(v) => set("stress_perceived", v)}
          />
        </div>
      </div>

      <Questionnaire
        title="GAD-2"
        enabled={form.gad2_enabled}
        onToggle={(v) => set("gad2_enabled", v)}
        questions={[
          {
            label: "I feel anxious, nervous or restless",
            value: form.gad2_q1,
            onChange: (v) => set("gad2_q1", v),
          },
          {
            label: "I can't stop worrying",
            value: form.gad2_q2,
            onChange: (v) => set("gad2_q2", v),
          },
        ]}
        sum={gad2Sum}
        warningLabel="Possible anxiety disorder"
      />

      <Questionnaire
        title="PHQ-2"
        enabled={form.phq2_enabled}
        onToggle={(v) => set("phq2_enabled", v)}
        questions={[
          {
            label: "I have felt down, depressed or hopeless",
            value: form.phq2_q1,
            onChange: (v) => set("phq2_q1", v),
          },
          {
            label: "I have had little interest or pleasure in doing things",
            value: form.phq2_q2,
            onChange: (v) => set("phq2_q2", v),
          },
        ]}
        sum={phq2Sum}
        warningLabel="Possible depression"
      />
    </div>
  );
}

function Scale({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <FieldLabel hint={sublabel}>{label}</FieldLabel>
      <NumberInput value={value} onChange={onChange} min={1} max={10} />
    </div>
  );
}

function Questionnaire({
  title,
  enabled,
  onToggle,
  questions,
  sum,
  warningLabel,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  questions: { label: string; value: number | null; onChange: (v: number | null) => void }[];
  sum: number | null;
  warningLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SectionHeading>{title}</SectionHeading>
          {sum !== null && (
            <span className="text-xs font-medium text-foreground">
              Score: <span className="tabular-nums">{sum}</span>
            </span>
          )}
          {sum !== null && sum >= 3 && (
            <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
              {warningLabel}
            </span>
          )}
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      <div
        className={cn(
          "grid transition-all duration-200",
          enabled ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden space-y-3 pl-3 border-l-2 border-border/60">
          {questions.map((q, i) => (
            <div key={i}>
              <FieldLabel>{q.label}</FieldLabel>
              <Select
                value={q.value === null ? "" : String(q.value)}
                onValueChange={(v) => q.onChange(v === "" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ANSWER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
