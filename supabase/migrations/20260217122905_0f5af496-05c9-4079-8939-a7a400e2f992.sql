
-- Patient onboarding data: stores all interview information
CREATE TABLE public.patient_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Basic information
  age INTEGER,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  waist_circumference_cm NUMERIC,
  waist_to_hip_ratio NUMERIC,
  bmi NUMERIC,

  -- Lifestyle
  exercise_met_hours NUMERIC,
  smoking TEXT CHECK (smoking IN ('yes', 'previously', 'no')),
  sun_exposure BOOLEAN,
  alcohol_units_per_week NUMERIC,
  other_substances BOOLEAN,
  other_substances_notes TEXT,

  -- Nutrition
  fruits_vegetables_g_per_day NUMERIC,
  fish_g_per_day NUMERIC,
  fiber_g_per_day NUMERIC,
  red_meat_g_per_day NUMERIC,
  sugar_g_per_day NUMERIC,
  sodium_g_per_day NUMERIC,

  -- Sleep
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  deep_sleep_percent NUMERIC,
  sleep_hours_per_night NUMERIC,
  insomnia BOOLEAN,

  -- Mental health
  gad7_score INTEGER CHECK (gad7_score BETWEEN 0 AND 21),
  substance_use_perceived INTEGER CHECK (substance_use_perceived BETWEEN 1 AND 10),
  social_support_perceived INTEGER CHECK (social_support_perceived BETWEEN 1 AND 10),
  stress_perceived INTEGER CHECK (stress_perceived BETWEEN 1 AND 10),
  job_strain_perceived INTEGER CHECK (job_strain_perceived BETWEEN 1 AND 10),

  -- Current illnesses
  illness_senses BOOLEAN DEFAULT false,
  illness_senses_notes TEXT,
  illness_neurological BOOLEAN DEFAULT false,
  illness_hormone BOOLEAN DEFAULT false,
  illness_immune BOOLEAN DEFAULT false,
  illness_liver BOOLEAN DEFAULT false,
  illness_mental_health BOOLEAN DEFAULT false,
  illness_mental_health_notes TEXT,
  illness_kidney BOOLEAN DEFAULT false,
  illness_kidney_notes TEXT,
  illness_gastrointestinal BOOLEAN DEFAULT false,
  illness_gastrointestinal_notes TEXT,
  illness_cardiovascular BOOLEAN DEFAULT false,
  illness_cardiovascular_notes TEXT,
  illness_cancer BOOLEAN DEFAULT false,
  illness_cancer_notes TEXT,
  illness_musculoskeletal BOOLEAN DEFAULT false,
  illness_musculoskeletal_notes TEXT,

  -- Previous illnesses
  prev_brain_damage BOOLEAN DEFAULT false,
  prev_osteoporotic_fracture BOOLEAN DEFAULT false,
  prev_cancer BOOLEAN DEFAULT false,
  prev_precancerous BOOLEAN DEFAULT false,

  -- Genetic predispositions
  genetic_nervous_system BOOLEAN DEFAULT false,
  genetic_cardiovascular BOOLEAN DEFAULT false,
  genetic_melanoma BOOLEAN DEFAULT false,
  genetic_cancer BOOLEAN DEFAULT false,

  -- Other information
  skin_condition INTEGER CHECK (skin_condition BETWEEN 1 AND 10),
  infections_per_year NUMERIC,
  vision_acuity INTEGER CHECK (vision_acuity BETWEEN 1 AND 10),
  cancer_screening_breast BOOLEAN,
  cancer_screening_cervical BOOLEAN,
  cancer_screening_colorectal BOOLEAN
);

-- Enable RLS
ALTER TABLE public.patient_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read onboarding" ON public.patient_onboarding FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert onboarding" ON public.patient_onboarding FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update onboarding" ON public.patient_onboarding FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

-- Unique constraint: one onboarding per patient
CREATE UNIQUE INDEX idx_patient_onboarding_patient ON public.patient_onboarding(patient_id);

-- Auto-update timestamp
CREATE TRIGGER update_patient_onboarding_updated_at
  BEFORE UPDATE ON public.patient_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
