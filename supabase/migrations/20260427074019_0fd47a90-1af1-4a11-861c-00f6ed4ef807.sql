ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS referral_progress JSONB NOT NULL DEFAULT '{}'::jsonb;