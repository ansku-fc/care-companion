// Canonical dimension vocabulary for the visit-intake flow.
//
// The 9 MAIN dimensions from HEALTH_TAXONOMY are the single source of truth.
// `DimensionKey` is the canonical union; everything the intake flow *writes*
// uses these keys. `fromKebab` / `fromLabel` translate the three legacy
// vocabularies that exist elsewhere in the app into canonical keys on read.
//
// Build coupling: `assertCanonicalKeysMatchTaxonomy()` is asserted by a unit
// test (dimensionMapping.test.ts) and runs at module load in dev, so adding /
// renaming / removing a MAIN taxonomy dimension without updating DimensionKey
// fails the test run. The `satisfies` guard below keeps the union and the
// enumerated tuple in sync at compile time (tsc).

import { HEALTH_TAXONOMY, OLD_TO_NEW_KEY_MAP } from "@/lib/healthDimensions";
import { getSuggestedDimensionsForIcd, ICD_MEDICATION_SUGGESTIONS } from "@/lib/onboardingTaxonomy";
import { LAB_MARKERS } from "@/lib/labMarkerCatalog";

/** Canonical MAIN dimension keys — mirror of HEALTH_TAXONOMY[*].key. */
export type DimensionKey =
  | "brain_mental"
  | "metabolic"
  | "cardiovascular"
  | "exercise_functional"
  | "digestion"
  | "respiratory_immune"
  | "cancer_risk"
  | "skin_oral_mucosal"
  | "reproductive_sexual";

/** Iterable tuple of every canonical key. Order matches HEALTH_TAXONOMY. */
export const DIMENSION_KEYS = [
  "brain_mental",
  "metabolic",
  "cardiovascular",
  "exercise_functional",
  "digestion",
  "respiratory_immune",
  "cancer_risk",
  "skin_oral_mucosal",
  "reproductive_sexual",
] as const satisfies readonly DimensionKey[];

// Compile-time guard: this object must have exactly one entry per DimensionKey.
// Removing a key from the union (or from DIMENSION_KEYS) breaks this — tsc fails.
const _EXHAUSTIVE_GUARD: Record<DimensionKey, true> = {
  brain_mental: true,
  metabolic: true,
  cardiovascular: true,
  exercise_functional: true,
  digestion: true,
  respiratory_immune: true,
  cancer_risk: true,
  skin_oral_mucosal: true,
  reproductive_sexual: true,
};
void _EXHAUSTIVE_GUARD;

/**
 * Runtime coupling to the actual taxonomy array. Throws if the canonical key
 * set and HEALTH_TAXONOMY's MAIN keys diverge. Enforced by the unit test (and
 * at module load in dev) so a taxonomy edit surfaces immediately.
 */
export function assertCanonicalKeysMatchTaxonomy(): void {
  const taxonomy = new Set(HEALTH_TAXONOMY.map((d) => d.key));
  const canonical = new Set<string>(DIMENSION_KEYS);
  const missing = [...taxonomy].filter((k) => !canonical.has(k));
  const extra = [...canonical].filter((k) => !taxonomy.has(k));
  if (missing.length || extra.length) {
    throw new Error(
      `DimensionKey is out of sync with HEALTH_TAXONOMY. ` +
        `Missing from DimensionKey: [${missing.join(", ")}]. ` +
        `Not in taxonomy: [${extra.join(", ")}].`,
    );
  }
}

if (import.meta.env?.DEV) {
  assertCanonicalKeysMatchTaxonomy();
}

/** Type guard for arbitrary strings. */
export function isDimensionKey(value: string): value is DimensionKey {
  return (DIMENSION_KEYS as readonly string[]).includes(value);
}

/** Human label for a canonical key, sourced from HEALTH_TAXONOMY. */
export function dimensionLabel(key: DimensionKey): string {
  return HEALTH_TAXONOMY.find((d) => d.key === key)?.label ?? key;
}

/**
 * Map an onboarding-style kebab key (onboardingTaxonomy.DIMENSION_TAGS) to a
 * canonical key. Note the taxonomy JOINS what onboarding SPLITS: both `skin`
 * and `oral` collapse to `skin_oral_mucosal`.
 */
export function fromKebab(kebab: string): DimensionKey | null {
  const map: Record<string, DimensionKey> = {
    "brain-mental": "brain_mental",
    metabolic: "metabolic",
    cardiovascular: "cardiovascular",
    exercise: "exercise_functional",
    digestion: "digestion",
    respiratory: "respiratory_immune",
    cancer: "cancer_risk",
    skin: "skin_oral_mucosal",
    oral: "skin_oral_mucosal",
    reproductive: "reproductive_sexual",
  };
  const cleaned = kebab.replace(/^@/, "").trim().toLowerCase();
  if (map[cleaned]) return map[cleaned];
  // Fall back to the app-wide legacy snake map, then validate it's a MAIN key.
  const legacy = OLD_TO_NEW_KEY_MAP[cleaned];
  return legacy && isDimensionKey(legacy) ? legacy : null;
}

/**
 * Map a human label (patientClinicalData.ClinicalDimensionKey and the
 * consultation prototype's ALL_DIMENSIONS list) to a canonical key. Tolerant
 * of the "Health" vs "Capacity" and shortened-label variants that exist across
 * the four vocabularies. Returns null for unmappable labels (e.g. "Other").
 */
export function fromLabel(label: string): DimensionKey | null {
  const l = label.trim().toLowerCase();
  if (l.startsWith("cardiovascular")) return "cardiovascular";
  if (l.startsWith("metabolic")) return "metabolic";
  if (l.startsWith("brain")) return "brain_mental";
  if (l.startsWith("digestion")) return "digestion";
  if (l.startsWith("respiratory")) return "respiratory_immune";
  if (l.startsWith("exercise")) return "exercise_functional";
  if (l.startsWith("cancer")) return "cancer_risk";
  if (l.startsWith("skin")) return "skin_oral_mucosal";
  if (l.startsWith("reproductive")) return "reproductive_sexual";
  return null;
}

/* ---------------- Auto-suggest: clinical input → canonical dimension(s) ---------------- */

/** Suggest dimensions for an ICD-10 code (reuses onboardingTaxonomy's ICD map). */
export function suggestDimensionsForIcd(icd: string): DimensionKey[] {
  return getSuggestedDimensionsForIcd(icd)
    .map(fromKebab)
    .filter((k): k is DimensionKey => k !== null);
}

// labMarkerCatalog groups markers under its own dimension vocabulary (e.g.
// "Liver Function", "Kidney Function"); map those to the 9 canonical MAIN keys.
const CATALOG_DIM_TO_CANONICAL: Record<string, DimensionKey> = {
  "cardiovascular health": "cardiovascular",
  "metabolic health": "metabolic",
  "endocrine & hormonal health": "metabolic",
  "kidney function": "metabolic",
  "liver function": "digestion",
  "nutrition & vitamins": "metabolic",
};
// Short visit-marker names → catalog labels (catalog uses long names).
const MARKER_ALIASES: Record<string, string> = {
  ldl: "ldl cholesterol",
  "systolic bp": "blood pressure (systolic)",
  "diastolic bp": "blood pressure (diastolic)",
};

/**
 * Suggest dimension(s) for a medication by name. There is no ATC→dimension map,
 * so we reuse ICD_MEDICATION_SUGGESTIONS (ICD→meds) in reverse: find the ICD
 * codes that prescribe this med, then map those to canonical dimensions.
 */
export function suggestDimensionsForMedication(name: string): DimensionKey[] {
  const lower = name.trim().toLowerCase();
  if (!lower) return [];
  const dims = new Set<DimensionKey>();
  for (const [icd, meds] of Object.entries(ICD_MEDICATION_SUGGESTIONS)) {
    if (meds.some((m) => m.toLowerCase() === lower)) {
      for (const d of suggestDimensionsForIcd(icd)) dims.add(d);
    }
  }
  return [...dims];
}

/** Suggest dimension(s) for a measurement marker (reuses labMarkerCatalog). */
export function suggestDimensionsForMarker(marker: string): DimensionKey[] {
  const norm = marker.trim().toLowerCase();
  if (!norm) return [];
  const label = MARKER_ALIASES[norm] ?? norm;
  const m = LAB_MARKERS.find((x) => x.label.toLowerCase() === label);
  if (!m) return [];
  const canonical = CATALOG_DIM_TO_CANONICAL[m.dimension.toLowerCase()] ?? fromLabel(m.dimension);
  return canonical ? [canonical] : [];
}
