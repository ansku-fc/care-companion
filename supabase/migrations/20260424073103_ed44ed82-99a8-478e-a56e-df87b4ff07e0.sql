ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'doctor_meeting';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'nurse_task';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'working_time';