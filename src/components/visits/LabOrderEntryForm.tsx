// Inline lab-order entry for the right rail. The doctor may order ANY test, so
// the marker dropdown is sourced from the full lab catalog (labMarkerCatalog) —
// NOT the patient's existing result series. Multi-select: picking a marker adds
// it to a removable chip list; plus a "Fasting required" toggle and an optional
// note. Confirm commits a PlanLabOrder to the draft. Reuses FormCard/Combobox.
import { useState } from "react";
import { Check, X } from "lucide-react";
import { LAB_MARKERS } from "@/lib/labMarkerCatalog";
import { FormCard, TextField, PrimaryButton, CancelLink, uid } from "@/components/visits/forms";
import { Combobox, type ComboOption, sortByLabel } from "./Combobox";
import { useVisitForm } from "./VisitFormProvider";

type OrderedMarker = { field: string; label: string };

export function LabOrderEntryForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const [markers, setMarkers] = useState<OrderedMarker[]>([]);
  const [fasting, setFasting] = useState(false);
  const [note, setNote] = useState("");

  const options: ComboOption[] = sortByLabel(
    LAB_MARKERS.map((m) => ({
      value: m.field,
      label: m.label,
      searchText: `${m.label} ${m.field}`,
      note: markers.some((x) => x.field === m.field) ? "added" : m.unit,
    })),
  );

  const addMarker = (field: string) => {
    const m = LAB_MARKERS.find((x) => x.field === field);
    if (!m) return;
    setMarkers((prev) => (prev.some((x) => x.field === field) ? prev : [...prev, { field: m.field, label: m.label }]));
  };
  const removeMarker = (field: string) => setMarkers((prev) => prev.filter((x) => x.field !== field));

  const save = () => {
    if (!markers.length) return;
    f.addLabOrder({ id: uid(), markers, fasting, note: note.trim() || undefined });
    onClose();
  };

  return (
    <FormCard onClose={onClose}>
      <div>
        <div className="text-[11px] text-[#9B8775] mb-1">Markers to order</div>
        <Combobox
          options={options}
          value={null}
          onSelect={addMarker}
          placeholder="Add a lab marker…"
          searchPlaceholder="Search the lab catalog…"
        />
        {markers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {markers.map((m) => (
              <span
                key={m.field}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-[#2E1F14]"
                style={{ background: "#F0EBE4" }}
              >
                {m.label}
                <button type="button" onClick={() => removeMarker(m.field)} aria-label={`Remove ${m.label}`} className="text-[#9B8775] hover:text-[#2E1F14]">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fasting required */}
      <button
        type="button"
        onClick={() => setFasting((v) => !v)}
        aria-pressed={fasting}
        className="inline-flex items-center gap-2 text-[12px] text-[#1F1611]"
      >
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-[4px]"
          style={{ border: "1px solid #C9BBA9", background: fasting ? "#2E1F14" : "transparent" }}
        >
          {fasting && <Check className="h-3 w-3 text-white" />}
        </span>
        Fasting required
      </button>

      <TextField value={note} onChange={setNote} placeholder="Note (optional)" size="sm" />

      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton disabled={!markers.length} onClick={save}>Add lab order</PrimaryButton>
      </div>
    </FormCard>
  );
}
