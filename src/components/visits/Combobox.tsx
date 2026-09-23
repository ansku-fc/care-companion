// Reusable searchable-select (shadcn command + popover). Used across the visit
// drawer forms for ICD-10 diagnoses, medications, and lab markers.
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
};

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
}: {
  options: ComboOption[];
  value: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
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
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.searchText ?? o.label}
                  onSelect={() => {
                    onSelect(o.value);
                    setOpen(false);
                  }}
                  className="text-[13px]"
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === o.value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
