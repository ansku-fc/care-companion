// Canonical dimension chip multi-select. Always operates on DimensionKey — the
// single source of truth — so tagged data never drifts into a legacy vocabulary.
import { DIMENSION_KEYS, dimensionLabel, type DimensionKey } from "@/lib/visits";

export function DimensionMultiSelect({
  value,
  onChange,
}: {
  value: DimensionKey[];
  onChange: (next: DimensionKey[]) => void;
}) {
  const toggle = (k: DimensionKey) => {
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {DIMENSION_KEYS.map((k) => {
        const active = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className="rounded-full text-[12px] font-medium"
            style={{
              padding: "4px 10px",
              background: active ? "#2E1F14" : "#F5F0EA",
              color: active ? "#FFFFFF" : "#9B8775",
              border: active ? "1px solid #2E1F14" : "1px solid #E7DCCD",
              transition: "background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out",
            }}
          >
            {dimensionLabel(k)}
          </button>
        );
      })}
    </div>
  );
}
