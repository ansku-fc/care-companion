// Inline measurement entry — relocated verbatim from the retired VisitDrawer.
// Expand-in-place within the center column. Common vitals mirror what onboarding
// captures (BP, HR, weight, height, waist) plus temperature; dimensions here are
// auto-assigned (well-known). Lab markers are handled by the separate labs-mirror
// feature, not entered here.
import { useState } from "react";
import { type DimensionKey, type VisitMeasurement } from "@/lib/visits";
import { FormCard, PrimaryButton, CancelLink, uid } from "@/components/visits/forms";
import { useVisitForm } from "./VisitFormProvider";

const COMMON_VITALS: { marker: string; unit: string; dims: DimensionKey[] }[] = [
  { marker: "Systolic BP", unit: "mmHg", dims: ["cardiovascular"] },
  { marker: "Diastolic BP", unit: "mmHg", dims: ["cardiovascular"] },
  { marker: "Heart rate", unit: "bpm", dims: ["cardiovascular"] },
  { marker: "Weight", unit: "kg", dims: ["metabolic"] },
  { marker: "Height", unit: "cm", dims: ["metabolic"] },
  { marker: "Waist circumference", unit: "cm", dims: ["metabolic"] },
  { marker: "Temperature", unit: "°C", dims: ["respiratory_immune"] },
];

export function MeasurementEntryForm({ onClose }: { onClose: () => void }) {
  const f = useVisitForm();
  const [vitals, setVitals] = useState<Record<string, string>>({});

  const save = () => {
    const out: VisitMeasurement[] = [];
    for (const v of COMMON_VITALS) {
      const raw = (vitals[v.marker] ?? "").trim();
      if (!raw) continue;
      out.push({ id: uid(), kind: "vital", marker: v.marker, value: raw, unit: v.unit, source: "measured_today", dimensions: v.dims });
    }
    out.forEach((m) => f.addMeasurement(m));
    onClose();
  };

  return (
    <FormCard onClose={onClose}>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[#9B8775] mb-2">Common Vitals</div>
        <div className="space-y-2">
          {COMMON_VITALS.map((v) => (
            <div key={v.marker} className="flex items-center gap-2">
              <label className="flex-1 text-[13px] text-[#6E5A48]">{v.marker}</label>
              <input
                value={vitals[v.marker] ?? ""}
                onChange={(e) => setVitals((prev) => ({ ...prev, [v.marker]: e.target.value }))}
                className="w-20 text-right bg-transparent outline-none text-[13px] text-[#1F1611] py-0.5"
                style={{ borderBottom: "1px solid #E7DCCD" }}
              />
              <span className="w-12 text-[11px] text-[#9B8775]">{v.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <CancelLink onClick={onClose} />
        <PrimaryButton onClick={save}>Add measurements</PrimaryButton>
      </div>
    </FormCard>
  );
}
