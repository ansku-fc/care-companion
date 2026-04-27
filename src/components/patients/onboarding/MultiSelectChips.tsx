import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChipTone = "neutral" | "teal" | "pink";

export type MultiSelectOption = {
  value: string;
  label: string;
  /** Optional small prefix shown inside the chip (e.g. ICD-10 code). */
  prefix?: string;
};

type Props = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  tone?: ChipTone;
  /** Allow free-text entries that are not in `options`. */
  allowCustom?: boolean;
  /** Values to surface in a "suggested" group above the full list. */
  suggested?: string[];
  /** Heading shown above the suggestions group. */
  suggestedLabel?: string;
};

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: "bg-muted text-foreground border-transparent",
  teal: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-900",
  pink: "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-900/30 dark:text-pink-200 dark:border-pink-900",
};

/**
 * Searchable multi-select that renders selected items as compact chips.
 * Used for allergies, supplements, and per-illness medication picks.
 */
export function MultiSelectChips({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  emptyText = "No matches.",
  tone = "neutral",
  allowCustom = false,
  suggested,
  suggestedLabel = "Suggested",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Robust outside-click + Escape handling. Radix's defaults can be swallowed
  // when nested inside a Dialog with ScrollArea, so we attach our own
  // capture-phase listeners while open.
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

  const optionMap = useMemo(() => {
    const map = new Map<string, MultiSelectOption>();
    options.forEach((o) => map.set(o.value, o));
    return map;
  }, [options]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => onChange(selected.filter((v) => v !== value));

  const handleAddCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
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
            {placeholder}
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
              placeholder="Search…"
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter" && allowCustom && query.trim()) {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
            />
            <CommandList
              className="max-h-72 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              <CommandEmpty>
                {allowCustom && query.trim() ? (
                  <button
                    type="button"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-muted"
                    onClick={handleAddCustom}
                  >
                    Add “{query.trim()}”
                  </button>
                ) : (
                  emptyText
                )}
              </CommandEmpty>
              {suggested && suggested.length > 0 && (
                <>
                  <CommandGroup heading={suggestedLabel}>
                    {suggested
                      .map((s) => optionMap.get(s) ?? { value: s, label: s })
                      .map((opt) => {
                        const isSelected = selected.includes(opt.value);
                        return (
                          <CommandItem
                            key={`suggested-${opt.value}`}
                            value={`__suggested__ ${opt.label} ${opt.prefix ?? ""}`}
                            onSelect={() => toggle(opt.value)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                            {opt.prefix && (
                              <span className="mr-2 font-mono text-xs text-muted-foreground">{opt.prefix}</span>
                            )}
                            {opt.label}
                          </CommandItem>
                        );
                      })}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              <CommandGroup heading={suggested && suggested.length > 0 ? "All medications" : undefined}>
                {options.map((opt) => {
                  const isSelected = selected.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.prefix ?? ""}`}
                      onSelect={() => toggle(opt.value)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                      {opt.prefix && (
                        <span className="mr-2 font-mono text-xs text-muted-foreground">{opt.prefix}</span>
                      )}
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => {
            const opt = optionMap.get(value);
            const label = opt?.label ?? value;
            return (
              <span
                key={value}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs",
                  TONE_CLASSES[tone],
                )}
              >
                {opt?.prefix && <span className="font-mono opacity-80">{opt.prefix}</span>}
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => remove(value)}
                  className="opacity-60 hover:opacity-100"
                  aria-label={`Remove ${label}`}
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
