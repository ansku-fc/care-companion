// Common allergens with ICD-10 codes and category.
// Used in onboarding form, patient overview, and patient profile.

export type AllergenCategory = "Drug" | "Food" | "Environmental";

export interface AllergenOption {
  name: string;
  category: AllergenCategory;
  icd10: string;
}

export const COMMON_ALLERGENS: AllergenOption[] = [
  // Drug allergies
  { name: "Penicillin", category: "Drug", icd10: "Z88.0" },
  { name: "Amoxicillin", category: "Drug", icd10: "Z88.0" },
  { name: "Aspirin", category: "Drug", icd10: "Z88.5" },
  { name: "Ibuprofen", category: "Drug", icd10: "Z88.5" },
  { name: "Codeine", category: "Drug", icd10: "Z88.2" },
  { name: "Sulfonamides", category: "Drug", icd10: "Z88.2" },
  { name: "Tetracycline", category: "Drug", icd10: "Z88.2" },
  { name: "Erythromycin", category: "Drug", icd10: "Z88.2" },
  { name: "Ciprofloxacin", category: "Drug", icd10: "Z88.2" },
  { name: "Metformin", category: "Drug", icd10: "Z88.3" },
  { name: "Warfarin", category: "Drug", icd10: "Z88.3" },
  { name: "Lisinopril", category: "Drug", icd10: "Z88.3" },
  { name: "Statins", category: "Drug", icd10: "Z88.3" },
  { name: "Contrast dye (iodine)", category: "Drug", icd10: "Z88.8" },
  { name: "Latex", category: "Environmental", icd10: "Z88.8" },

  // Food allergies
  { name: "Peanuts", category: "Food", icd10: "Z91.010" },
  { name: "Tree nuts", category: "Food", icd10: "Z91.018" },
  { name: "Milk / Dairy", category: "Food", icd10: "Z91.011" },
  { name: "Eggs", category: "Food", icd10: "Z91.012" },
  { name: "Wheat / Gluten", category: "Food", icd10: "Z91.019" },
  { name: "Soy", category: "Food", icd10: "Z91.018" },
  { name: "Fish", category: "Food", icd10: "Z91.013" },
  { name: "Shellfish", category: "Food", icd10: "Z91.013" },
  { name: "Sesame", category: "Food", icd10: "Z91.018" },

  // Environmental allergies
  { name: "Pollen", category: "Environmental", icd10: "J30.1" },
  { name: "Dust mites", category: "Environmental", icd10: "J30.89" },
  { name: "Cat dander", category: "Environmental", icd10: "J30.81" },
  { name: "Dog dander", category: "Environmental", icd10: "J30.81" },
  { name: "Mould", category: "Environmental", icd10: "J30.89" },
  { name: "Bee venom", category: "Environmental", icd10: "T63.441A" },
  { name: "Nickel", category: "Environmental", icd10: "L23.0" },
];

export function findAllergen(name: string): AllergenOption | undefined {
  const n = name.trim().toLowerCase();
  return COMMON_ALLERGENS.find((a) => a.name.toLowerCase() === n);
}
