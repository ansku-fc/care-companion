import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

// Sub-rows shown under "Peripheral circulation" when the parent is ON.
// Each sub-row is a labeled inline notes/measurement input — no toggle.
const PERIPHERAL_SUBS: { key: keyof ExamFindings; label: string }[] = [
  { key: "peripheral_adp", label: "ADP" },
  { key: "peripheral_atp", label: "ATP" },
  { key: "peripheral_afem", label: "AFEM" },
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
            <div key={f.key} className="space-y-2">
              <FindingRow
                label={f.label}
                finding={form.exam_findings[f.key]}
                onChange={(p) => updateFinding(f.key, p)}
              />
              {f.key === "peripheral_circulation" && form.exam_findings.peripheral_circulation.present && (
                <div className="ml-4 space-y-1.5 border-l-2 border-border/60 pl-3">
                  {PERIPHERAL_SUBS.map((sub) => (
                    <div
                      key={sub.key}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/30 px-3 py-2"
                    >
                      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                        {sub.label}
                      </span>
                      <Input
                        value={form.exam_findings[sub.key].notes}
                        onChange={(e) =>
                          updateFinding(sub.key, { present: true, notes: e.target.value })
                        }
                        placeholder="Findings / measurements…"
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
      </div>
    </div>
  );
}

function FindingRow({
  label,
  finding,
  onChange,
  compact,
}: {
  label: string;
  finding: ExamFinding;
  onChange: (p: Partial<ExamFinding>) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/40", compact ? "px-3 py-2" : "px-4 py-3")}>
      <div className="flex items-center justify-between gap-4">
        <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>{label}</span>
        <Switch checked={finding.present} onCheckedChange={(v) => onChange({ present: v })} />
      </div>
      <div
        className={cn(
          "grid transition-all duration-200",
          finding.present ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden pl-3 border-l-2 border-border/60">
          <Textarea
            value={finding.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Add details…"
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
    </div>
  );
}
