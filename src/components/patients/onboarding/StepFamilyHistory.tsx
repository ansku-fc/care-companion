import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { FAMILY_RELATIONS, yearOptions } from "@/lib/onboardingTaxonomy";
import { useOnboardingForm, type FamilyHistoryRow } from "./OnboardingFormContext";
import { SectionHeading, FieldLabel, NumberInput } from "./shared";
import { IcdPicker } from "./StepIllnesses";

export function StepFamilyHistory() {
  const { form, addFamilyRow, removeFamilyRow, updateFamilyRow } = useOnboardingForm();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading>Family History</SectionHeading>
        <Button size="sm" variant="outline" onClick={addFamilyRow} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add relative
        </Button>
      </div>

      {form.family_history.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No family history recorded. Add a relative to log hereditary risks.
        </p>
      ) : (
        <div className="space-y-3">
          {form.family_history.map((row) => (
            <FamilyRowEditor
              key={row.id}
              row={row}
              onChange={(updates) => updateFamilyRow(row.id, updates)}
              onDelete={() => removeFamilyRow(row.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FamilyRowEditor({
  row,
  onChange,
  onDelete,
}: {
  row: FamilyHistoryRow;
  onChange: (updates: Partial<FamilyHistoryRow>) => void;
  onDelete: () => void;
}) {
  const years = useMemo(() => yearOptions(100), []);

  return (
    <div className="rounded-xl border border-input bg-card/50 p-4">
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-12 md:col-span-3">
          <FieldLabel>Relative</FieldLabel>
          <Select value={row.relative} onValueChange={(v) => onChange({ relative: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {FAMILY_RELATIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-12 md:col-span-4">
          <FieldLabel>Illness</FieldLabel>
          <IcdPicker
            value={{ code: row.icd_code, name: row.illness_name }}
            onChange={(picked) => onChange({ icd_code: picked.code, illness_name: picked.name })}
          />
        </div>

        <div className="col-span-6 md:col-span-2">
          <FieldLabel>Age at dx</FieldLabel>
          <NumberInput
            value={row.age_at_diagnosis}
            onChange={(v) => onChange({ age_at_diagnosis: v })}
            placeholder="Optional"
          />
        </div>

        <div className="col-span-6 md:col-span-2">
          <FieldLabel>Deceased</FieldLabel>
          <div className={cn("h-11 px-4 flex items-center rounded-xl border border-input bg-background")}>
            <Switch checked={row.deceased} onCheckedChange={(v) => onChange({ deceased: v })} />
          </div>
        </div>

        <div className="col-span-12 md:col-span-1 flex md:justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remove relative"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
