import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

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
