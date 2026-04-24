ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS coordination_category text,
  ADD COLUMN IF NOT EXISTS other_doctor_name text;