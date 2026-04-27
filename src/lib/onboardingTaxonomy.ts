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
