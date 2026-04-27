import { useMemo, useRef, useState } from "react";
import { Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import {
  ICD10_ILLNESSES,
  ICD_DIMENSIONS,
  MEDICATION_LIST,
  DIMENSION_TAGS,
  findDimensionTag,
  getSuggestedMedications,
  yearOptions,
  type IcdDimension,
} from "@/lib/onboardingTaxonomy";
import { useOnboardingForm, type IllnessRow } from "./OnboardingFormContext";
import { MultiSelectChips, type MultiSelectOption } from "./MultiSelectChips";
import { SectionHeading, FieldLabel } from "./shared";

const MED_OPTIONS: MultiSelectOption[] = MEDICATION_LIST.map((m) => ({
  value: m.name,
  label: m.name,
  prefix: m.atc || undefined,
}));

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

        <div className={cn("col-span-12", showResolved ? "md:col-span-3" : "md:col-span-5")}>
          <FieldLabel>Medications</FieldLabel>
          <MultiSelectChips
            options={MED_OPTIONS}
            selected={row.medications}
            onChange={(meds) => onChange({ medications: meds })}
            placeholder="Add medication…"
            tone="neutral"
            allowCustom
            suggested={getSuggestedMedications(row.icd_code)}
            suggestedLabel="Commonly used"
          />
        </div>
      </div>

      <div>
        <FieldLabel hint="type @ to tag a health dimension">Notes</FieldLabel>
        <DimensionTagTextarea
          value={row.notes}
          onChange={(notes) => onChange({ notes })}
        />
      </div>

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

/* ---------- Dimension @-tag aware textarea ---------- */

/**
 * Lightweight @-tag picker for the notes field. Detects when the cursor is
 * actively typing a token after `@` and shows a popover of dimension chips.
 * Selected tags are inserted into the text, and we render colored preview
 * chips below the textarea so the doctor can see what was tagged.
 */
function DimensionTagTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const tagsInText = useMemo(() => {
    const matches = value.match(/@[a-z-]+/gi) ?? [];
    return Array.from(new Set(matches.map((m) => m.toLowerCase())))
      .map((m) => findDimensionTag(m))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    const caret = e.target.selectionStart ?? next.length;
    const upToCaret = next.slice(0, caret);
    const m = upToCaret.match(/@([a-z-]*)$/i);
    if (m) {
      setQuery(m[1].toLowerCase());
      setPickerOpen(true);
    } else {
      setPickerOpen(false);
    }
  };

  const insertTag = (key: string) => {
    const ta = ref.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([a-z-]*)$/i, `@${key} `);
    const after = value.slice(caret);
    const next = before + after;
    onChange(next);
    setPickerOpen(false);
    setQuery("");
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const filteredTags = DIMENSION_TAGS.filter((t) =>
    t.key.includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Popover open={pickerOpen && filteredTags.length > 0} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Textarea
            ref={ref}
            value={value}
            onChange={handleInput}
            placeholder="Notes… type @ to tag a dimension"
            className="min-h-[80px]"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-1 w-64"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="text-[11px] text-muted-foreground px-2 py-1">Tag a health dimension</div>
          <div className="space-y-0.5">
            {filteredTags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertTag(tag.key)}
                className={cn(
                  "w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted",
                  tag.tone === "pink" ? "text-pink-700 dark:text-pink-300" : "text-teal-700 dark:text-teal-300",
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {tagsInText.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tagsInText.map((tag) => (
            <span
              key={tag.key}
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px]",
                tag.tone === "pink"
                  ? "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-900"
                  : "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-900",
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
