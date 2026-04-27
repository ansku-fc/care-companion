import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  useOnboardingForm,
  type ExamFinding,
  type ExamFindingKey,
  type ExamFindings,
} from "./OnboardingFormContext";
import { SectionHeading } from "./shared";

const FINDINGS: { key: ExamFindingKey; label: string }[] = [
  { key: "heart", label: "Heart" },
  { key: "peripheral_circulation", label: "Peripheral circulation" },
  { key: "lungs", label: "Lungs" },
  { key: "lymph_nodes", label: "Lymph nodes" },
  { key: "thyroid", label: "Thyroid" },
  { key: "skin_general", label: "Skin (general)" },
  { key: "abdomen", label: "Abdomen" },
  { key: "eyes", label: "Eyes" },
  { key: "ears", label: "Ears" },
  { key: "musculoskeletal", label: "Musculoskeletal" },
];

const PERIPHERAL_SUBS: { key: keyof ExamFindings; label: string }[] = [
  { key: "peripheral_adp", label: "ADP (arteria dorsalis pedis)" },
  { key: "peripheral_atp", label: "ATP (arteria tibialis posterior)" },
  { key: "peripheral_afem", label: "AFEM (arteria femoralis)" },
];

/** Step 10 — Status (Physical Examination). */
export function StepStatus() {
  const { form, set } = useOnboardingForm();

  const updateFinding = (key: keyof ExamFindings, partial: Partial<ExamFinding>) => {
    set("exam_findings", { ...form.exam_findings, [key]: { ...form.exam_findings[key], ...partial } });
  };

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Clinical Findings</SectionHeading>
        <div className="mt-4 space-y-2">
          {FINDINGS.map((f) => (
            <FindingRow
              key={f.key}
              label={f.label}
              finding={form.exam_findings[f.key]}
              onChange={(p) => updateFinding(f.key, p)}
            >
              {f.key === "peripheral_circulation" && form.exam_findings.peripheral_circulation.present && (
                <div className="mt-3 space-y-2 pl-3 border-l-2 border-border/60">
                  {PERIPHERAL_SUBS.map((s) => (
                    <FindingRow
                      key={String(s.key)}
                      label={s.label}
                      finding={form.exam_findings[s.key]}
                      onChange={(p) => updateFinding(s.key, p)}
                      compact
                    />
                  ))}
                </div>
              )}
            </FindingRow>
          ))}
        </div>
      </div>
    </div>
  );
}

function FindingRow({
  label,
  finding,
  onChange,
  children,
  compact,
}: {
  label: string;
  finding: ExamFinding;
  onChange: (p: Partial<ExamFinding>) => void;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/40", compact ? "px-3 py-2" : "px-4 py-3")}>
      <div className="flex items-center justify-between gap-4">
        <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>{label}</span>
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {finding.present && (
            <Input
              value={finding.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Notes…"
              className="h-9"
            />
          )}
          <Switch checked={finding.present} onCheckedChange={(v) => onChange({ present: v })} />
        </div>
      </div>
      {children}
    </div>
  );
}

function MoleCard({
  mole,
  onChange,
  onRemove,
}: {
  mole: MoleEntry;
  onChange: (p: Partial<MoleEntry>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={mole.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-9 max-w-[180px] font-medium"
        />
        <Select value={mole.side} onValueChange={(v) => onChange({ side: v as "front" | "back" })}>
          <SelectTrigger className="h-9 max-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="back">Back</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove mole"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <FieldLabel>Location</FieldLabel>
        <Textarea
          value={mole.location}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="e.g. Upper back, left scapula"
          rows={1}
          className="resize-none min-h-0"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(ABCDE_OPTIONS) as [keyof typeof ABCDE_OPTIONS, string[]][]).map(([key, opts]) => (
          <div key={key}>
            <FieldLabel>{key[0].toUpperCase() + key.slice(1)}</FieldLabel>
            <Select
              value={mole[key]}
              onValueChange={(v) => onChange({ [key]: v } as Partial<MoleEntry>)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {opts.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
