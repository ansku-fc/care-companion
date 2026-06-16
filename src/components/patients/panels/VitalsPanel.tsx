import { BpPair } from "../onboarding/StepBasicInfo";
import { FieldLabel, NumberInput, CalculatedField, SectionHeading } from "../onboarding/shared";

export type VitalsData = {
  bp_sys: number | null;
  bp_dia: number | null;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  heart_rate_bpm: number | null;
  temperature_c: number | null;
};

export const defaultVitalsData: VitalsData = {
  bp_sys: null,
  bp_dia: null,
  weight_kg: null,
  waist_cm: null,
  hip_cm: null,
  heart_rate_bpm: null,
  temperature_c: null,
};

export type VitalsBaselines = {
  bp?: { sys: number; dia: number; date?: string };
  weight_kg?: number;
  height_cm?: number | null;
};

export function VitalsPanel({
  value,
  onChange,
  baselines,
}: {
  value: VitalsData;
  onChange: (updates: Partial<VitalsData>) => void;
  baselines?: VitalsBaselines;
}) {
  const bmi =
    baselines?.height_cm && value.weight_kg
      ? value.weight_kg / Math.pow(baselines.height_cm / 100, 2)
      : null;
  const whr =
    value.waist_cm && value.hip_cm && value.hip_cm > 0
      ? value.waist_cm / value.hip_cm
      : null;

  const Ghost = ({ children }: { children: React.ReactNode }) => (
    <p className="mt-1 text-[11px] text-muted-foreground">{children}</p>
  );

  return (
    <div className="space-y-4">
      <SectionHeading>Vitals</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <BpPair
            label="Blood pressure"
            sys={value.bp_sys}
            dia={value.bp_dia}
            onSys={(v) => onChange({ bp_sys: v })}
            onDia={(v) => onChange({ bp_dia: v })}
          />
          {baselines?.bp && (
            <Ghost>
              Last: {baselines.bp.sys}/{baselines.bp.dia}
              {baselines.bp.date ? ` · ${baselines.bp.date}` : ""}
            </Ghost>
          )}
        </div>
        <div>
          <FieldLabel>Heart rate (bpm)</FieldLabel>
          <NumberInput value={value.heart_rate_bpm} onChange={(v) => onChange({ heart_rate_bpm: v })} min={20} max={250} />
        </div>
        <div>
          <FieldLabel>Weight (kg)</FieldLabel>
          <NumberInput value={value.weight_kg} onChange={(v) => onChange({ weight_kg: v })} min={0} step={0.1} />
          {baselines?.weight_kg != null && <Ghost>Last: {baselines.weight_kg} kg</Ghost>}
        </div>
        <div>
          <FieldLabel>Temperature (°C)</FieldLabel>
          <NumberInput value={value.temperature_c} onChange={(v) => onChange({ temperature_c: v })} min={30} max={45} step={0.1} />
        </div>
        <div>
          <FieldLabel>Waist (cm)</FieldLabel>
          <NumberInput value={value.waist_cm} onChange={(v) => onChange({ waist_cm: v })} min={0} step={0.5} />
        </div>
        <div>
          <FieldLabel>Hip (cm)</FieldLabel>
          <NumberInput value={value.hip_cm} onChange={(v) => onChange({ hip_cm: v })} min={0} step={0.5} />
        </div>
        <CalculatedField label="BMI" sublabel="calculated" value={bmi !== null ? bmi.toFixed(1) : "—"} />
        <CalculatedField label="W/H ratio" sublabel="calculated" value={whr !== null ? whr.toFixed(2) : "—"} />
      </div>
    </div>
  );
}
