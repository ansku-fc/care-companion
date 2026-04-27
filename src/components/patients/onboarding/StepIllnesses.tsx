import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Plus, X, ChevronDown, ChevronRight, Pencil } from "lucide-react";

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
  // Top-row column widths: Illness · Onset (· Resolved).
  const onsetCol = "col-span-6 md:col-span-3";
  const resolvedCol = "col-span-6 md:col-span-3";
  // Keep Illness column width identical across Current and Previous so the Onset column aligns.
  const illnessCol = "col-span-12 md:col-span-6";

  return (
    <div className="relative rounded-xl border border-input bg-card/50 p-4 space-y-3">
      {/* Remove button — top right, aligned with the Illness label */}
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        aria-label="Remove illness"
        className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      {/* Top row: Illness · Onset · (Resolved) */}
      <div className="grid grid-cols-12 gap-3 items-end pr-9">
        <div className={illnessCol}>
          <FieldLabel>Illness</FieldLabel>
          <IcdPicker
            value={{ code: row.icd_code, name: row.illness_name }}
            onChange={(picked) =>
              onChange({ icd_code: picked.code, illness_name: picked.name })
            }
          />
        </div>

        <div className={onsetCol}>
          <FieldLabel>Onset</FieldLabel>
          <YearSelect
            value={row.onset_year}
            onChange={(y) => onChange({ onset_year: y })}
          />
        </div>

        {showResolved && (
          <div className={resolvedCol}>
            <FieldLabel>Resolved</FieldLabel>
            <YearSelect
              value={row.resolved_year}
              onChange={(y) => onChange({ resolved_year: y })}
            />
          </div>
        )}
      </div>

      {/* Dimensions sit immediately under the illness field for visual grouping */}
      <div className="-mt-1">
        <DimensionChipsRow
          icdCode={row.icd_code}
          dimensions={row.dimensions ?? []}
          confirmed={row.dimensions_confirmed ?? false}
          onChange={(dims, confirmed) =>
            onChange({ dimensions: dims, dimensions_confirmed: confirmed })
          }
        />
      </div>

      {/* Medications: list of nested rows + small Add button below */}
      <div>
        <FieldLabel>Medications</FieldLabel>
        <MedicationsEditor
          medications={row.medications}
          onChange={(meds) => onChange({ medications: meds })}
          icdCode={row.icd_code}
        />
      </div>

      <div className="flex flex-col items-start min-w-0">
        <NotePopover
          value={row.notes}
          onChange={(v) => onChange({ notes: v })}
        />
        {row.notes && row.notes.trim().length > 0 && (
          <p
            className="text-xs text-muted-foreground mt-0.5 ml-2 max-w-full line-clamp-2"
            title={row.notes}
          >
            {row.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function NotePopover({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const hasNote = !!(value && value.trim().length > 0);

  useEffect(() => {
    if (open) setDraft(value ?? "");
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {hasNote ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Edit note"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add note
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3 space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          className="min-h-[100px]"
          autoFocus
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
        {hasNote && (
          <div className="pt-2 border-t border-border flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                onChange("");
                setDraft("");
                setOpen(false);
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete note
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
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

/* ---------- Medications editor (expandable per-med details) ---------- */

function blankMedication(name: string, atc?: string): MedicationDetail {
  return {
    name,
    atc: atc || undefined,
    dose: "",
    frequency: "",
    route: "",
    start_year: null,
    notes: "",
  };
}

function MedicationsEditor({
  medications,
  onChange,
  icdCode,
  layout = "full",
  expandedIdx: controlledIdx,
  onExpandedIdxChange,
}: {
  medications: MedicationDetail[];
  onChange: (next: MedicationDetail[]) => void;
  icdCode: string;
  /** "trigger" → only the Add button. "list" → only the chip list. "full" → both. */
  layout?: "full" | "trigger" | "list";
  expandedIdx?: number | null;
  onExpandedIdxChange?: (idx: number | null) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uncontrolledIdx, setUncontrolledIdx] = useState<number | null>(null);
  const expandedIdx = controlledIdx !== undefined ? controlledIdx : uncontrolledIdx;
  const setExpandedIdx = (v: number | null) => {
    if (onExpandedIdxChange) onExpandedIdxChange(v);
    else setUncontrolledIdx(v);
  };

  const selectedNames = useMemo(
    () => new Set(medications.map((m) => m.name.toLowerCase())),
    [medications],
  );
  const suggestedNames = useMemo(() => getSuggestedMedications(icdCode), [icdCode]);

  const addMed = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedNames.has(trimmed.toLowerCase())) return;
    const meta = findMedication(trimmed);
    const next = [...medications, blankMedication(trimmed, meta?.atc)];
    onChange(next);
    setQuery("");
    setExpandedIdx(next.length - 1);
    setPickerOpen(false);
  };

  const removeAt = (idx: number) => {
    onChange(medications.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateAt = (idx: number, patch: Partial<MedicationDetail>) => {
    onChange(medications.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const filteredFull = MEDICATION_LIST.filter((m) => {
    if (selectedNames.has(m.name.toLowerCase())) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.atc || "").toLowerCase().includes(q);
  });
  const filteredSuggested = suggestedNames
    .filter((n) => !selectedNames.has(n.toLowerCase()))
    .map((n) => {
      const meta = findMedication(n);
      return { name: n, atc: meta?.atc ?? "" };
    });

  const showList = layout !== "trigger";
  const showTrigger = layout !== "list";

  return (
    <div className="space-y-2">
      {showList && medications.length > 0 && (
        <div className="space-y-2">
          {medications.map((med, idx) => {
            const isOpen = expandedIdx === idx;
            return (
              <div
                key={`${med.name}-${idx}`}
                className="rounded-lg border border-[hsl(var(--border))] bg-[#F8F8FB] dark:bg-muted/30"
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isOpen ? null : idx)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isOpen ? null : idx)}
                    className="flex flex-1 min-w-0 items-baseline gap-3 text-left text-sm hover:text-foreground"
                  >
                    {med.atc && (
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-16">
                        {med.atc}
                      </span>
                    )}
                    <span className="font-medium shrink-0">{med.name}</span>
                    {med.dose && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {med.dose}
                      </span>
                    )}
                    {med.frequency && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {frequencyLabel(med.frequency)}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(idx)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label={`Remove ${med.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t px-3 py-3 grid grid-cols-12 gap-2">
                    <div className="col-span-6 md:col-span-3">
                      <FieldLabel>Dose</FieldLabel>
                      <Input
                        value={med.dose}
                        onChange={(e) => updateAt(idx, { dose: e.target.value })}
                        placeholder="e.g. 50 mg"
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <FieldLabel>Frequency</FieldLabel>
                      <Select
                        value={med.frequency || "_none"}
                        onValueChange={(v) =>
                          updateAt(idx, { frequency: v === "_none" ? "" : (v as MedicationFrequency) })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">—</SelectItem>
                          {FREQUENCY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <FieldLabel>Route</FieldLabel>
                      <Select
                        value={med.route || "_none"}
                        onValueChange={(v) =>
                          updateAt(idx, { route: v === "_none" ? "" : (v as MedicationRoute) })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">—</SelectItem>
                          {ROUTE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <FieldLabel>Start year</FieldLabel>
                      <YearSelect
                        value={med.start_year}
                        onChange={(y) => updateAt(idx, { start_year: y })}
                      />
                    </div>
                    <div className="col-span-12">
                      <FieldLabel>Notes</FieldLabel>
                      <Input
                        value={med.notes}
                        onChange={(e) => updateAt(idx, { notes: e.target.value })}
                        placeholder="Additional instructions…"
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showTrigger && (
      <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 -ml-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add medication
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[360px]"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search medication…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList
              className="max-h-72 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              <CommandEmpty>
                {query.trim() ? (
                  <button
                    type="button"
                    onClick={() => addMed(query)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    Add "{query.trim()}"
                  </button>
                ) : (
                  "No matches."
                )}
              </CommandEmpty>
              {filteredSuggested.length > 0 && (
                <>
                  <CommandGroup heading="Commonly used">
                    {filteredSuggested.map((m) => (
                      <CommandItem
                        key={`s-${m.name}`}
                        value={`s-${m.name}`}
                        onSelect={() => addMed(m.name)}
                      >
                        {m.atc && (
                          <span className="font-mono text-[10px] text-muted-foreground mr-2 w-16 shrink-0">
                            {m.atc}
                          </span>
                        )}
                        <span className="truncate">{m.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              <CommandGroup heading="All medications">
                {filteredFull.map((m) => (
                  <CommandItem
                    key={m.name}
                    value={m.name}
                    onSelect={() => addMed(m.name)}
                  >
                    {m.atc && (
                      <span className="font-mono text-[10px] text-muted-foreground mr-2 w-16 shrink-0">
                        {m.atc}
                      </span>
                    )}
                    <span className="truncate">{m.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {query.trim() && !MEDICATION_LIST.some((m) => m.name.toLowerCase() === query.trim().toLowerCase()) && (
                <CommandGroup heading="Custom">
                  <CommandItem value={`__add_${query}`} onSelect={() => addMed(query)}>
                    <Plus className="h-3 w-3 mr-2" /> Add "{query.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      )}
    </div>
  );
}
