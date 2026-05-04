-- Update patient_onboarding for new Basic Info fields
ALTER TABLE public.patient_onboarding DROP COLUMN IF EXISTS education_level;

-- Convert occupation to text[] (multi-select)
ALTER TABLE public.patient_onboarding 
  ALTER COLUMN occupation DROP DEFAULT,
  ALTER COLUMN occupation TYPE text[] USING (
    CASE 
      WHEN occupation IS NULL OR occupation = '' THEN '{}'::text[]
      ELSE ARRAY[occupation]::text[]
    END
  ),
  ALTER COLUMN occupation SET DEFAULT '{}'::text[];

-- New work-condition booleans
ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS occupational_hazards boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazard_physical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazard_biological boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazard_chemical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS high_stress_environment boolean NOT NULL DEFAULT false;
