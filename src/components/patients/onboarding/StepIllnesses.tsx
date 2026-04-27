import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Plus, X, ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import {
  ICD10_ILLNESSES,
  ICD_DIMENSIONS,
  MEDICATION_LIST,
  DIMENSION_TAGS,
  findDimensionTag,
  findMedication,
  getSuggestedDimensionsForIcd,
  getSuggestedMedications,
  yearOptions,
  type IcdDimension,
} from "@/lib/onboardingTaxonomy";
import {
  useOnboardingForm,
  type IllnessRow,
  type MedicationDetail,
  type MedicationFrequency,
  type MedicationRoute,
} from "./OnboardingFormContext";
import { MultiSelectChips, type MultiSelectOption } from "./MultiSelectChips";
import { SectionHeading, FieldLabel } from "./shared";

const FREQUENCY_OPTIONS: { value: MedicationFrequency; label: string }[] = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "Three times daily" },
  { value: "as_needed", label: "As needed" },
  { value: "weekly", label: "Weekly" },
  { value: "other", label: "Other" },
];

const ROUTE_OPTIONS: { value: MedicationRoute; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Topical" },
  { value: "inhaled", label: "Inhaled" },
  { value: "injection", label: "Injection" },
  { value: "other", label: "Other" },
];

export function frequencyLabel(v: MedicationFrequency | string | undefined | null): string {
  return FREQUENCY_OPTIONS.find((o) => o.value === v)?.label ?? "";
}
export function routeLabel(v: MedicationRoute | string | undefined | null): string {
  return ROUTE_OPTIONS.find((o) => o.value === v)?.label ?? "";
}

export function StepIllnesses() {
  const { form, addIllness, removeIllness, updateIllness } = useOnboardingForm();

  return (
    <div className="space-y-8">
      <IllnessSection
        title="Current Illnesses & Medications"
        rows={form.current_illnesses}
        onAdd={() => addIllness("current")}
        onRemove={(id) => removeIllness("current", id)}
        onUpdate={(id, updates) => updateIllness("current", id, updates)}
        showResolved={false}
      />
      <IllnessSection
        title="Previous Illnesses & Medications"
        rows={form.previous_illnesses}
        onAdd={() => addIllness("previous")}
        onRemove={(id) => removeIllness("previous", id)}
        onUpdate={(id, updates) => updateIllness("previous", id, updates)}
        showResolved
      />
    </div>
  );
}

function IllnessSection({
  title,
  rows,
  onAdd,
  onRemove,
  onUpdate,
  showResolved,
}: {
  title: string;
  rows: IllnessRow[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<IllnessRow>) => void;
  showResolved: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading>{title}</SectionHeading>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No entries yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <IllnessRowEditor
              key={row.id}
              row={row}
              onChange={(updates) => onUpdate(row.id, updates)}
              onDelete={() => onRemove(row.id)}
              showResolved={showResolved}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function IllnessRowEditor({
  row,
  onChange,
  onDelete,
  showResolved,
}: {
  row: IllnessRow;
  onChange: (updates: Partial<IllnessRow>) => void;
  onDelete: () => void;
  showResolved: boolean;
}) {
  return (
    <div className="rounded-xl border border-input bg-card/50 p-4 space-y-3">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5">
          <FieldLabel>Illness</FieldLabel>
          <IcdPicker
            value={{ code: row.icd_code, name: row.illness_name }}
            onChange={(picked) =>
              onChange({ icd_code: picked.code, illness_name: picked.name })
            }
          />
        </div>

        <div className="col-span-6 md:col-span-2">
          <FieldLabel>Onset</FieldLabel>
          <YearSelect
            value={row.onset_year}
            onChange={(y) => onChange({ onset_year: y })}
          />
        </div>

        {showResolved && (
          <div className="col-span-6 md:col-span-2">
            <FieldLabel>Resolved</FieldLabel>
            <YearSelect
              value={row.resolved_year}
              onChange={(y) => onChange({ resolved_year: y })}
            />
          </div>
        )}

        <div className={cn("col-span-12", showResolved ? "md:col-span-7" : "md:col-span-12")}>
          {/* spacer/placeholder for grid balance — medications below */}
        </div>
      </div>

      <div>
        <FieldLabel>Medications</FieldLabel>
        <MedicationsEditor
          medications={row.medications}
          onChange={(meds) => onChange({ medications: meds })}
          icdCode={row.icd_code}
        />
      </div>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <Textarea
          value={row.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Notes…"
          className="min-h-[80px]"
        />
      </div>

      <DimensionChipsRow
        icdCode={row.icd_code}
        dimensions={row.dimensions ?? []}
        confirmed={row.dimensions_confirmed ?? false}
        onChange={(dims, confirmed) =>
          onChange({ dimensions: dims, dimensions_confirmed: confirmed })
        }
      />

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
    </div>
  );
}

/* ---------- ICD-10 picker ---------- */

export function IcdPicker({
  value,
  onChange,
}: {
  value: { code: string; name: string };
  onChange: (next: { code: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerLabel = value.code
    ? `${value.code} ${value.name}`
    : "Search ICD-10…";

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          onClick={(e) => {
            // Ensure the click only opens THIS popover instance and doesn't
            // bubble up to a sibling section's still-open popover.
            e.stopPropagation();
          }}
          className="w-full h-11 rounded-xl justify-start font-normal text-left truncate"
        >
          {value.code && <span className="font-mono text-xs text-muted-foreground mr-2">{value.code}</span>}
          <span className={cn("truncate", !value.code && "text-muted-foreground")}>
            {value.name || (value.code ? "" : "Search ICD-10…")}
          </span>
          {!value.code && <span className="sr-only">{triggerLabel}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="ICD-10 code or name…" />
          <CommandList
            className="max-h-80 overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No matches.</CommandEmpty>
            {ICD_DIMENSIONS.map((dim) => {
              const items = ICD10_ILLNESSES.filter((i) => i.dimension === dim);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={dim} heading={dim.toUpperCase()}>
                  {items.map((entry) => (
                    <CommandItem
                      key={entry.code}
                      value={`${entry.code} ${entry.name} ${dim}`}
                      onSelect={() => {
                        onChange({ code: entry.code, name: entry.name });
                        setOpen(false);
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-3 w-14 shrink-0">
                        {entry.code}
                      </span>
                      <span className="truncate">{entry.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function YearSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const years = useMemo(() => yearOptions(100), []);
  return (
    <Select
      value={value ? String(value) : "_clear"}
      onValueChange={(v) => onChange(v === "_clear" ? null : Number(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_clear">—</SelectItem>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------- Dimension chips for an illness row ---------- */

/**
 * Renders auto-suggested dimension chips for the illness's ICD code. The
 * doctor reviews them and clicks "Confirm" to lock in. Suggested chips are
 * outlined; confirmed chips are solid. Doctor can remove individual chips,
 * add more from the full 9-dimension list, or re-suggest after the ICD
 * changes.
 */
function DimensionChipsRow({
  icdCode,
  dimensions,
  confirmed,
  onChange,
}: {
  icdCode: string;
  dimensions: string[];
  confirmed: boolean;
  onChange: (dimensions: string[], confirmed: boolean) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const lastIcdRef = useRef<string>(icdCode);

  // When the ICD code changes (and dimensions weren't manually confirmed for
  // a different code), re-seed the suggestions.
  useEffect(() => {
    if (icdCode === lastIcdRef.current) return;
    lastIcdRef.current = icdCode;
    if (!icdCode) {
      onChange([], false);
      return;
    }
    const suggested = getSuggestedDimensionsForIcd(icdCode);
    onChange(suggested, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icdCode]);

  // First render with no stored dimensions but a known ICD: seed once.
  useEffect(() => {
    if (dimensions.length === 0 && !confirmed && icdCode) {
      const suggested = getSuggestedDimensionsForIcd(icdCode);
      if (suggested.length > 0) onChange(suggested, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!icdCode || dimensions.length === 0) {
    if (!icdCode) return null;
    // ICD selected but no suggestions found — still allow manual add.
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">No dimensions suggested.</span>
        <AddDimensionPopover
          open={addOpen}
          onOpenChange={setAddOpen}
          existing={dimensions}
          onAdd={(key) => {
            onChange([...dimensions, key], confirmed);
            setAddOpen(false);
          }}
        />
      </div>
    );
  }

  const removeChip = (key: string) =>
    onChange(dimensions.filter((d) => d !== key), confirmed);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        Health dimensions
      </span>
      {dimensions.map((key) => {
        const tag = findDimensionTag(key);
        if (!tag) return null;
        return (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border",
              confirmed
                ? tag.tone === "pink"
                  ? "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-900"
                  : "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-900"
                : tag.tone === "pink"
                  ? "bg-transparent text-pink-700 border-pink-300 border-dashed dark:text-pink-300 dark:border-pink-700"
                  : "bg-transparent text-teal-700 border-teal-300 border-dashed dark:text-teal-300 dark:border-teal-700",
            )}
          >
            {tag.label}
            <button
              type="button"
              onClick={() => removeChip(key)}
              className="opacity-60 hover:opacity-100"
              aria-label={`Remove ${tag.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <AddDimensionPopover
        open={addOpen}
        onOpenChange={setAddOpen}
        existing={dimensions}
        onAdd={(key) => {
          onChange([...dimensions, key], confirmed);
          setAddOpen(false);
        }}
      />
      {!confirmed && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange(dimensions, true)}
          className="h-6 px-2 text-[11px]"
        >
          Confirm
        </Button>
      )}
    </div>
  );
}

function AddDimensionPopover({
  open,
  onOpenChange,
  existing,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: string[];
  onAdd: (key: string) => void;
}) {
  const remaining = DIMENSION_TAGS.filter((t) => !existing.includes(t.key));
  if (remaining.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1">
          <Plus className="h-3 w-3" />
          Add dimension
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-56">
        <div className="space-y-0.5">
          {remaining.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => onAdd(tag.key)}
              className={cn(
                "w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted",
                tag.tone === "pink"
                  ? "text-pink-700 dark:text-pink-300"
                  : "text-teal-700 dark:text-teal-300",
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
