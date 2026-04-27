ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'annual_checkup';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'acute_consultation';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'care_coordination';