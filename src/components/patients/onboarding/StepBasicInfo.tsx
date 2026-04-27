import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X, Upload, FileText, Image as ImageIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

import {
  COMMON_ALLERGENS,
  ALLERGEN_CATEGORIES,
  ALLERGY_SEVERITIES,
  severityLabel,
  findAllergen,
  type AllergenCategory,
  type AllergySeverity,
} from "@/lib/allergens";
import { OCCUPATIONS, EDUCATION_LEVELS, SUPPLEMENT_LIST } from "@/lib/onboardingTaxonomy";
import { useOnboardingForm, calcBmi, calcWaistHipRatio, type AllergyEntry } from "./OnboardingFormContext";
import { MultiSelectChips, type MultiSelectOption } from "./MultiSelectChips";
import { SectionHeading, FieldLabel, CalculatedField, NumberInput } from "./shared";

const SUPPLEMENT_OPTIONS: MultiSelectOption[] = SUPPLEMENT_LIST.map((s) => ({
  value: s,
  label: s,
}));

export function StepBasicInfo() {
  const { form, set } = useOnboardingForm();
  const bmi = calcBmi(form.height_cm, form.weight_kg);
  const whr = calcWaistHipRatio(form.waist_circumference_cm, form.hip_circumference_cm);

  return (
    <div className="space-y-8">
      {/* BASIC INFORMATION */}
      <section className="space-y-4">
        <SectionHeading>Basic Information</SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Age</FieldLabel>
            <NumberInput value={form.age} onChange={(v) => set("age", v)} placeholder="Years" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <NumberInput value={form.height_cm} onChange={(v) => set("height_cm", v)} />
            </div>
            <div>
              <FieldLabel>Weight (kg)</FieldLabel>
              <NumberInput value={form.weight_kg} onChange={(v) => set("weight_kg", v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Waist (cm)</FieldLabel>
              <NumberInput
                value={form.waist_circumference_cm}
                onChange={(v) => set("waist_circumference_cm", v)}
              />
            </div>
            <div>
              <FieldLabel>Hip (cm)</FieldLabel>
              <NumberInput
                value={form.hip_circumference_cm}
                onChange={(v) => set("hip_circumference_cm", v)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CalculatedField label="BMI" sublabel="calculated" value={bmi != null ? `${bmi}` : "—"} />
            <CalculatedField
              label="Waist-to-Hip Ratio"
              sublabel="calculated"
              value={whr != null ? `${whr}` : "—"}
            />
          </div>

          <div>
            <FieldLabel>Occupation</FieldLabel>
            <Select value={form.occupation} onValueChange={(v) => set("occupation", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {OCCUPATIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Education level</FieldLabel>
            <Select value={form.education_level} onValueChange={(v) => set("education_level", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-input bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium">Shift work</p>
            <p className="text-xs text-muted-foreground">Patient works rotating or night shifts</p>
          </div>
          <Switch checked={form.shift_work} onCheckedChange={(v) => set("shift_work", v)} />
        </div>
      </section>

      {/* DIAGNOSTICS */}
      <section className="space-y-4">
        <SectionHeading>Diagnostics</SectionHeading>

        <div>
          <FieldLabel>Blood pressure (mm/Hg)</FieldLabel>
          <div className="grid grid-cols-2 gap-4">
            <BpPair
              label="1st measurement"
              sys={form.bp1_systolic}
              dia={form.bp1_diastolic}
              onSys={(v) => set("bp1_systolic", v)}
              onDia={(v) => set("bp1_diastolic", v)}
            />
            <BpPair
              label="2nd measurement"
              sys={form.bp2_systolic}
              dia={form.bp2_diastolic}
              onSys={(v) => set("bp2_systolic", v)}
              onDia={(v) => set("bp2_diastolic", v)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>ECG notes</FieldLabel>
          <Textarea
            value={form.ecg_notes}
            onChange={(e) => set("ecg_notes", e.target.value)}
            placeholder="Sinus rhythm, no acute changes…"
            className="min-h-[88px]"
          />
          <EcgFileUploader
            files={form.ecg_files}
            onChange={(files) => set("ecg_files", files)}
          />
        </div>
      </section>

      {/* ALLERGIES & SUPPLEMENTS */}
      <section className="space-y-4">
        <SectionHeading>Allergies &amp; Supplements</SectionHeading>

        <div>
          <FieldLabel>Allergies</FieldLabel>
          <AllergiesPicker
            value={form.allergies}
            onChange={(v) => set("allergies", v)}
          />
        </div>

        <div>
          <FieldLabel>Supplements</FieldLabel>
          <MultiSelectChips
            options={SUPPLEMENT_OPTIONS}
            selected={form.supplements}
            onChange={(v) => set("supplements", v)}
            placeholder="Search supplements…"
            tone="teal"
            allowCustom
          />
        </div>
      </section>
    </div>
  );
}

function BpPair({
  label,
  sys,
  dia,
  onSys,
  onDia,
}: {
  label: string;
  sys: number | null;
  dia: number | null;
  onSys: (v: number | null) => void;
  onDia: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={sys ?? ""}
          onChange={(e) => onSys(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="SYS"
          className="text-center"
        />
        <span className="text-muted-foreground">/</span>
        <Input
          type="number"
          value={dia ?? ""}
          onChange={(e) => onDia(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="DIA"
          className="text-center"
        />
      </div>
    </div>
  );
}

/* ---------- Allergies picker (categorised + per-allergy severity) ---------- */

const SEVERITY_DOT: Record<AllergySeverity, string> = {
  mild: "bg-muted-foreground/40",
  moderate: "bg-amber-500",
  severe: "bg-red-500",
  anaphylactic: "bg-red-600 ring-2 ring-red-300",
};

const SEVERITY_CHIP: Record<AllergySeverity, string> = {
  mild: "border-border bg-muted text-muted-foreground",
  moderate: "border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-900",
  severe: "border-red-200 bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900",
  anaphylactic: "border-red-300 bg-red-100 text-red-900 font-semibold dark:bg-red-900/40 dark:text-red-100 dark:border-red-800",
};

function AllergiesPicker({
  value,
  onChange,
}: {
  value: AllergyEntry[];
  onChange: (next: AllergyEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointer, true);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointer, true);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [open]);

  const grouped = useMemo(() => {
    const map: Record<AllergenCategory, typeof COMMON_ALLERGENS> = {
      Drugs: [],
      Environmental: [],
      Nutritional: [],
    };
    COMMON_ALLERGENS.forEach((a) => map[a.category].push(a));
    return map;
  }, []);

  const selectedNames = new Set(value.map((a) => a.name.toLowerCase()));

  const toggle = (name: string, icd: string | null) => {
    const lower = name.toLowerCase();
    if (selectedNames.has(lower)) {
      onChange(value.filter((a) => a.name.toLowerCase() !== lower));
    } else {
      onChange([...value, { name, icd_code: icd, severity: null }]);
    }
  };

  const setSeverity = (name: string, severity: AllergySeverity | null) => {
    onChange(
      value.map((a) =>
        a.name.toLowerCase() === name.toLowerCase() ? { ...a, severity } : a,
      ),
    );
  };

  const remove = (name: string) =>
    onChange(value.filter((a) => a.name.toLowerCase() !== name.toLowerCase()));

  const addCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (selectedNames.has(trimmed.toLowerCase())) return;
    const known = findAllergen(trimmed);
    onChange([...value, { name: trimmed, icd_code: known?.icd10 ?? null, severity: null }]);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            onClick={() => setOpen((o) => !o)}
            className="w-full h-11 rounded-xl justify-between font-normal text-muted-foreground"
          >
            Search allergens by category…
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          onWheel={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter>
            <CommandInput
              placeholder="Search allergen or ICD code…"
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  return;
                }
                if (e.key === "Enter" && query.trim()) {
                  // Only add custom if no list match exists
                  const hasMatch = COMMON_ALLERGENS.some((a) =>
                    a.name.toLowerCase().includes(query.trim().toLowerCase()),
                  );
                  if (!hasMatch) {
                    e.preventDefault();
                    addCustom();
                  }
                }
              }}
            />
            <CommandList
              className="max-h-72 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              <CommandEmpty>
                {query.trim() ? (
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-muted"
                    onClick={addCustom}
                  >
                    Add “{query.trim()}” as custom allergen
                  </button>
                ) : (
                  "No matches."
                )}
              </CommandEmpty>
              {ALLERGEN_CATEGORIES.map((cat) => (
                <CommandGroup key={cat} heading={cat.toUpperCase()}>
                  {grouped[cat].map((a) => {
                    const isSelected = selectedNames.has(a.name.toLowerCase());
                    return (
                      <CommandItem
                        key={`${cat}-${a.name}`}
                        value={`${a.name} ${a.icd10}`}
                        onSelect={() => toggle(a.name, a.icd10)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                        <span className="mr-2 font-mono text-xs text-muted-foreground">{a.icd10}</span>
                        {a.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((a) => {
            const sev = a.severity;
            return (
              <span
                key={a.name}
                className={cn(
                  "inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs",
                  sev ? SEVERITY_CHIP[sev] : "bg-muted text-foreground border-border",
                )}
              >
                {sev && <span className={cn("h-2 w-2 rounded-full", SEVERITY_DOT[sev])} />}
                {a.icd_code && <span className="font-mono opacity-80">{a.icd_code}</span>}
                <span>{a.name}</span>
                <Select
                  value={sev ?? "_unset"}
                  onValueChange={(v) =>
                    setSeverity(a.name, v === "_unset" ? null : (v as AllergySeverity))
                  }
                >
                  <SelectTrigger className="h-6 w-[120px] text-[11px] px-2 py-0 bg-background/60 border-border/60">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unset">Severity…</SelectItem>
                    {ALLERGY_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {severityLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => remove(a.name)}
                  className="opacity-60 hover:opacity-100"
                  aria-label={`Remove ${a.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- ECG file uploader ---------- */

function EcgFileUploader({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    onChange([...files, ...picked]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="mt-2 space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
        onChange={handleAdd}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="gap-1.5 h-8"
      >
        <Upload className="h-3.5 w-3.5" />
        Attach ECG file
      </Button>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, idx) => {
            const isImg = /\.(jpe?g|png)$/i.test(f.name);
            const Icon = isImg ? ImageIcon : FileText;
            return (
              <span
                key={`${f.name}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground border border-border"
              >
                <Icon className="h-3 w-3" />
                <span className="max-w-[180px] truncate" title={f.name}>{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="opacity-60 hover:opacity-100"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        PDF, JPG, or PNG. Files will appear in Documents & Images under Cardiovascular Health.
      </p>
    </div>
  );
}
