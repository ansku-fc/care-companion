import { useRef, useState } from "react";
import { Pencil, Plus, Trash2, X, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  useOnboardingForm,
  blankMole,
  type MoleEntry,
} from "./OnboardingFormContext";
import { FieldLabel, SectionHeading } from "./shared";
import silhouetteFront from "@/assets/silhouette-front.png";
import silhouetteBack from "@/assets/silhouette-back.png";

const ABCDE_OPTIONS = {
  asymmetry: ["Symmetrical", "Asymmetrical"],
  borders: ["Regular", "Irregular", "Notched"],
  color: ["Uniform", "Multi-colored", "Mixed"],
  size: ["<5mm", "5–10mm", ">10mm"],
  change: ["None", "Growing", "Color change", "Shape change"],
  symptoms: ["None", "Itching", "Bleeding", "Crusting"],
};

/**
 * Approximate body region for a (x, y) percentage on the silhouette.
 * Coordinates are 0–100 with origin at top-left.
 *
 * Anatomical left/right: the patient's left is the viewer's right side of the
 * image (mirrored), so x > 50 → patient's left, x < 50 → patient's right.
 */
function regionForPin(side: "front" | "back", x: number, y: number): string {
  // Patient-anatomical lateral side (mirrors viewer perspective).
  const lateral: "left" | "right" | "center" =
    x > 62 ? "left" : x < 38 ? "right" : "center";
  const isOuter = x < 30 || x > 70; // outer third for arms/hands/legs
  const isFarOuter = x < 22 || x > 78; // very outer for arms/hands

  // Head & neck (centerline-dominant, ignore lateral)
  if (y < 10) return "Head";
  if (y < 14) return "Neck";

  // Priority: SHOULDER zone — outer 28% of body width between neck and armpit
  // (y 13–24%). Checked before chest so it always wins in this band.
  // Patient anatomical: viewer-left of image (low x) = patient's right.
  if (y >= 13 && y < 24 && (x < 28 || x > 72)) {
    return x > 72 ? "Shoulder (left)" : "Shoulder (right)";
  }

  // Upper torso band: 14–22% — chest/upper-back occupies the central 44%.
  if (y < 22) {
    return side === "front"
      ? lateral === "center"
        ? "Chest (center)"
        : `Chest (${lateral})`
      : `Upper back${lateral === "center" ? "" : ` (${lateral})`}`;
  }

  // Chest / upper-back band continues to 28%, with arms on the outside.
  if (y < 28) {
    if (isFarOuter) return `Upper arm (${lateral === "center" ? "left" : lateral})`;
    return side === "front"
      ? lateral === "center"
        ? "Chest (center)"
        : `Chest (${lateral})`
      : `Upper back${lateral === "center" ? "" : ` (${lateral})`}`;
  }

  // Abdomen / mid-back, with upper arm continuing on the sides.
  if (y < 38) {
    if (isFarOuter) return `Upper arm (${lateral === "center" ? "left" : lateral})`;
    return side === "front"
      ? "Abdomen"
      : `Mid back${lateral === "center" ? "" : ` (${lateral})`}`;
  }

  // Lower abdomen / lower back transitioning into forearm on the sides.
  if (y < 42) {
    if (isFarOuter) return `Forearm (${lateral === "center" ? "left" : lateral})`;
    return side === "front"
      ? "Abdomen"
      : `Lower back${lateral === "center" ? "" : ` (${lateral})`}`;
  }

  // Groin/hip band.
  if (y < 52) {
    if (isFarOuter) return `Forearm (${lateral === "center" ? "left" : lateral})`;
    if (lateral === "center") return side === "front" ? "Groin" : "Lower back";
    return `Hip (${lateral})`;
  }

  // Hand band on the outer sides; thigh in the middle.
  if (y < 60) {
    if (isFarOuter) return `Hand (${lateral === "center" ? "left" : lateral})`;
    return `Thigh (${lateral === "center" ? "left" : lateral})`;
  }

  // Thigh
  if (y < 68) return `Thigh (${lateral === "center" ? "left" : lateral})`;
  // Knee
  if (y < 74) return `Knee (${lateral === "center" ? "left" : lateral})`;
  // Lower leg
  if (y < 88) return `Lower leg (${lateral === "center" ? "left" : lateral})`;
  // Foot
  return `Foot (${lateral === "center" ? "left" : lateral})`;
}

/** Step 11 — Moles with click-to-place pins on body silhouettes. */
export function StepMoles() {
  const { form, set } = useOnboardingForm();
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const moles = form.moles;

  const updateMole = (id: string, partial: Partial<MoleEntry>) => {
    set(
      "moles",
      moles.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    );
  };

  const removeMole = (id: string) => {
    const next = moles.filter((m) => m.id !== id);
    // Re-number remaining moles so labels stay sequential.
    const renumbered = next.map((m, i) => ({
      ...m,
      label: m.label.startsWith("Mole ") ? `Mole ${i + 1}` : m.label,
    }));
    set("moles", renumbered);
  };

  const addMoleAt = (side: "front" | "back", x: number, y: number) => {
    const nextNumber = moles.length + 1;
    const region = regionForPin(side, x, y);
    const newMole = blankMole(`Mole ${nextNumber}`, {
      side,
      pin_x: x,
      pin_y: y,
      location: region,
    });
    set("moles", [...moles, newMole]);
    // Scroll to new card after render
    setTimeout(() => focusMole(newMole.id), 50);
  };

  const focusMole = (id: string) => {
    setHighlightId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlightId((curr) => (curr === id ? null : curr)), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading>Moles</SectionHeading>
        <p className="mt-1 text-xs text-muted-foreground">
          Click anywhere on the silhouettes to add a mole pin. Each click creates a numbered entry below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <BodySilhouette
          side="front"
          moles={moles}
          onAdd={(x, y) => addMoleAt("front", x, y)}
          onPinClick={focusMole}
        />
        <BodySilhouette
          side="back"
          moles={moles}
          onAdd={(x, y) => addMoleAt("back", x, y)}
          onPinClick={focusMole}
        />
      </div>

      <div className="space-y-3">
        {moles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border">
            No moles added yet. Click on the silhouettes above to begin.
          </p>
        ) : (
          moles.map((mole, idx) => (
            <div
              key={mole.id}
              ref={(el) => {
                cardRefs.current[mole.id] = el;
              }}
              className={cn(
                "transition-all",
                highlightId === mole.id && "ring-2 ring-primary rounded-xl",
              )}
            >
              <MoleCard
                index={idx + 1}
                mole={mole}
                onChange={(p) => updateMole(mole.id, p)}
                onRemove={() => removeMole(mole.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- Silhouette ---------------- */

function BodySilhouette({
  side,
  moles,
  onAdd,
  onPinClick,
}: {
  side: "front" | "back";
  moles: MoleEntry[];
  onAdd: (x: number, y: number) => void;
  onPinClick: (id: string) => void;
}) {
  const sidePins = moles
    .map((m, i) => ({ mole: m, number: i + 1 }))
    .filter((p) => p.mole.side === side);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  const src = side === "front" ? silhouetteFront : silhouetteBack;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 flex flex-col items-center">
      <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        {side === "front" ? "Front" : "Back"}
      </div>
      <div
        onClick={handleClick}
        role="img"
        aria-label={`${side} body silhouette — click to add a mole pin`}
        className="relative w-full max-w-[200px] cursor-crosshair select-none"
        style={{ aspectRatio: "145 / 330" }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
        {sidePins.map(({ mole, number }) => (
          <button
            key={mole.id}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onPinClick(mole.id);
            }}
            aria-label={`Mole ${number}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center shadow-sm ring-2 ring-background hover:scale-110 transition-transform"
            style={{
              left: `${mole.pin_x}%`,
              top: `${mole.pin_y}%`,
              width: 18,
              height: 18,
            }}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Mole card ---------------- */

function MoleCard({
  index,
  mole,
  onChange,
  onRemove,
}: {
  index: number;
  mole: MoleEntry;
  onChange: (p: Partial<MoleEntry>) => void;
  onRemove: () => void;
}) {
  const [editingLocation, setEditingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) => /image\/(jpe?g|png)/i.test(f.type));
    if (accepted.length === 0) return;
    onChange({ image_files: [...(mole.image_files ?? []), ...accepted] });
  };

  const removeImage = (idx: number) => {
    const next = (mole.image_files ?? []).filter((_, i) => i !== idx);
    onChange({ image_files: next });
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
            {index}
          </span>
          {editingLocation ? (
            <Input
              autoFocus
              value={mole.location}
              onChange={(e) => onChange({ location: e.target.value })}
              onBlur={() => setEditingLocation(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingLocation(false);
              }}
              className="h-8 text-sm"
              placeholder="Location label"
            />
          ) : (
            <span className="text-sm font-medium text-foreground truncate">
              {mole.location || "(no location)"}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            · {mole.side}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setEditingLocation((v) => !v)}
          aria-label="Edit location label"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove mole"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(ABCDE_OPTIONS) as [keyof typeof ABCDE_OPTIONS, string[]][]).map(([key, opts]) => (
          <div key={key}>
            <FieldLabel>{key[0].toUpperCase() + key.slice(1)}</FieldLabel>
            <Select
              value={mole[key]}
              onValueChange={(v) => onChange({ [key]: v } as Partial<MoleEntry>)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {opts.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div>
        <FieldLabel>Images</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          {(mole.image_files ?? []).map((f, i) => (
            <ImageThumb key={`${f.name}-${i}`} file={f} onRemove={() => removeImage(i)} />
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ImageThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  // Create preview URL
  if (typeof window !== "undefined" && url === null) {
    try {
      const u = URL.createObjectURL(file);
      setUrl(u);
    } catch {
      // ignore
    }
  }
  return (
    <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-border bg-muted/50">
      {url ? (
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
