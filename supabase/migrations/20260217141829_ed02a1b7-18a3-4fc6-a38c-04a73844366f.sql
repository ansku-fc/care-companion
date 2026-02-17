
ALTER TABLE public.patient_onboarding
  ADD COLUMN symptom_smell boolean DEFAULT false,
  ADD COLUMN symptom_vision boolean DEFAULT false,
  ADD COLUMN symptom_hearing boolean DEFAULT false,
  ADD COLUMN symptom_neurological boolean DEFAULT false,
  ADD COLUMN symptom_immune_allergies boolean DEFAULT false,
  ADD COLUMN symptom_respiratory boolean DEFAULT false,
  ADD COLUMN symptom_skin_rash boolean DEFAULT false,
  ADD COLUMN symptom_menstruation_menopause boolean DEFAULT false,
  ADD COLUMN symptom_mucous_membranes boolean DEFAULT false,
  ADD COLUMN symptom_mobility_restriction boolean DEFAULT false,
  ADD COLUMN symptom_kidney_function boolean DEFAULT false,
  ADD COLUMN symptom_joint_pain boolean DEFAULT false,
  ADD COLUMN symptom_gastrointestinal boolean DEFAULT false,
  ADD COLUMN symptom_balance boolean DEFAULT false,
  ADD COLUMN symptom_sleep_apnoea boolean DEFAULT false;
