import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FieldLabel, NumberInput, SectionHeading } from "../onboarding/shared";

export type MentalHealthData = {
  stress_perceived: number | null;
  workload_perceived: number | null;
  recovery_perceived: number | null;
  social_support_perceived: number | null;
  gad2_enabled: boolean;
  gad2_q1: number | null;
  gad2_q2: number | null;
  phq2_enabled: boolean;
  phq2_q1: number | null;
  phq2_q2: number | null;
};

export const defaultMentalHealthData: MentalHealthData = {
  stress_perceived: null,
  workload_perceived: null,
  recovery_perceived: null,
  social_support_perceived: null,
  gad2_enabled: false,
  gad2_q1: null,
  gad2_q2: null,
  phq2_enabled: false,
  phq2_q1: null,
  phq2_q2: null,
};

const ANSWER_OPTIONS = [
  { value: "0", label: "0 — Not at all" },
  { value: "1", label: "1 — Several days per week" },
  { value: "2", label: "2 — Over half of the days" },
  { value: "3", label: "3 — Almost every day" },
];

export function MentalHealthPanel({
  value,
  onChange,
}: {
  value: MentalHealthData;
  onChange: (updates: Partial<MentalHealthData>) => void;
}) {
  const gad2Sum = value.gad2_enabled && value.gad2_q1 !== null && value.gad2_q2 !== null ? value.gad2_q1 + value.gad2_q2 : null;
  const phq2Sum = value.phq2_enabled && value.phq2_q1 !== null && value.phq2_q2 !== null ? value.phq2_q1 + value.phq2_q2 : null;

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading>Self-Reported</SectionHeading>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Scale label="Social support (1–10)" sublabel="1 = Very low, 10 = Very high" value={value.social_support_perceived} onChange={(v) => onChange({ social_support_perceived: v })} />
          <Scale label="Recovery (1–10)" value={value.recovery_perceived} onChange={(v) => onChange({ recovery_perceived: v })} />
          <Scale label="Workload (1–10)" value={value.workload_perceived} onChange={(v) => onChange({ workload_perceived: v })} />
          <Scale label="Stress (1–10)" value={value.stress_perceived} onChange={(v) => onChange({ stress_perceived: v })} />
        </div>
      </div>

      <Questionnaire
        title="GAD-2"
        enabled={value.gad2_enabled}
        onToggle={(v) => onChange({ gad2_enabled: v })}
        questions={[
          { label: "I feel anxious, nervous or restless", value: value.gad2_q1, onChange: (v) => onChange({ gad2_q1: v }) },
          { label: "I can't stop worrying", value: value.gad2_q2, onChange: (v) => onChange({ gad2_q2: v }) },
        ]}
        sum={gad2Sum}
        warningLabel="Possible anxiety disorder"
      />

      <Questionnaire
        title="PHQ-2"
        enabled={value.phq2_enabled}
        onToggle={(v) => onChange({ phq2_enabled: v })}
        questions={[
          { label: "I have felt down, depressed or hopeless", value: value.phq2_q1, onChange: (v) => onChange({ phq2_q1: v }) },
          { label: "I have had little interest or pleasure in doing things", value: value.phq2_q2, onChange: (v) => onChange({ phq2_q2: v }) },
        ]}
        sum={phq2Sum}
        warningLabel="Possible depression"
      />
    </div>
  );
}

function Scale({ label, sublabel, value, onChange }: { label: string; sublabel?: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <FieldLabel hint={sublabel}>{label}</FieldLabel>
      <NumberInput value={value} onChange={onChange} min={1} max={10} />
    </div>
  );
}

function Questionnaire({
  title, enabled, onToggle, questions, sum, warningLabel,
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
      <div className={cn("grid transition-all duration-200", enabled ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden space-y-3 pl-3 border-l-2 border-border/60">
          {questions.map((q, i) => (
            <div key={i}>
              <FieldLabel>{q.label}</FieldLabel>
              <Select value={q.value === null ? "" : String(q.value)} onValueChange={(v) => q.onChange(v === "" ? null : Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
