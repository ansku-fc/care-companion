// Single source of truth for per-patient health dimension risk scores.
// Both PatientOverviewView (bar chart) and HealthDataView (grid cards)
// must use this function so the displayed scores stay in sync.
import type { Tables } from "@/integrations/supabase/types";

export interface DimensionScoreContext {
  patientId: string;
  onboarding: Tables<"patient_onboarding"> | null;
  labResults: Tables<"patient_lab_results">[];
  healthCategories: Tables<"patient_health_categories">[];
}

export function dimensionScore(key: string, ctx: DimensionScoreContext): number {
  const { patientId, onboarding, labResults, healthCategories } = ctx;
  const pid = patientId ?? "";
  const r = (i: number) =>
    ((pid.charCodeAt(i % Math.max(pid.length, 1)) || 5) * 37 % 20) / 20;
  const sorted = [...labResults].sort((a, b) =>
    b.result_date.localeCompare(a.result_date),
  );
  const latest = sorted[0];
  const ldl = latest?.ldl_mmol_l ?? null;
  const hba1c = latest?.hba1c_mmol_mol ?? null;
  const alat = latest?.alat_u_l ?? null;
  const bmi = onboarding?.bmi ?? null;
  const cat = (catKey: string) => {
    const c = healthCategories.find((h) => h.category === catKey);
    switch (c?.status) {
      case "issue": return 7.0 + r(0) * 2.5;
      case "mild":  return 4.0 + r(1) * 2.5;
      default:      return 1.5 + r(2) * 2.0;
    }
  };
  const round = (n: number) => Math.round(n * 10) / 10;
  switch (key) {
    case "cardiovascular": {
      const base = cat("cardiovascular");
      return round(Math.min(10, ldl ? (ldl > 4.0 ? base + 1.0 : ldl > 3.0 ? base : Math.max(1, base - 1.0)) : base));
    }
    case "metabolic": {
      const base = cat("metabolic");
      return round(Math.min(10, hba1c ? (hba1c > 53 ? base + 1.5 : hba1c > 42 ? base : Math.max(1, base - 1.0)) : base));
    }
    case "digestion": {
      const base = cat("digestion");
      return round(Math.min(10, alat ? (alat > 50 ? base + 1.0 : alat > 40 ? base : Math.max(1, base - 0.5)) : base));
    }
    case "exercise_functional":
      return round(bmi ? (bmi > 35 ? 7.0 + r(3) : bmi > 30 ? 5.5 + r(4) : bmi > 25 ? 3.5 + r(5) : 1.5 + r(6)) : cat("exercise_functional"));
    case "brain_mental":         return round(cat("brain_mental_health"));
    case "respiratory_immune":   return round(cat("respiratory_immune"));
    case "cancer_risk":          return round(cat("cancer_risk"));
    case "skin_oral_mucosal":    return round(cat("skin_oral_mucosal"));
    case "reproductive_sexual":  return round(cat("reproductive_sexual"));
    default:                     return round(1.5 + r(2) * 2.0);
  }
}
