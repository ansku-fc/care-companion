// Common allergens with ICD-10 codes and category.
// Used in onboarding form, patient overview, and patient profile.

export type AllergenCategory = "Drugs" | "Environmental" | "Nutritional";
export type AllergySeverity = "mild" | "moderate" | "severe" | "anaphylactic";

export interface AllergenOption {
  name: string;
  category: AllergenCategory;
  icd10: string;
}

export const COMMON_ALLERGENS: AllergenOption[] = [
  // ===== DRUGS =====
  { name: "Penicillin", category: "Drugs", icd10: "Z88.0" },
  { name: "Amoxicillin", category: "Drugs", icd10: "Z88.0" },
  { name: "Ampicillin", category: "Drugs", icd10: "Z88.0" },
  { name: "Cephalosporins", category: "Drugs", icd10: "Z88.1" },
  { name: "Sulfonamides", category: "Drugs", icd10: "Z88.2" },
  { name: "Tetracycline", category: "Drugs", icd10: "Z88.2" },
  { name: "Erythromycin", category: "Drugs", icd10: "Z88.3" },
  { name: "Aspirin", category: "Drugs", icd10: "Z88.4" },
  { name: "Ibuprofen", category: "Drugs", icd10: "Z88.4" },
  { name: "Naproxen", category: "Drugs", icd10: "Z88.4" },
  { name: "NSAIDs", category: "Drugs", icd10: "Z88.4" },
  { name: "Codeine", category: "Drugs", icd10: "Z88.5" },
  { name: "Morphine", category: "Drugs", icd10: "Z88.5" },
  { name: "Metformin", category: "Drugs", icd10: "Z88.8" },
  { name: "Statins", category: "Drugs", icd10: "Z88.8" },
  { name: "ACE inhibitors", category: "Drugs", icd10: "Z88.8" },
  { name: "Warfarin", category: "Drugs", icd10: "Z88.8" },
  { name: "Heparin", category: "Drugs", icd10: "Z88.8" },
  { name: "Contrast media", category: "Drugs", icd10: "Z88.8" },
  { name: "Local anaesthetics", category: "Drugs", icd10: "Z88.8" },
  { name: "General anaesthetics", category: "Drugs", icd10: "Z88.8" },
  { name: "Latex", category: "Drugs", icd10: "Z91.040" },
  { name: "Insulin", category: "Drugs", icd10: "Z88.8" },

  // ===== ENVIRONMENTAL =====
  { name: "Cat dander", category: "Environmental", icd10: "Z91.09" },
  { name: "Dog dander", category: "Environmental", icd10: "Z91.09" },
  { name: "Horse dander", category: "Environmental", icd10: "Z91.09" },
  { name: "Dust mites", category: "Environmental", icd10: "Z91.09" },
  { name: "Cockroach", category: "Environmental", icd10: "Z91.09" },
  { name: "Mold/fungi", category: "Environmental", icd10: "Z91.09" },
  { name: "Tree pollen", category: "Environmental", icd10: "Z91.09" },
  { name: "Grass pollen", category: "Environmental", icd10: "Z91.09" },
  { name: "Weed pollen", category: "Environmental", icd10: "Z91.09" },
  { name: "Birch pollen", category: "Environmental", icd10: "Z91.09" },
  { name: "Bee venom", category: "Environmental", icd10: "Z91.030" },
  { name: "Wasp venom", category: "Environmental", icd10: "Z91.030" },
  { name: "Ant venom", category: "Environmental", icd10: "Z91.030" },
  { name: "Nickel", category: "Environmental", icd10: "Z91.09" },
  { name: "Chromium", category: "Environmental", icd10: "Z91.09" },
  { name: "Fragrance mix", category: "Environmental", icd10: "Z91.09" },
  { name: "Formaldehyde", category: "Environmental", icd10: "Z91.09" },
  { name: "Sunscreen ingredients", category: "Environmental", icd10: "Z91.09" },

  // ===== NUTRITIONAL =====
  { name: "Peanuts", category: "Nutritional", icd10: "Z91.010" },
  { name: "Tree nuts (walnut/cashew/almond)", category: "Nutritional", icd10: "Z91.010" },
  { name: "Shellfish", category: "Nutritional", icd10: "Z91.013" },
  { name: "Fish", category: "Nutritional", icd10: "Z91.013" },
  { name: "Milk/dairy", category: "Nutritional", icd10: "Z91.011" },
  { name: "Eggs", category: "Nutritional", icd10: "Z91.012" },
  { name: "Wheat/gluten", category: "Nutritional", icd10: "Z91.019" },
  { name: "Soy", category: "Nutritional", icd10: "Z91.019" },
  { name: "Sesame", category: "Nutritional", icd10: "Z91.019" },
  { name: "Mustard", category: "Nutritional", icd10: "Z91.019" },
  { name: "Celery", category: "Nutritional", icd10: "Z91.019" },
  { name: "Lupin", category: "Nutritional", icd10: "Z91.019" },
  { name: "Sulphites", category: "Nutritional", icd10: "Z91.019" },
];

export const ALLERGEN_CATEGORIES: AllergenCategory[] = ["Drugs", "Environmental", "Nutritional"];

export const ALLERGY_SEVERITIES: AllergySeverity[] = ["mild", "moderate", "severe", "anaphylactic"];

export function severityLabel(s: AllergySeverity | string | null | undefined): string {
  switch (s) {
    case "mild": return "Mild";
    case "moderate": return "Moderate";
    case "severe": return "Severe";
    case "anaphylactic": return "Anaphylactic";
    default: return "Unset";
  }
}

export function findAllergen(name: string): AllergenOption | undefined {
  const n = name.trim().toLowerCase();
  return COMMON_ALLERGENS.find((a) => a.name.toLowerCase() === n);
}
