ALTER TABLE public.patient_health_files
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.patient_health_files.source IS 'Where the file came from (e.g. "Onboarding — ECG", "Manual upload").';