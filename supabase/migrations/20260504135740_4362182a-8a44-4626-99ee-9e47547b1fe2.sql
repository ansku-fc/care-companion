-- 1. Remove existing demo/seed tasks of this type
DELETE FROM public.tasks WHERE task_type = 'PATIENT_COMMUNICATION';

-- 2. Recreate the task_type enum without PATIENT_COMMUNICATION
ALTER TYPE public.task_type RENAME TO task_type_old;

CREATE TYPE public.task_type AS ENUM (
  'LAB_DIAGNOSTICS',
  'REFERRAL',
  'PRESCRIPTION',
  'APPOINTMENT_CLINIC',
  'APPOINTMENT_EXTERNAL',
  'ONBOARDING_ADMIN',
  'MONITORING'
);

ALTER TABLE public.tasks
  ALTER COLUMN task_type TYPE public.task_type
  USING task_type::text::public.task_type;

DROP TYPE public.task_type_old;