import {
  Brain, Eye, Moon, Zap, Pill, Sparkles,
  Beaker, Activity, Apple, Scale, FlaskConical,
  HeartPulse,
  Dumbbell, Bone,
  Stethoscope, UtensilsCrossed,
  Wind, Shield, AlertTriangle,
  Ribbon,
  Droplets, SmilePlus,
  Baby,
  type LucideIcon,
} from "lucide-react";

export type SubDimension = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type MainDimension = {
  key: string;
  label: string;
  icon: LucideIcon;
  number: number;
  subDimensions: SubDimension[];
};

export const HEALTH_TAXONOMY: MainDimension[] = [
  {
    key: "brain_mental",
    label: "Brain & Mental Health",
    icon: Brain,
    number: 1,
    subDimensions: [
      { key: "sensory_organs", label: "Sensory Organs", icon: Eye },
      { key: "sleep_recovery", label: "Sleep & Recovery", icon: Moon },
      { key: "memory", label: "Memory (50+)", icon: Zap },
      { key: "pain", label: "Pain", icon: Zap },
      { key: "substance_use", label: "Substance Use", icon: Pill },
      { key: "mental_wellbeing", label: "Mental Wellbeing", icon: Sparkles },
    ],
  },
  {
    key: "metabolic",
    label: "Metabolic Health",
    icon: Beaker,
    number: 2,
    subDimensions: [
      { key: "endocrine", label: "Endocrine System", icon: Beaker },
      { key: "kidneys", label: "Kidneys", icon: Activity },
      { key: "body_composition", label: "Body Composition", icon: Scale },
      { key: "nutrition", label: "Nutrition", icon: Apple },
      { key: "metabolism", label: "Metabolism", icon: FlaskConical },
    ],
  },
  {
    key: "cardiovascular",
    label: "Cardiovascular Health",
    icon: HeartPulse,
    number: 3,
    subDimensions: [],
  },
  {
    key: "exercise_functional",
    label: "Exercise & Functional Capacity",
    icon: Dumbbell,
    number: 4,
    subDimensions: [
      { key: "musculoskeletal", label: "Musculoskeletal System", icon: Bone },
      { key: "physical_performance", label: "Physical Performance & Recovery", icon: Dumbbell },
    ],
  },
  {
    key: "digestion",
    label: "Digestion",
    icon: UtensilsCrossed,
    number: 5,
    subDimensions: [
      { key: "gastrointestinal", label: "Gastrointestinal", icon: Stethoscope },
      { key: "liver", label: "Liver", icon: Stethoscope },
      { key: "pancreas", label: "Pancreas", icon: FlaskConical },
    ],
  },
  {
    key: "respiratory_immune",
    label: "Respiratory & Immune Health",
    icon: Wind,
    number: 6,
    subDimensions: [
      { key: "respiratory", label: "Respiratory", icon: Wind },
      { key: "immune_defence", label: "Immune Defence", icon: Shield },
      { key: "allergies", label: "Allergies", icon: AlertTriangle },
    ],
  },
  {
    key: "cancer_risk",
    label: "Cancer Risk",
    icon: Ribbon,
    number: 7,
    subDimensions: [
      { key: "gynaecological_cancer", label: "Gynaecological", icon: Ribbon },
      { key: "prostate_other_cancer", label: "Prostate & Other", icon: Ribbon },
      { key: "precancerous", label: "Precancerous Conditions", icon: Ribbon },
    ],
  },
  {
    key: "skin_oral_mucosal",
    label: "Skin, Oral & Mucosal Health",
    icon: Droplets,
    number: 8,
    subDimensions: [
      { key: "skin", label: "Skin", icon: Droplets },
      { key: "mucous_membranes", label: "Mucous Membranes", icon: Droplets },
      { key: "dental_health", label: "Dental Health", icon: SmilePlus },
    ],
  },
  {
    key: "reproductive_sexual",
    label: "Reproductive & Sexual Health",
    icon: Baby,
    number: 9,
    subDimensions: [
      { key: "urology", label: "Urology", icon: Activity },
      { key: "gynaecology", label: "Gynaecology", icon: Baby },
      { key: "pregnancy", label: "Pregnancy", icon: Baby },
    ],
  },
];

/** Flat list of all dimension keys (main + sub) for backwards compatibility */
export function getAllDimensionKeys(): string[] {
  const keys: string[] = [];
  for (const main of HEALTH_TAXONOMY) {
    keys.push(main.key);
    for (const sub of main.subDimensions) {
      keys.push(sub.key);
    }
  }
  return keys;
}

/** Find the main dimension a sub-dimension belongs to */
export function findMainDimension(subKey: string): MainDimension | undefined {
  return HEALTH_TAXONOMY.find(
    (m) => m.key === subKey || m.subDimensions.some((s) => s.key === subKey)
  );
}

/** Find a sub-dimension by key */
export function findSubDimension(key: string): SubDimension | undefined {
  for (const main of HEALTH_TAXONOMY) {
    const sub = main.subDimensions.find((s) => s.key === key);
    if (sub) return sub;
  }
  return undefined;
}

/** Find any dimension (main or sub) by key, returning label and icon */
export function findDimension(key: string): { label: string; icon: LucideIcon } | undefined {
  for (const main of HEALTH_TAXONOMY) {
    if (main.key === key) return { label: main.label, icon: main.icon };
    const sub = main.subDimensions.find((s) => s.key === key);
    if (sub) return { label: sub.label, icon: sub.icon };
  }
  return undefined;
}

/**
 * Map from old flat dimension keys to new taxonomy keys.
 * Used for backward compatibility with existing DB data.
 */
export const OLD_TO_NEW_KEY_MAP: Record<string, string> = {
  senses: "sensory_organs",
  nervous_system: "brain_mental",
  sleep: "sleep_recovery",
  mental_health: "mental_wellbeing",
  substances: "substance_use",
  hormones: "endocrine",
  kidney: "kidneys",
  nutrition: "nutrition",
  physical_performance: "physical_performance",
  musculoskeletal: "musculoskeletal",
  liver: "liver",
  respiratory: "respiratory",
  immunity: "immune_defence",
  cancer_risk: "cancer_risk",
  skin_mucous: "skin",
  cardiovascular: "cardiovascular",
};
