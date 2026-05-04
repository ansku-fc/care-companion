-- =========================================================================
-- Event-driven task taxonomy
-- =========================================================================

-- 1. Add task_type enum
DO $$ BEGIN
  CREATE TYPE public.task_type AS ENUM (
    'LAB_DIAGNOSTICS',
    'REFERRAL',
    'PRESCRIPTION',
    'APPOINTMENT_CLINIC',
    'APPOINTMENT_EXTERNAL',
    'PATIENT_COMMUNICATION',
    'ONBOARDING_ADMIN',
    'MONITORING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New columns on tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type public.task_type,
  ADD COLUMN IF NOT EXISTS linked_entity_type text,
  ADD COLUMN IF NOT EXISTS linked_entity_id uuid,
  ADD COLUMN IF NOT EXISTS auto_close_event text;

-- 3. Helpful index for matching by linked entity
CREATE INDEX IF NOT EXISTS idx_tasks_linked_entity
  ON public.tasks (linked_entity_type, linked_entity_id);

CREATE INDEX IF NOT EXISTS idx_tasks_task_type
  ON public.tasks (task_type);
