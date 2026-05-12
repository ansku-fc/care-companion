import type { Tables } from "@/integrations/supabase/types";

type Onboarding = Tables<"patient_onboarding"> | null;
type Allergy = Tables<"patient_allergies">;
type FamilyHist = Tables<"patient_family_history">;
type Mole = Tables<"patient_moles">;
type Patient = Tables<"patients"> | null;

export interface RiskContext {
  onboarding: Onboarding;
  allergies?: Allergy[];
  familyHistory?: FamilyHist[];
  moles?: Mole[];
  patient?: Patient;
}

const isFemale = (p: Patient) => (p?.gender ?? "").toLowerCase().startsWith("f");

const isHigh = (v: any) => {
  if (typeof v === "number") return v >= 4;
  const s = String(v ?? "").toLowerCase();
  return s === "high" || s === "very high" || s === "very_high";
};
const isLow = (v: any) => {
  if (typeof v === "number") return v <= 2;
  const s = String(v ?? "").toLowerCase();
  return s === "low" || s === "very low" || s === "very_low" || s === "rarely" || s === "never";
};
const isPoor = (v: any) => {
  if (typeof v === "number") return v <= 2;
  const s = String(v ?? "").toLowerCase();
  return s === "poor" || s === "very poor" || s === "very_poor";
};

function familyHas(fh: FamilyHist[] | undefined, keywords: string[]) {
  if (!fh) return false;
  return fh.some((r) => {
    const t = `${r.illness_name ?? ""} ${r.icd_code ?? ""}`.toLowerCase();
    return keywords.some((k) => t.includes(k));
  });
}

export function getRiskFactorsForDimension(ctx: RiskContext, dimensionKey: string): string[] {
  const ob = ctx.onboarding;
  if (!ob) return [];
  const extra = ((ob.extra_data as any) ?? {}) as Record<string, any>;
  const out: string[] = [];

  const smokingActive = (() => {
    const s = String(ob.smoking ?? "").toLowerCase();
    return s === "current" || s === "yes" || s === "active" || s === "daily";
  })();
  const formerSmoker = (() => {
    const s = String(ob.smoking ?? "").toLowerCase();
    return s === "former" || s === "previous" || s === "ex";
  })();
  const yearsSmoked = Number(extra.years_smoked ?? extra.smoking_years ?? 0);
  const cigsPerDay = Number(extra.cigarettes_per_day ?? 0);
  const nicotinePouches = !!extra.nicotine_pouches;
  const alcohol = Number(ob.alcohol_units_per_week ?? 0);
  const female = isFemale(ctx.patient ?? null);
  const alcoholLimit = female ? 14 : 21;

  const cardioMins =
    (Number(ob.cardio_moderate_hours_per_week ?? 0) + Number(ob.cardio_vigorous_hours_per_week ?? 0)) * 60;

  const sysMax = Math.max(Number(ob.bp1_systolic ?? 0), Number(ob.bp2_systolic ?? 0));
  const diaMax = Math.max(Number(ob.bp1_diastolic ?? 0), Number(ob.bp2_diastolic ?? 0));

  switch (dimensionKey) {
    case "brain_mental": {
      if (ob.shift_work) out.push("Shift work or irregular working hours");
      if (ob.high_stress_environment) out.push("High-stress work environment");
      if (isPoor(ob.sleep_quality)) out.push("Poor sleep quality reported");
      const sl = Number(ob.sleep_hours_per_night ?? 0);
      if (sl > 0 && (sl < 6 || sl > 9)) out.push(`Sleep duration outside healthy range (${sl}h/night)`);
      if (ob.symptom_sleep_apnoea || extra.sleep_apnea) {
        const sev = extra.sleep_apnea_severity ? ` (${extra.sleep_apnea_severity})` : "";
        out.push(`Diagnosed sleep apnea${sev}`);
      }
      if (ob.insomnia) out.push("Diagnosed insomnia");
      if (isHigh(ob.stress_perceived)) out.push("High perceived stress levels");
      if ((ob.gad2_score ?? 0) >= 3) out.push("Anxiety symptoms reported (GAD-2)");
      if ((ob.phq2_score ?? 0) >= 3) out.push("Depressive symptoms reported (PHQ-2)");
      if (ob.other_substances) out.push("Recreational drug use reported");
      if (alcohol > alcoholLimit) out.push("Alcohol consumption above recommended limits");
      break;
    }
    case "metabolic": {
      const bmi = Number(ob.bmi ?? 0);
      if (bmi > 30) out.push(`BMI in obese range (${bmi.toFixed(1)})`);
      else if (bmi > 25) out.push(`BMI elevated (${bmi.toFixed(1)})`);
      const waist = Number(ob.waist_circumference_cm ?? 0);
      const waistLimit = female ? 80 : 94;
      if (waist > waistLimit) out.push(`Waist circumference elevated (${waist}cm)`);
      const height = Number(ob.height_cm ?? 0);
      if (height > 0 && waist > 0 && waist / height > 0.5) out.push("Waist-to-height ratio elevated");
      const sed = Number(ob.sedentary_hours_per_day ?? 0);
      if (sed > 8) out.push(`Highly sedentary lifestyle (${sed}h/day)`);
      if (isHigh(ob.sugar_g_per_day) || isHigh(extra.sugar_intake)) out.push("High sugar intake reported");
      if (isLow(extra.water_intake)) out.push("Low daily water intake");
      if (extra.thyroid_finding === "abnormal") out.push("Abnormal thyroid finding on examination");
      if (ob.shift_work) out.push("Shift work (metabolic disruption risk)");
      break;
    }
    case "cardiovascular": {
      if (smokingActive) {
        const detail = cigsPerDay && yearsSmoked ? ` (${cigsPerDay} cigarettes/day, ${yearsSmoked} years)` : "";
        out.push(`Active smoker${detail}`);
      } else if (formerSmoker && yearsSmoked > 10) {
        out.push(`Former smoker (${yearsSmoked} years)`);
      }
      if (alcohol > alcoholLimit) out.push("Alcohol consumption above recommended limits");
      if (ob.high_stress_environment) out.push("High-stress work environment");
      if (isHigh(ob.stress_perceived)) out.push("High perceived stress");
      if (Number(ob.sedentary_hours_per_day ?? 0) > 8) out.push("Highly sedentary lifestyle");
      if (cardioMins > 0 && cardioMins < 150) out.push("Insufficient cardiovascular exercise");
      if (isHigh(ob.sodium_g_per_day) || isHigh(extra.salt_intake)) out.push("High salt intake");
      if (isHigh(ob.red_meat_g_per_day) || isHigh(extra.red_meat)) out.push("High red meat consumption");
      if (isLow(ob.fish_g_per_day) || isLow(extra.fish_consumption)) out.push("Low fish consumption");
      if (familyHas(ctx.familyHistory, ["cardio", "heart", "infarct", "stroke", "i21", "i25", "i63"]))
        out.push("Family history of cardiovascular disease");
      if (nicotinePouches) out.push("Nicotine pouch use");
      if (sysMax > 130 || diaMax > 85)
        out.push(`Elevated blood pressure (${sysMax || "-"}/${diaMax || "-"} mmHg)`);
      if (extra.heart_finding === "abnormal") out.push("Abnormal cardiac finding on examination");
      const waist = Number(ob.waist_circumference_cm ?? 0);
      const waistLimit = female ? 80 : 94;
      if (waist > waistLimit) out.push(`Central adiposity (waist circumference ${waist}cm)`);
      break;
    }
    case "exercise_functional": {
      const met = Number(ob.exercise_met_hours ?? 0);
      if (met > 0 && met < 8.75) out.push("Low weekly physical activity");
      if (Number(ob.strength_hours_per_week ?? 0) === 0) out.push("No strength training reported");
      const sed = Number(ob.sedentary_hours_per_day ?? 0);
      if (sed > 8) out.push(`Highly sedentary (${sed}h/day)`);
      if (isPoor(ob.sleep_quality)) out.push("Poor sleep quality (affects recovery)");
      const fatigue = String(extra.daytime_fatigue ?? "").toLowerCase();
      if (fatigue === "frequent" || fatigue === "always") out.push("Frequent daytime fatigue");
      if (extra.musculoskeletal_finding === "abnormal") out.push("Musculoskeletal finding on examination");
      if (isPoor(extra.perceived_recovery)) out.push("Poor perceived recovery");
      break;
    }
    case "digestion": {
      if (alcohol > alcoholLimit) out.push("Alcohol consumption (liver & gut risk)");
      const fiber = Number(ob.fiber_g_per_day ?? 0);
      if (fiber > 0 && fiber < 25) out.push("Low dietary fiber intake");
      const fv = Number(ob.fruits_vegetables_g_per_day ?? 0);
      if (fv > 0 && fv < 400) out.push("Low fruit and vegetable intake");
      if (isHigh(ob.red_meat_g_per_day) || isHigh(extra.red_meat))
        out.push("High red meat consumption (colorectal risk)");
      if (isHigh(ob.sugar_g_per_day) || isHigh(extra.sugar_intake)) out.push("High sugar intake");
      if (extra.colorectum_precancerous) out.push("History of colorectal polyp");
      if (extra.colorectum_screening_overdue) out.push("Colorectal screening overdue");
      if (extra.abdomen_finding === "abnormal") out.push("Abnormal abdominal finding on examination");
      break;
    }
    case "respiratory_immune": {
      if (smokingActive) out.push("Active smoker (respiratory risk)");
      if (ob.occupational_hazards) {
        if (ob.hazard_physical) out.push("Physical occupational hazard exposure");
        if (ob.hazard_biological) out.push("Biological occupational hazard exposure");
        if (ob.hazard_chemical) out.push("Chemical occupational hazard exposure");
      }
      if (ctx.allergies && ctx.allergies.length > 0) {
        const list = ctx.allergies.map((a) => a.allergen).filter(Boolean).join(", ");
        out.push(`Known allergies: ${list}`);
      }
      if (ob.symptom_sleep_apnoea || extra.sleep_apnea) out.push("Sleep apnea (respiratory)");
      if (extra.lung_screening_overdue) out.push("Lung screening overdue");
      if (extra.lungs_finding === "abnormal") out.push("Abnormal lung finding on examination");
      if (extra.lymph_nodes_finding === "abnormal") out.push("Abnormal lymph node finding");
      break;
    }
    case "cancer_risk": {
      if (smokingActive) out.push("Active smoker (lung cancer risk)");
      if (alcohol > alcoholLimit) out.push("Alcohol consumption (cancer risk)");
      if (isHigh(ob.red_meat_g_per_day) || isHigh(extra.red_meat))
        out.push("High red meat consumption (colorectal risk)");
      const sunProt = String(extra.sun_protection ?? "").toLowerCase();
      if (ob.sun_exposure && (sunProt === "none" || sunProt === "rarely" || sunProt === ""))
        out.push("Unprotected sun exposure");
      if (extra.severe_sunburns) out.push("History of severe sunburns");
      if (extra.skin_precancerous) out.push("History of skin precancerous change");
      if (extra.colorectum_precancerous) out.push("History of colorectal polyp");
      if (extra.cervix_precancerous) out.push("History of CIN");
      if (
        ob.genetic_cancer ||
        ob.genetic_melanoma ||
        familyHas(ctx.familyHistory, ["cancer", "carcinoma", "melanoma", "tumor", "tumour", "neoplasm"])
      )
        out.push("Family history of cancer");
      if (ob.cancer_screening_breast === false) out.push("Breast screening overdue");
      if (ob.cancer_screening_cervical === false) out.push("Cervical screening overdue");
      if (extra.prostate_screening_overdue) out.push("Prostate screening overdue");
      if (extra.skin_screening_overdue) out.push("Skin (dermatoscopy) screening overdue");
      const packYears = (cigsPerDay / 20) * yearsSmoked;
      if (smokingActive && packYears > 20 && extra.lung_ct_overdue !== false)
        out.push("Lung CT screening overdue");
      if (extra.lymph_nodes_finding === "abnormal") out.push("Abnormal lymph node finding");
      if (extra.skin_finding === "abnormal") out.push("Abnormal skin finding on examination");
      break;
    }
    case "skin_oral_mucosal": {
      const sunProt = String(extra.sun_protection ?? "").toLowerCase();
      if (ob.sun_exposure && (sunProt === "none" || sunProt === "rarely" || sunProt === ""))
        out.push("Unprotected sun exposure");
      if (extra.severe_sunburns) out.push("History of severe sunburns");
      if (extra.skin_precancerous) out.push("History of skin precancerous change");
      if (nicotinePouches) out.push("Nicotine pouch use (oral mucosal risk)");
      if (smokingActive) out.push("Smoking (oral mucosal risk)");
      const lesions = Number(extra.skin_lesions_count ?? 0);
      if (lesions > 0) out.push(`Skin lesions noted: ${lesions} lesion(s)`);
      if (extra.skin_finding === "abnormal") out.push("Abnormal skin finding on examination");
      if ((ctx.moles?.length ?? 0) > 0) out.push("Moles documented — monitoring recommended");
      break;
    }
    case "reproductive_sexual": {
      if (extra.cervix_precancerous) out.push("History of CIN");
      if (extra.prostate_screening_overdue) out.push("Prostate screening overdue");
      if (ob.cancer_screening_cervical === false) out.push("Cervical screening overdue");
      break;
    }
  }

  // Dedupe while preserving order
  return Array.from(new Set(out));
}
