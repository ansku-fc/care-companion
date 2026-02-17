
ALTER TABLE public.patient_onboarding
  ADD COLUMN prev_brain_damage_notes text,
  ADD COLUMN prev_osteoporotic_fracture_notes text,
  ADD COLUMN prev_cancer_notes text,
  ADD COLUMN prev_precancerous_notes text;
