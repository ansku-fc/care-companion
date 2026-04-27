import { useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  blankMole,
  useOnboardingForm,
  type MoleEntry,
} from "./OnboardingFormContext";
import { FieldLabel, SectionHeading } from "./shared";

const ABCDE_OPTIONS = {
  asymmetry: ["Symmetrical", "Asymmetrical"],
  borders: ["Regular", "Irregular", "Notched"],
  color: ["Uniform", "Multi-colored", "Mixed"],
  size: ["<5mm", "5–10mm", ">10mm"],
  change: ["None", "Growing", "Color change", "Shape change"],
  symptoms: ["None", "Itching", "Bleeding", "Crusting"],
} as const;

type Side = "front" | "back";
type Sex = "female" | "male";

/** Heuristic location label from pin coordinates (percent of silhouette). */
function describeLocation(side: Side, x: number, y: number): string {
  const lr = x < 42 ? "right" : x > 58 ? "left" : "midline"; // mirrored: viewer left = body right
  let region = "Torso";
  if (y < 12) region = "Head";
  else if (y < 22) region = "Neck";
  else if (y < 38) region = side === "front" ? "Chest" : "Upper back";
  else if (y < 55) region = side === "front" ? "Abdomen" : "Mid back";
  else if (y < 65) region = side === "front" ? "Pelvis" : "Lower back";
  else if (y < 82) region = "Thigh";
  else region = "Lower leg";

  // Arms (rough)
  if (y > 22 && y < 60 && (x < 22 || x > 78)) region = "Arm";
  if (y > 55 && y < 70 && (x < 18 || x > 82)) region = "Forearm";

  if (region === "Head" || region === "Neck") return `${region} (${side})`;
  return `${region} (${lr}) — ${side}`;
}

/** Step 11 — Moles (two-panel layout). */
export function StepMoles() {
  const { form, set, patientGender } = useOnboardingForm();
  const sex: Sex = (patientGender || "").toLowerCase() === "male" ? "male" : "female";
  const [side, setSide] = useState<Side>("front");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const update = (id: string, partial: Partial<MoleEntry>) => {
    set("moles", form.moles.map((m) => (m.id === id ? { ...m, ...partial } : m)));
  };
  const remove = (id: string) => {
    set("moles", form.moles.filter((m) => m.id !== id));
  };

  const visibleMoles = form.moles;

  const addAtPin = (x: number, y: number) => {
    const idx = form.moles.length + 1;
    const next = blankMole(`Mole ${idx}`, {
      side,
      pin_x: x,
      pin_y: y,
      location: describeLocation(side, x, y),
    });
    set("moles", [...form.moles.map((m) => ({ ...m, expanded: false })), next]);
    requestAnimationFrame(() => focusCard(next.id));
  };

  const addManually = () => {
    const idx = form.moles.length + 1;
    const next = blankMole(`Mole ${idx}`, { side });
    set("moles", [...form.moles.map((m) => ({ ...m, expanded: false })), next]);
    requestAnimationFrame(() => focusCard(next.id));
  };

  const focusCard = (id: string) => {
    setHighlightId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
  };

  const onPinClick = (id: string) => {
    const mole = form.moles.find((m) => m.id === id);
    if (!mole) return;
    if (mole.side !== side) setSide(mole.side);
    // Expand the targeted card and collapse others.
    set(
      "moles",
      form.moles.map((m) => ({ ...m, expanded: m.id === id })),
    );
    requestAnimationFrame(() => focusCard(id));
  };

  // Number pins across both sides combined for stable identity.
  const numbering = useMemo(() => {
    const map: Record<string, number> = {};
    form.moles.forEach((m, i) => {
      map[m.id] = i + 1;
    });
    return map;
  }, [form.moles]);

  return (
    <div className="space-y-4">
      <SectionHeading>Moles</SectionHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        {/* LEFT PANEL — body silhouette */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="mb-3 flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
              {(["front", "back"] as Side[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    side === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <BodySilhouette
              side={side}
              moles={visibleMoles}
              numbering={numbering}
              onAdd={addAtPin}
              onPinClick={onPinClick}
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Click anywhere on the body to add a mole. Click a pin to edit it.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL — mole cards (scrollable) */}
        <div className="flex min-h-0 flex-col">
          <ScrollArea className="h-[560px] pr-2">
            <div className="space-y-2">
              {visibleMoles.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No moles recorded yet.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click on the body silhouette to start, or add one manually below.
                  </p>
                </div>
              )}
              {visibleMoles.map((mole) => (
                <div
                  key={mole.id}
                  ref={(el) => (cardRefs.current[mole.id] = el)}
                  className={cn(
                    "transition-shadow",
                    highlightId === mole.id && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl",
                  )}
                >
                  {mole.expanded ? (
                    <ExpandedCard
                      number={numbering[mole.id]}
                      mole={mole}
                      onChange={(p) => update(mole.id, p)}
                      onSave={() => update(mole.id, { expanded: false })}
                      onRemove={() => remove(mole.id)}
                    />
                  ) : (
                    <CollapsedCard
                      number={numbering[mole.id]}
                      mole={mole}
                      onEdit={() => {
                        set(
                          "moles",
                          form.moles.map((m) => ({ ...m, expanded: m.id === mole.id })),
                        );
                        requestAnimationFrame(() => focusCard(mole.id));
                      }}
                      onRemove={() => remove(mole.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addManually}
              className="w-full gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add mole manually
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Silhouette ---------------------------------- */

function BodySilhouette({
  side,
  moles,
  numbering,
  onAdd,
  onPinClick,
}: {
  side: Side;
  moles: MoleEntry[];
  numbering: Record<string, number>;
  onAdd: (x: number, y: number) => void;
  onPinClick: (id: string) => void;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Ignore clicks that originated on a pin (they handle themselves).
    if ((e.target as Element).closest("[data-pin]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  const pins = moles.filter((m) => m.side === side && m.pin_x != null && m.pin_y != null);

  return (
    <div className="relative mx-auto aspect-[1/2.2] w-full max-w-[260px]">
      <svg
        ref={ref}
        viewBox="0 0 100 220"
        onClick={handleClick}
        className="h-full w-full cursor-crosshair select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Generic gender-neutral silhouette */}
        <g
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="0.6"
        >
          {/* Head */}
          <ellipse cx="50" cy="14" rx="9" ry="11" />
          {/* Neck */}
          <rect x="46" y="23" width="8" height="6" rx="2" />
          {/* Torso */}
          <path d="M30 32 Q50 28 70 32 L72 90 Q50 96 28 90 Z" />
          {/* Arms */}
          <path d="M30 33 Q20 36 18 60 Q16 86 22 110 L28 110 Q26 84 28 62 Q30 44 34 36 Z" />
          <path d="M70 33 Q80 36 82 60 Q84 86 78 110 L72 110 Q74 84 72 62 Q70 44 66 36 Z" />
          {/* Hands */}
          <ellipse cx="22" cy="115" rx="4.5" ry="6" />
          <ellipse cx="78" cy="115" rx="4.5" ry="6" />
          {/* Legs */}
          <path d="M32 92 Q34 130 36 170 Q37 200 42 215 L48 215 Q47 195 47 170 Q47 130 46 95 Z" />
          <path d="M68 92 Q66 130 64 170 Q63 200 58 215 L52 215 Q53 195 53 170 Q53 130 54 95 Z" />
          {/* Feet */}
          <ellipse cx="44" cy="217" rx="5" ry="3" />
          <ellipse cx="56" cy="217" rx="5" ry="3" />
        </g>

        {/* Subtle back-side hint when viewing back */}
        {side === "back" && (
          <line
            x1="50"
            y1="32"
            x2="50"
            y2="90"
            stroke="hsl(var(--border))"
            strokeWidth="0.4"
            strokeDasharray="1.5 1.5"
          />
        )}

        {/* Pins */}
        {pins.map((m) => (
          <g
            key={m.id}
            data-pin
            transform={`translate(${(m.pin_x! / 100) * 100}, ${(m.pin_y! / 100) * 220})`}
            onClick={(e) => {
              e.stopPropagation();
              onPinClick(m.id);
            }}
            className="cursor-pointer"
          >
            <circle r="3.4" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="0.6" />
            <text
              y="1.2"
              textAnchor="middle"
              fontSize="3.4"
              fontWeight="700"
              fill="hsl(var(--primary-foreground))"
            >
              {numbering[m.id]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* --------------------------------- Cards --------------------------------------- */

function CollapsedCard({
  number,
  mole,
  onEdit,
  onRemove,
}: {
  number: number;
  mole: MoleEntry;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {mole.label}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {mole.location || <span className="italic">No location</span>}
          {" · "}
          <span className="capitalize">{mole.side}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onEdit}
        aria-label="Edit mole"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove mole"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ExpandedCard({
  number,
  mole,
  onChange,
  onSave,
  onRemove,
}: {
  number: number;
  mole: MoleEntry;
  onChange: (p: Partial<MoleEntry>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const files = mole.image_files ?? [];

  const onPickFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = [...files, ...Array.from(list)];
    onChange({ image_files: next });
  };

  const removeFile = (i: number) => {
    const next = files.slice();
    next.splice(i, 1);
    onChange({ image_files: next });
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {number}
        </span>
        <Input
          value={mole.location}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="Location (e.g. Upper back, left scapula)"
          className="h-8 text-sm"
        />
        <Select value={mole.side} onValueChange={(v) => onChange({ side: v as Side })}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="front">Front</SelectItem>
            <SelectItem value="back">Back</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove mole"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.entries(ABCDE_OPTIONS) as [keyof typeof ABCDE_OPTIONS, readonly string[]][]).map(
          ([key, opts]) => (
            <div key={key}>
              <FieldLabel>{key[0].toUpperCase() + key.slice(1)}</FieldLabel>
              <Select
                value={(mole as any)[key]}
                onValueChange={(v) => onChange({ [key]: v } as Partial<MoleEntry>)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {opts.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ),
        )}
      </div>

      <div>
        <FieldLabel>Images</FieldLabel>
        <div className="space-y-2">
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs"
                >
                  <span className="truncate text-foreground">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="Remove image"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload image
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onSave}>
          Save mole
        </Button>
      </div>
    </div>
  );
}
