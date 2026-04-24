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
export type IcdEntry = { code: string; name: string };

export const ICD10_ILLNESSES: IcdEntry[] = [
  // Cardiovascular
  { code: "I10", name: "Essential hypertension" },
  { code: "I11.9", name: "Hypertensive heart disease" },
  { code: "I20.9", name: "Angina pectoris" },
  { code: "I21.9", name: "Acute myocardial infarction" },
  { code: "I25.10", name: "Coronary artery disease" },
  { code: "I48.91", name: "Atrial fibrillation" },
  { code: "I50.9", name: "Heart failure" },
  { code: "I63.9", name: "Cerebral infarction (stroke)" },
  { code: "I73.9", name: "Peripheral vascular disease" },
  { code: "E78.5", name: "Hyperlipidaemia" },
  // Metabolic / endocrine
  { code: "E11.9", name: "Type 2 diabetes mellitus" },
  { code: "E10.9", name: "Type 1 diabetes mellitus" },
  { code: "E03.9", name: "Hypothyroidism" },
  { code: "E05.9", name: "Hyperthyroidism" },
  { code: "E66.9", name: "Obesity" },
  // Respiratory
  { code: "J45.20", name: "Asthma" },
  { code: "J44.9", name: "COPD" },
  { code: "J30.9", name: "Allergic rhinitis" },
  { code: "G47.33", name: "Obstructive sleep apnoea" },
  // GI / liver / kidney
  { code: "K21.9", name: "Gastro-oesophageal reflux disease" },
  { code: "K58.9", name: "Irritable bowel syndrome" },
  { code: "K50.90", name: "Crohn's disease" },
  { code: "K51.90", name: "Ulcerative colitis" },
  { code: "K76.0", name: "Fatty liver" },
  { code: "N18.9", name: "Chronic kidney disease" },
  // Mental health
  { code: "F32.9", name: "Depressive episode" },
  { code: "F41.1", name: "Generalised anxiety disorder" },
  { code: "F31.9", name: "Bipolar disorder" },
  { code: "F33.9", name: "Recurrent depressive disorder" },
  { code: "F90.0", name: "ADHD" },
  // Neurological
  { code: "G43.909", name: "Migraine" },
  { code: "G40.909", name: "Epilepsy" },
  { code: "G20", name: "Parkinson's disease" },
  { code: "G30.9", name: "Alzheimer's disease" },
  // Musculoskeletal
  { code: "M19.90", name: "Osteoarthritis" },
  { code: "M06.9", name: "Rheumatoid arthritis" },
  { code: "M81.0", name: "Osteoporosis" },
  { code: "M54.5", name: "Low back pain" },
  // Cancer
  { code: "C50.9", name: "Breast cancer" },
  { code: "C61", name: "Prostate cancer" },
  { code: "C18.9", name: "Colon cancer" },
  { code: "C34.9", name: "Lung cancer" },
  { code: "C43.9", name: "Melanoma" },
  // Reproductive
  { code: "E28.2", name: "Polycystic ovary syndrome" },
  { code: "N80.9", name: "Endometriosis" },
  { code: "N40.0", name: "Benign prostatic hyperplasia" },
  // Skin
  { code: "L40.9", name: "Psoriasis" },
  { code: "L20.9", name: "Atopic dermatitis" },
  // Other
  { code: "M10.9", name: "Gout" },
  { code: "D50.9", name: "Iron deficiency anaemia" },
];

/** Common medications pulled from the prompt brief. */
export const MEDICATION_LIST = [
  "Metformin", "Atorvastatin", "Simvastatin", "Rosuvastatin", "Ramipril",
  "Enalapril", "Lisinopril", "Losartan", "Amlodipine", "Bisoprolol",
  "Metoprolol", "Carvedilol", "Furosemide", "Hydrochlorothiazide", "Spironolactone",
  "Warfarin", "Apixaban", "Rivaroxaban", "Aspirin", "Clopidogrel",
  "Omeprazole", "Pantoprazole", "Levothyroxine", "Insulin glargine", "Insulin aspart",
  "Sitagliptin", "Empagliflozin", "Dapagliflozin", "Salbutamol", "Tiotropium",
  "Budesonide/formoterol", "Fluticasone", "Sertraline", "Escitalopram", "Mirtazapine",
  "Venlafaxine", "Amitriptyline", "Alprazolam", "Diazepam", "Zopiclone",
  "Melatonin", "Gabapentin", "Pregabalin", "Tramadol", "Paracetamol",
  "Ibuprofen", "Naproxen", "Prednisolone", "Methylprednisolone", "Allopurinol",
  "Cetirizine", "Loratadine", "Montelukast", "Doxycycline", "Amoxicillin",
  "Azithromycin", "Ciprofloxacin", "Nitrofurantoin", "Finasteride", "Tamsulosin",
  "Estradiol", "Progesterone", "Combined OCP", "Other",
] as const;

export const SUPPLEMENT_LIST = [
  "Vitamin D", "Vitamin C", "Vitamin B12", "Vitamin B complex", "Magnesium",
  "Zinc", "Iron", "Omega-3", "Calcium", "Folate",
  "CoQ10", "Melatonin", "Probiotics", "Protein powder", "Creatine",
  "Collagen", "Other",
] as const;

/** Dimension tags rendered as colored chips inside notes textareas. */
export type DimensionTag = {
  key: string;
  label: string;
  /** Tone — pink = high-clinical-risk dimension, teal = supportive/lifestyle. */
  tone: "pink" | "teal";
};

export const DIMENSION_TAGS: DimensionTag[] = [
  { key: "cardiovascular", label: "@cardiovascular", tone: "pink" },
  { key: "metabolic", label: "@metabolic", tone: "pink" },
  { key: "brain-mental", label: "@brain-mental", tone: "pink" },
  { key: "cancer", label: "@cancer", tone: "pink" },
  { key: "respiratory", label: "@respiratory", tone: "teal" },
  { key: "exercise", label: "@exercise", tone: "teal" },
  { key: "digestion", label: "@digestion", tone: "teal" },
  { key: "skin", label: "@skin", tone: "teal" },
  { key: "reproductive", label: "@reproductive", tone: "teal" },
];

export function findDimensionTag(key: string): DimensionTag | undefined {
  const k = key.replace(/^@/, "").toLowerCase();
  return DIMENSION_TAGS.find((t) => t.key === k);
}

/** Years dropdown helper — descending list from current year back N years. */
export function yearOptions(yearsBack = 100): number[] {
  const now = new Date().getFullYear();
  return Array.from({ length: yearsBack + 1 }, (_, i) => now - i);
}
