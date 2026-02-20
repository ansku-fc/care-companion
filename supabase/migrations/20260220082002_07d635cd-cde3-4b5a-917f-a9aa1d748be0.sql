
ALTER TABLE public.appointments
  ADD COLUMN visit_modality text NOT NULL DEFAULT 'in_person',
  ADD COLUMN is_home_visit boolean NOT NULL DEFAULT false,
  ADD COLUMN is_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN is_nurse_visit boolean NOT NULL DEFAULT false,
  ADD COLUMN is_labs boolean NOT NULL DEFAULT false,
  ADD COLUMN is_external_specialist boolean NOT NULL DEFAULT false,
  ADD COLUMN specialist_name text,
  ADD COLUMN specialist_location text;
