// Reusable searchable-select (shadcn command + popover). Used across the visit
// forms for ICD-10 diagnoses, medications, lab markers, and vaccines. Supports
// either a flat `options` list or `groups` of options rendered under headings
// (e.g. "Current medications" above the full catalog).
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type ComboOption = {
  value: string;
  label: string;
  /** What cmdk filters on when the user types (defaults to label). */
  searchText?: string;
  /** Optional muted suffix, e.g. a current medication's dose · frequency. */
  note?: string;
};

export type ComboGroup = { heading: string; options: ComboOption[] };

/** Sort any labelled list alphabetically by display label, case-insensitive.
 *  Applied at each option-build site so searchable dropdowns are predictable
 *  (within groups, preserving group order). */
export function sortByLabel<T extends { label: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

export function Combobox({
  options,
  groups,
  value,
  onSelect,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
}: {
  options?: ComboOption[];
  /** When provided, options render under headings instead of a flat list. */
  groups?: ComboGroup[];
  value: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const renderGroups: ComboGroup[] = groups ?? [{ heading: "", options: options ?? [] }];
  const all = renderGroups.flatMap((g) => g.options);
  const selected = all.find((o) => o.value === value);

  const renderItem = (o: ComboOption) => (
    <CommandItem
      key={o.value}
      // Keep the cmdk filter value unique even when the same med appears in two
      // groups (current + catalog), while still matching the typed query.
      value={`${o.searchText ?? o.label} ::${o.value}`}
      onSelect={() => {
        onSelect(o.value);
        setOpen(false);
      }}
      className="text-[13px]"
    >
      <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{o.label}</span>
      {o.note && <span className="ml-2 shrink-0 text-[11px] text-[#9B8775]">{o.note}</span>}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 bg-transparent outline-none text-[13px] py-1 text-left"
          style={{ borderBottom: "1px solid #E7DCCD" }}
        >
          <span className={cn("truncate", selected ? "text-[#1F1611]" : "text-[#C9BBA9]")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#9B8775]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-[13px]" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {renderGroups.map((g, i) =>
              g.options.length === 0 ? null : (
                <CommandGroup key={g.heading || i} heading={g.heading || undefined}>
                  {g.options.map(renderItem)}
                </CommandGroup>
              ),
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
