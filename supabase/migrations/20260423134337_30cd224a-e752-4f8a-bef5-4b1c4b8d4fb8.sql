-- Extend task_category enum with new spec values
ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'clinical';
ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'referral';
ALTER TYPE public.task_category ADD VALUE IF NOT EXISTS 'administrative';

-- Extend task_status with deferred
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'deferred';

-- Add created_from for tracking origin of auto-generated tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_from text;