-- Patients: assigned doctor + onboarding lifecycle status
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS assigned_doctor_id uuid,
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS personal_id text,
  ADD COLUMN IF NOT EXISTS primary_language text;

-- Constrain onboarding_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_onboarding_status_check'
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_onboarding_status_check
      CHECK (onboarding_status IN ('pending', 'in_progress', 'complete'));
  END IF;
END$$;

-- Patient onboarding: scored / queryable columns + freeform JSONB blob for the rest
ALTER TABLE public.patient_onboarding
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS shift_work boolean,
  ADD COLUMN IF NOT EXISTS bp1_systolic numeric,
  ADD COLUMN IF NOT EXISTS bp1_diastolic numeric,
  ADD COLUMN IF NOT EXISTS bp2_systolic numeric,
  ADD COLUMN IF NOT EXISTS bp2_diastolic numeric,
  ADD COLUMN IF NOT EXISTS ecg_notes text,
  ADD COLUMN IF NOT EXISTS cardio_easy_hours_per_week numeric,
  ADD COLUMN IF NOT EXISTS cardio_moderate_hours_per_week numeric,
  ADD COLUMN IF NOT EXISTS cardio_vigorous_hours_per_week numeric,
  ADD COLUMN IF NOT EXISTS strength_hours_per_week numeric,
  ADD COLUMN IF NOT EXISTS sedentary_hours_per_day numeric,
  ADD COLUMN IF NOT EXISTS gad2_score integer,
  ADD COLUMN IF NOT EXISTS phq2_score integer,
  ADD COLUMN IF NOT EXISTS draft boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_data jsonb NOT NULL DEFAULT '{}'::jsonb;