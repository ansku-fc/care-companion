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

/**
 * Clean solid-fill body silhouettes built directly into the component.
 * Coordinate space: viewBox 0 0 100 220, centered horizontally on x=50.
 *
 * Each path traces the outline starting at the top of the head, down the
 * left side (viewer's left = body's right), across the feet, up the right
 * side, and closes back at the head. No facial or clothing detail.
 */
const SILHOUETTE_PATHS: Record<Sex, Record<Side, string>> = {
  female: {
    // Narrower shoulders, defined waist, wider hips. Slightly rounded head
    // suggesting hair contour at the crown.
    front:
      "M50 4 " +
      "C42 4 36 9 36 17 " + // left side of head
      "C36 22 38 25 40 27 " + // jaw
      "L40 30 " + // neck left
      "C36 31 33 33 30 35 " + // shoulder slope (narrow)
      "C26 37 22 42 21 50 " + // upper arm out
      "C20 60 20 72 22 86 " + // arm down
      "C23 96 25 104 26 110 " + // forearm
      "C26 114 25 117 24 119 " + // wrist/hand
      "L20 119 " +
      "C19 119 19 117 19 115 " + // hand tip
      "C18 109 17 100 16 88 " +
      "C15 74 15 60 17 50 " +
      "C18 42 19 36 22 32 " + // back of arm
      "L28 32 " +
      "C30 36 30 40 31 46 " + // back into torso
      "C32 54 33 62 33 70 " + // ribcage to waist
      "C32 76 31 80 30 84 " + // waist (narrow)
      "C29 88 30 94 33 100 " + // hip flare
      "C35 106 36 112 36 120 " + // hip
      "C36 130 35 142 35 156 " + // thigh
      "C35 170 36 184 37 198 " +
      "C37 206 37 212 38 216 " + // ankle
      "C38 218 40 219 42 219 " +
      "L48 219 " +
      "C49 219 49 218 49 216 " + // inner leg up
      "C49 200 49 180 49 160 " +
      "C49 140 49 120 50 110 " + // crotch midline
      "C51 120 51 140 51 160 " +
      "C51 180 51 200 51 216 " +
      "C51 218 51 219 52 219 " +
      "L58 219 " +
      "C60 219 62 218 62 216 " +
      "C63 212 63 206 63 198 " +
      "C64 184 65 170 65 156 " +
      "C65 142 64 130 64 120 " +
      "C64 112 65 106 67 100 " + // right hip
      "C70 94 71 88 70 84 " +
      "C69 80 68 76 67 70 " +
      "C67 62 68 54 69 46 " +
      "C70 40 70 36 72 32 " +
      "L78 32 " +
      "C81 36 82 42 83 50 " +
      "C85 60 85 74 84 88 " +
      "C83 100 82 109 81 115 " +
      "C81 117 81 119 80 119 " +
      "L76 119 " +
      "C75 117 74 114 74 110 " +
      "C75 104 77 96 78 86 " +
      "C80 72 80 60 79 50 " +
      "C78 42 74 37 70 35 " +
      "C67 33 64 31 60 30 " +
      "L60 27 " +
      "C62 25 64 22 64 17 " +
      "C64 9 58 4 50 4 Z",

    // Back view — same outer contour. No facial features anyway.
    back:
      "M50 4 " +
      "C42 4 36 9 36 17 " +
      "C36 22 38 25 40 27 " +
      "L40 30 " +
      "C36 31 33 33 30 35 " +
      "C26 37 22 42 21 50 " +
      "C20 60 20 72 22 86 " +
      "C23 96 25 104 26 110 " +
      "C26 114 25 117 24 119 " +
      "L20 119 " +
      "C19 119 19 117 19 115 " +
      "C18 109 17 100 16 88 " +
      "C15 74 15 60 17 50 " +
      "C18 42 19 36 22 32 " +
      "L28 32 " +
      "C30 36 30 40 31 46 " +
      "C32 54 33 62 33 70 " +
      "C32 76 31 80 30 84 " +
      "C29 88 30 94 33 100 " +
      "C35 106 36 112 36 120 " +
      "C36 130 35 142 35 156 " +
      "C35 170 36 184 37 198 " +
      "C37 206 37 212 38 216 " +
      "C38 218 40 219 42 219 " +
      "L48 219 " +
      "C49 219 49 218 49 216 " +
      "C49 200 49 180 49 160 " +
      "C49 140 49 120 50 110 " +
      "C51 120 51 140 51 160 " +
      "C51 180 51 200 51 216 " +
      "C51 218 51 219 52 219 " +
      "L58 219 " +
      "C60 219 62 218 62 216 " +
      "C63 212 63 206 63 198 " +
      "C64 184 65 170 65 156 " +
      "C65 142 64 130 64 120 " +
      "C64 112 65 106 67 100 " +
      "C70 94 71 88 70 84 " +
      "C69 80 68 76 67 70 " +
      "C67 62 68 54 69 46 " +
      "C70 40 70 36 72 32 " +
      "L78 32 " +
      "C81 36 82 42 83 50 " +
      "C85 60 85 74 84 88 " +
      "C83 100 82 109 81 115 " +
      "C81 117 81 119 80 119 " +
      "L76 119 " +
      "C75 117 74 114 74 110 " +
      "C75 104 77 96 78 86 " +
      "C80 72 80 60 79 50 " +
      "C78 42 74 37 70 35 " +
      "C67 33 64 31 60 30 " +
      "L60 27 " +
      "C62 25 64 22 64 17 " +
      "C64 9 58 4 50 4 Z",
  },
  male: {
    // Broader shoulders, straighter waist, narrower hips.
    front:
      "M50 4 " +
      "C43 4 38 9 38 16 " + // head
      "C38 21 40 24 42 26 " +
      "L42 30 " +
      "C38 31 34 33 30 35 " + // neck/shoulder
      "C24 37 18 42 16 50 " + // wide shoulder
      "C14 60 14 74 16 88 " +
      "C17 98 19 106 20 112 " + // arm down
      "C20 116 19 119 18 121 " +
      "L14 121 " +
      "C13 121 13 119 13 117 " +
      "C12 110 11 100 10 88 " +
      "C9 72 10 58 12 48 " +
      "C13 40 15 35 19 32 " +
      "L26 32 " +
      "C28 36 28 40 28 46 " + // torso side
      "C28 56 28 66 28 76 " + // straight waist
      "C28 86 28 96 30 104 " + // pelvis
      "C32 110 33 116 33 122 " +
      "C33 134 33 148 34 162 " + // thigh
      "C34 178 35 192 36 206 " +
      "C36 212 37 216 38 218 " +
      "C39 219 41 219 43 219 " +
      "L48 219 " +
      "C49 219 49 218 49 216 " +
      "C49 200 49 180 49 160 " +
      "C49 140 49 122 50 112 " + // crotch midline
      "C51 122 51 140 51 160 " +
      "C51 180 51 200 51 216 " +
      "C51 218 51 219 52 219 " +
      "L57 219 " +
      "C59 219 61 219 62 218 " +
      "C63 216 64 212 64 206 " +
      "C65 192 66 178 66 162 " +
      "C67 148 67 134 67 122 " +
      "C67 116 68 110 70 104 " +
      "C72 96 72 86 72 76 " +
      "C72 66 72 56 72 46 " +
      "C72 40 72 36 74 32 " +
      "L81 32 " +
      "C85 35 87 40 88 48 " +
      "C90 58 91 72 90 88 " +
      "C89 100 88 110 87 117 " +
      "C87 119 87 121 86 121 " +
      "L82 121 " +
      "C81 119 80 116 80 112 " +
      "C81 106 83 98 84 88 " +
      "C86 74 86 60 84 50 " +
      "C82 42 76 37 70 35 " +
      "C66 33 62 31 58 30 " +
      "L58 26 " +
      "C60 24 62 21 62 16 " +
      "C62 9 57 4 50 4 Z",

    back:
      "M50 4 " +
      "C43 4 38 9 38 16 " +
      "C38 21 40 24 42 26 " +
      "L42 30 " +
      "C38 31 34 33 30 35 " +
      "C24 37 18 42 16 50 " +
      "C14 60 14 74 16 88 " +
      "C17 98 19 106 20 112 " +
      "C20 116 19 119 18 121 " +
      "L14 121 " +
      "C13 121 13 119 13 117 " +
      "C12 110 11 100 10 88 " +
      "C9 72 10 58 12 48 " +
      "C13 40 15 35 19 32 " +
      "L26 32 " +
      "C28 36 28 40 28 46 " +
      "C28 56 28 66 28 76 " +
      "C28 86 28 96 30 104 " +
      "C32 110 33 116 33 122 " +
      "C33 134 33 148 34 162 " +
      "C34 178 35 192 36 206 " +
      "C36 212 37 216 38 218 " +
      "C39 219 41 219 43 219 " +
      "L48 219 " +
      "C49 219 49 218 49 216 " +
      "C49 200 49 180 49 160 " +
      "C49 140 49 122 50 112 " +
      "C51 122 51 140 51 160 " +
      "C51 180 51 200 51 216 " +
      "C51 218 51 219 52 219 " +
      "L57 219 " +
      "C59 219 61 219 62 218 " +
      "C63 216 64 212 64 206 " +
      "C65 192 66 178 66 162 " +
      "C67 148 67 134 67 122 " +
      "C67 116 68 110 70 104 " +
      "C72 96 72 86 72 76 " +
      "C72 66 72 56 72 46 " +
      "C72 40 72 36 74 32 " +
      "L81 32 " +
      "C85 35 87 40 88 48 " +
      "C90 58 91 72 90 88 " +
      "C89 100 88 110 87 117 " +
      "C87 119 87 121 86 121 " +
      "L82 121 " +
      "C81 119 80 116 80 112 " +
      "C81 106 83 98 84 88 " +
      "C86 74 86 60 84 50 " +
      "C82 42 76 37 70 35 " +
      "C66 33 62 31 58 30 " +
      "L58 26 " +
      "C60 24 62 21 62 16 " +
      "C62 9 57 4 50 4 Z",
  },
};

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
              sex={sex}
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
  sex,
  side,
  moles,
  numbering,
  onAdd,
  onPinClick,
}: {
  sex: Sex;
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
  const bodyPath = SILHOUETTE_PATHS[sex][side];

  return (
    <div className="relative mx-auto aspect-[1/2.2] w-full max-w-[260px]">
      <svg
        ref={ref}
        viewBox="0 0 100 220"
        onClick={handleClick}
        className="h-full w-full cursor-crosshair select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Solid lavender silhouette — clinical, no facial detail */}
        <path d={bodyPath} fill="#C4B5E8" />

        {/* Pins */}
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
