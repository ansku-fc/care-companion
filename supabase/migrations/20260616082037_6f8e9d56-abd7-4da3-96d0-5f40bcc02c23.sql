
ALTER TABLE public.patient_lab_results
  ADD COLUMN IF NOT EXISTS total_cholesterol_mmol_l numeric,
  ADD COLUMN IF NOT EXISTS hdl_mmol_l numeric,
  ADD COLUMN IF NOT EXISTS triglycerides_mmol_l numeric;
