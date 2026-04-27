/**
 * Shared lookup data used across the redesigned onboarding flow.
 * Keeping these arrays here (rather than inlined per step) lets us reuse them
 * in the patient profile read-views later.
 */

export const OCCUPATIONS = [
  "Caregiver / stay-at-home parent",
  "Entrepreneur / Self-employed",
  "Knowledge work",
  "Manager / Executive",
  "Physical work",
  "Retired",
  "Student",
  "Unemployed",
  "Other",
] as const;

export const EDUCATION_LEVELS = [
  "Primary",
  "Secondary",
  "Vocational",
  "Bachelor's",
  "Master's",
  "Doctoral",
] as const;

export const FAMILY_RELATIONS = [
  "Mother",
  "Father",
  "Maternal grandmother",
  "Maternal grandfather",
  "Paternal grandmother",
  "Paternal grandfather",
  "Sibling",
  "Child",
  "Other",
] as const;

/** Compact ICD-10 list scoped to the conditions onboarding asks about. */
export type IcdDimension =
  | "Cardiovascular"
  | "Metabolic"
  | "Digestive"
  | "Respiratory & Immune"
  | "Brain & Mental Health"
  | "Cancer"
  | "Musculoskeletal"
  | "Reproductive & Sexual"
  | "Skin";

export type IcdEntry = { code: string; name: string; dimension: IcdDimension };

export const ICD10_ILLNESSES: IcdEntry[] = [
  // ===== Cardiovascular =====
  { code: "I10", name: "Essential hypertension", dimension: "Cardiovascular" },
  { code: "I11", name: "Hypertensive heart disease", dimension: "Cardiovascular" },
  { code: "I20", name: "Angina pectoris", dimension: "Cardiovascular" },
  { code: "I21", name: "Acute myocardial infarction", dimension: "Cardiovascular" },
  { code: "I25", name: "Chronic ischaemic heart disease", dimension: "Cardiovascular" },
  { code: "I48", name: "Atrial fibrillation", dimension: "Cardiovascular" },
  { code: "I50", name: "Heart failure", dimension: "Cardiovascular" },
  { code: "I63", name: "Cerebral infarction", dimension: "Cardiovascular" },
  { code: "I65", name: "Occlusion of precerebral arteries", dimension: "Cardiovascular" },
  { code: "I70", name: "Atherosclerosis", dimension: "Cardiovascular" },
  { code: "I83", name: "Varicose veins", dimension: "Cardiovascular" },

  // ===== Metabolic =====
  { code: "E11", name: "Type 2 diabetes", dimension: "Metabolic" },
  { code: "E10", name: "Type 1 diabetes", dimension: "Metabolic" },
  { code: "E14", name: "Unspecified diabetes", dimension: "Metabolic" },
  { code: "E03", name: "Hypothyroidism", dimension: "Metabolic" },
  { code: "E05", name: "Hyperthyroidism", dimension: "Metabolic" },
  { code: "E06", name: "Thyroiditis", dimension: "Metabolic" },
  { code: "E55", name: "Vitamin D deficiency", dimension: "Metabolic" },
  { code: "E61", name: "Zinc deficiency", dimension: "Metabolic" },
  { code: "E66", name: "Obesity", dimension: "Metabolic" },
  { code: "E78", name: "Disorders of lipoprotein metabolism (hypercholesterolaemia)", dimension: "Metabolic" },
  { code: "E88", name: "Metabolic syndrome", dimension: "Metabolic" },

  // ===== Digestive =====
  { code: "K21", name: "GERD", dimension: "Digestive" },
  { code: "K25", name: "Gastric ulcer", dimension: "Digestive" },
  { code: "K26", name: "Duodenal ulcer", dimension: "Digestive" },
  { code: "K29", name: "Gastritis", dimension: "Digestive" },
  { code: "K50", name: "Crohn's disease", dimension: "Digestive" },
  { code: "K51", name: "Ulcerative colitis", dimension: "Digestive" },
  { code: "K57", name: "Diverticular disease", dimension: "Digestive" },
  { code: "K58", name: "Irritable bowel syndrome", dimension: "Digestive" },
  { code: "K70", name: "Alcoholic liver disease", dimension: "Digestive" },
  { code: "K76", name: "Non-alcoholic fatty liver disease", dimension: "Digestive" },
  { code: "K80", name: "Cholelithiasis", dimension: "Digestive" },

  // ===== Respiratory & Immune =====
  { code: "J06", name: "Acute upper respiratory infection", dimension: "Respiratory & Immune" },
  { code: "J18", name: "Pneumonia", dimension: "Respiratory & Immune" },
  { code: "J30", name: "Allergic rhinitis", dimension: "Respiratory & Immune" },
  { code: "J45", name: "Asthma", dimension: "Respiratory & Immune" },
  { code: "J44", name: "COPD", dimension: "Respiratory & Immune" },
  { code: "J96", name: "Respiratory failure", dimension: "Respiratory & Immune" },
  { code: "M05", name: "Rheumatoid arthritis", dimension: "Respiratory & Immune" },
  { code: "M32", name: "Systemic lupus erythematosus", dimension: "Respiratory & Immune" },
  { code: "D50", name: "Iron deficiency anaemia", dimension: "Respiratory & Immune" },
  { code: "D80", name: "Immunodeficiency", dimension: "Respiratory & Immune" },

  // ===== Brain & Mental Health =====
  { code: "F10", name: "Alcohol use disorder", dimension: "Brain & Mental Health" },
  { code: "F17", name: "Nicotine dependence", dimension: "Brain & Mental Health" },
  { code: "F32", name: "Depressive episode", dimension: "Brain & Mental Health" },
  { code: "F33", name: "Recurrent depressive disorder", dimension: "Brain & Mental Health" },
  { code: "F40", name: "Phobic anxiety", dimension: "Brain & Mental Health" },
  { code: "F41", name: "Other anxiety disorders", dimension: "Brain & Mental Health" },
  { code: "F43", name: "Adjustment disorder / PTSD", dimension: "Brain & Mental Health" },
  { code: "F51", name: "Sleep disorders", dimension: "Brain & Mental Health" },
  { code: "G35", name: "Multiple sclerosis", dimension: "Brain & Mental Health" },
  { code: "G43", name: "Migraine", dimension: "Brain & Mental Health" },
  { code: "G47", name: "Sleep apnoea", dimension: "Brain & Mental Health" },
  { code: "G20", name: "Parkinson's disease", dimension: "Brain & Mental Health" },
  { code: "G30", name: "Alzheimer's disease", dimension: "Brain & Mental Health" },
  { code: "F20", name: "Schizophrenia", dimension: "Brain & Mental Health" },
  { code: "F31", name: "Bipolar disorder", dimension: "Brain & Mental Health" },

  // ===== Cancer =====
  { code: "C18", name: "Colon cancer", dimension: "Cancer" },
  { code: "C34", name: "Lung cancer", dimension: "Cancer" },
  { code: "C50", name: "Breast cancer", dimension: "Cancer" },
  { code: "C53", name: "Cervical cancer", dimension: "Cancer" },
  { code: "C61", name: "Prostate cancer", dimension: "Cancer" },
  { code: "C43", name: "Melanoma", dimension: "Cancer" },
  { code: "C73", name: "Thyroid cancer", dimension: "Cancer" },
  { code: "C90", name: "Multiple myeloma", dimension: "Cancer" },
  { code: "D05", name: "Carcinoma in situ of breast", dimension: "Cancer" },
  { code: "Z80", name: "Family history of cancer", dimension: "Cancer" },

  // ===== Musculoskeletal =====
  { code: "M10", name: "Gout", dimension: "Musculoskeletal" },
  { code: "M15", name: "Polyarthrosis", dimension: "Musculoskeletal" },
  { code: "M16", name: "Hip arthrosis", dimension: "Musculoskeletal" },
  { code: "M17", name: "Knee arthrosis", dimension: "Musculoskeletal" },
  { code: "M40", name: "Kyphosis/lordosis", dimension: "Musculoskeletal" },
  { code: "M54", name: "Back pain", dimension: "Musculoskeletal" },
  { code: "M79", name: "Fibromyalgia", dimension: "Musculoskeletal" },
  { code: "M81", name: "Osteoporosis", dimension: "Musculoskeletal" },

  // ===== Reproductive & Sexual =====
  { code: "N18", name: "Chronic kidney disease", dimension: "Reproductive & Sexual" },
  { code: "N39", name: "Urinary tract infection", dimension: "Reproductive & Sexual" },
  { code: "N40", name: "Prostate hyperplasia", dimension: "Reproductive & Sexual" },
  { code: "N80", name: "Endometriosis", dimension: "Reproductive & Sexual" },
  { code: "N83", name: "Ovarian cyst", dimension: "Reproductive & Sexual" },
  { code: "N91", name: "Absent menstruation", dimension: "Reproductive & Sexual" },
  { code: "O24", name: "Gestational diabetes", dimension: "Reproductive & Sexual" },
  { code: "O26", name: "Pregnancy complications", dimension: "Reproductive & Sexual" },

  // ===== Skin =====
  { code: "L20", name: "Atopic dermatitis", dimension: "Skin" },
  { code: "L40", name: "Psoriasis", dimension: "Skin" },
  { code: "L50", name: "Urticaria", dimension: "Skin" },
  { code: "L57", name: "Actinic keratosis", dimension: "Skin" },
  { code: "L70", name: "Acne", dimension: "Skin" },
  { code: "L90", name: "Scleroderma", dimension: "Skin" },
];

export const ICD_DIMENSIONS: IcdDimension[] = [
  "Cardiovascular",
  "Metabolic",
  "Digestive",
  "Respiratory & Immune",
  "Brain & Mental Health",
  "Cancer",
  "Musculoskeletal",
  "Reproductive & Sexual",
  "Skin",
];

/** Common medications with WHO ATC classification codes. */
export type MedicationEntry = {
  name: string;
  /** WHO Anatomical Therapeutic Chemical code. */
  atc: string;
};

export const MEDICATION_LIST: readonly MedicationEntry[] = [
  { name: "Metformin", atc: "A10BA02" },
  { name: "Atorvastatin", atc: "C10AA05" },
  { name: "Simvastatin", atc: "C10AA01" },
  { name: "Rosuvastatin", atc: "C10AA07" },
  { name: "Ramipril", atc: "C09AA05" },
  { name: "Enalapril", atc: "C09AA02" },
  { name: "Lisinopril", atc: "C09AA03" },
  { name: "Losartan", atc: "C09CA01" },
  { name: "Amlodipine", atc: "C08CA01" },
  { name: "Bisoprolol", atc: "C07AB07" },
  { name: "Metoprolol", atc: "C07AB02" },
  { name: "Carvedilol", atc: "C07AG02" },
  { name: "Propranolol", atc: "C07AA05" },
  { name: "Digoxin", atc: "C01AA05" },
  { name: "Furosemide", atc: "C03CA01" },
  { name: "Hydrochlorothiazide", atc: "C03AA03" },
  { name: "Spironolactone", atc: "C03DA01" },
  { name: "Warfarin", atc: "B01AA03" },
  { name: "Apixaban", atc: "B01AF02" },
  { name: "Rivaroxaban", atc: "B01AF01" },
  { name: "Aspirin", atc: "B01AC06" },
  { name: "Clopidogrel", atc: "B01AC04" },
  { name: "Omeprazole", atc: "A02BC01" },
  { name: "Pantoprazole", atc: "A02BC02" },
  { name: "Levothyroxine", atc: "H03AA01" },
  { name: "Carbimazole", atc: "H03BB01" },
  { name: "Propylthiouracil", atc: "H03BA02" },
  { name: "Insulin glargine", atc: "A10AE04" },
  { name: "Insulin aspart", atc: "A10AB05" },
  { name: "Sitagliptin", atc: "A10BH01" },
  { name: "Empagliflozin", atc: "A10BK03" },
  { name: "Dapagliflozin", atc: "A10BK01" },
  { name: "Salbutamol", atc: "R03AC02" },
  { name: "Tiotropium", atc: "R03BB04" },
  { name: "Budesonide/formoterol", atc: "R03AK07" },
  { name: "Fluticasone", atc: "R03BA05" },
  { name: "Sertraline", atc: "N06AB06" },
  { name: "Escitalopram", atc: "N06AB10" },
  { name: "Mirtazapine", atc: "N06AX11" },
  { name: "Venlafaxine", atc: "N06AX16" },
  { name: "Amitriptyline", atc: "N06AA09" },
  { name: "Alprazolam", atc: "N05BA12" },
  { name: "Diazepam", atc: "N05BA01" },
  { name: "Zopiclone", atc: "N05CF01" },
  { name: "Melatonin", atc: "N05CH01" },
  { name: "Gabapentin", atc: "N03AX12" },
  { name: "Pregabalin", atc: "N03AX16" },
  { name: "Tramadol", atc: "N02AX02" },
  { name: "Paracetamol", atc: "N02BE01" },
  { name: "Ibuprofen", atc: "M01AE01" },
  { name: "Naproxen", atc: "M01AE02" },
  { name: "Prednisolone", atc: "H02AB06" },
  { name: "Methylprednisolone", atc: "H02AB04" },
  { name: "Allopurinol", atc: "M04AA01" },
  { name: "Cetirizine", atc: "R06AE07" },
  { name: "Loratadine", atc: "R06AX13" },
  { name: "Montelukast", atc: "R03DC03" },
  { name: "Doxycycline", atc: "J01AA02" },
  { name: "Amoxicillin", atc: "J01CA04" },
  { name: "Azithromycin", atc: "J01FA10" },
  { name: "Ciprofloxacin", atc: "J01MA02" },
  { name: "Nitrofurantoin", atc: "J01XE01" },
  { name: "Finasteride", atc: "G04CB01" },
  { name: "Tamsulosin", atc: "G04CA02" },
  { name: "Estradiol", atc: "G03CA03" },
  { name: "Progesterone", atc: "G03DA04" },
  { name: "Combined OCP", atc: "G03AA" },
  { name: "Other", atc: "" },
] as const;

export function findMedication(name: string): MedicationEntry | undefined {
  const lower = name.toLowerCase();
  return MEDICATION_LIST.find((m) => m.name.toLowerCase() === lower);
}

/**
 * Map ICD-10 codes (or code prefixes) to commonly prescribed medication
 * names. Lookup is by exact code first, then by 3-character prefix
 * (e.g. "I10.9" → "I10").
 */
export const ICD_MEDICATION_SUGGESTIONS: Record<string, string[]> = {
  // Endocrine
  E03: ["Levothyroxine"],
  E05: ["Carbimazole", "Propylthiouracil", "Propranolol", "Levothyroxine"],
  E10: ["Insulin glargine", "Insulin aspart", "Metformin"],
  E11: ["Metformin", "Empagliflozin", "Sitagliptin", "Insulin glargine"],
  E78: ["Atorvastatin", "Rosuvastatin", "Simvastatin"],
  // Cardiovascular
  I10: ["Amlodipine", "Ramipril", "Lisinopril", "Losartan", "Bisoprolol"],
  I11: ["Ramipril", "Bisoprolol", "Amlodipine", "Furosemide"],
  I20: ["Aspirin", "Atorvastatin", "Bisoprolol", "Ramipril"],
  I21: ["Aspirin", "Clopidogrel", "Atorvastatin", "Bisoprolol", "Ramipril"],
  I25: ["Aspirin", "Atorvastatin", "Bisoprolol", "Ramipril"],
  I48: ["Warfarin", "Apixaban", "Bisoprolol", "Digoxin"],
  I50: ["Furosemide", "Ramipril", "Bisoprolol", "Spironolactone"],
  // Respiratory
  J44: ["Tiotropium", "Salbutamol", "Budesonide/formoterol"],
  J45: ["Salbutamol", "Budesonide/formoterol", "Montelukast", "Fluticasone"],
  // GI
  K21: ["Omeprazole", "Pantoprazole"],
  // Mental health
  F32: ["Sertraline", "Escitalopram", "Mirtazapine"],
  F33: ["Sertraline", "Escitalopram", "Venlafaxine", "Mirtazapine"],
  F41: ["Escitalopram", "Sertraline", "Pregabalin"],
  // Pain / MSK
  M10: ["Allopurinol", "Naproxen"],
  M54: ["Paracetamol", "Ibuprofen", "Naproxen", "Gabapentin"],
  // Allergy
  J30: ["Cetirizine", "Loratadine", "Fluticasone"],
};

export function getSuggestedMedications(icdCode: string | null | undefined): string[] {
  if (!icdCode) return [];
  const code = icdCode.trim().toUpperCase();
  if (!code) return [];
  if (ICD_MEDICATION_SUGGESTIONS[code]) return ICD_MEDICATION_SUGGESTIONS[code];
  const prefix = code.slice(0, 3);
  return ICD_MEDICATION_SUGGESTIONS[prefix] ?? [];
}

export const SUPPLEMENT_LIST = [
  "Vitamin D", "Vitamin C", "Vitamin B12", "Vitamin B complex", "Magnesium",
  "Zinc", "Iron", "Omega-3", "Calcium", "Folate",
  "CoQ10", "Melatonin", "Probiotics", "Protein powder", "Creatine",
  "Collagen", "Other",
] as const;

/** Health-dimension chips shown on illness rows. Aligned with the 9 main
 * dimensions used across the rest of the app (see clinical taxonomy). */
export type DimensionTag = {
  key: string;
  label: string;
  /** Tone — pink = high-clinical-risk dimension, teal = supportive/lifestyle. */
  tone: "pink" | "teal";
};

export const DIMENSION_TAGS: DimensionTag[] = [
  { key: "cardiovascular", label: "Cardiovascular Health", tone: "pink" },
  { key: "metabolic", label: "Metabolic Health", tone: "pink" },
  { key: "brain-mental", label: "Brain & Mental Health", tone: "pink" },
  { key: "cancer", label: "Cancer Risk", tone: "pink" },
  { key: "respiratory", label: "Respiratory & Immune Health", tone: "teal" },
  { key: "exercise", label: "Exercise & Functional Capacity", tone: "teal" },
  { key: "digestion", label: "Digestion", tone: "teal" },
  { key: "skin", label: "Skin", tone: "teal" },
  { key: "oral", label: "Oral & Mucosal Health", tone: "teal" },
  { key: "reproductive", label: "Reproductive & Sexual Health", tone: "teal" },
];

export function findDimensionTag(key: string): DimensionTag | undefined {
  const k = key.replace(/^@/, "").toLowerCase();
  return DIMENSION_TAGS.find((t) => t.key === k);
}

/** Map IcdDimension (the lookup-list grouping) to one or more main app
 * dimension keys. Used as the baseline suggestion before per-code overrides. */
const ICD_DIMENSION_TO_KEYS: Record<IcdDimension, string[]> = {
  Cardiovascular: ["cardiovascular"],
  Metabolic: ["metabolic"],
  Digestive: ["digestion"],
  "Respiratory & Immune": ["respiratory"],
  "Brain & Mental Health": ["brain-mental"],
  Cancer: ["cancer"],
  Musculoskeletal: ["exercise"],
  "Reproductive & Sexual": ["reproductive"],
  Skin: ["skin"],
};

/** Per-code overrides where a condition spans multiple main dimensions. */
const ICD_CODE_DIMENSION_OVERRIDES: Record<string, string[]> = {
  E10: ["metabolic", "cardiovascular"],
  E11: ["metabolic", "cardiovascular"],
  E14: ["metabolic", "cardiovascular"],
  E66: ["metabolic", "cardiovascular"],
  E78: ["metabolic", "cardiovascular"],
  E88: ["metabolic", "cardiovascular"],
  I63: ["cardiovascular", "brain-mental"],
  I65: ["cardiovascular", "brain-mental"],
  G47: ["brain-mental", "cardiovascular"],
  K70: ["digestion", "metabolic"],
  K76: ["digestion", "metabolic"],
  J30: ["respiratory", "oral"],
  N18: ["reproductive", "metabolic"],
  O24: ["reproductive", "metabolic"],
};

export function getSuggestedDimensionsForIcd(
  icdCode: string | null | undefined,
): string[] {
  if (!icdCode) return [];
  const code = icdCode.trim().toUpperCase();
  if (!code) return [];
  if (ICD_CODE_DIMENSION_OVERRIDES[code]) return ICD_CODE_DIMENSION_OVERRIDES[code];
  const prefix = code.slice(0, 3);
  if (ICD_CODE_DIMENSION_OVERRIDES[prefix]) return ICD_CODE_DIMENSION_OVERRIDES[prefix];
  const entry = ICD10_ILLNESSES.find((e) => e.code === code || e.code === prefix);
  if (!entry) return [];
  return ICD_DIMENSION_TO_KEYS[entry.dimension] ?? [];
}

/** Years dropdown helper — descending list from current year back N years. */
export function yearOptions(yearsBack = 100): number[] {
  const now = new Date().getFullYear();
  return Array.from({ length: yearsBack + 1 }, (_, i) => now - i);
}
