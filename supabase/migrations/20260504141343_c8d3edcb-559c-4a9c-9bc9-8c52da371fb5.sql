
-- ============================================================================
-- PHASE 1: Episodes (clinical outcome layer) + visit_type on appointments
-- ============================================================================

-- 1. Enums
CREATE TYPE public.episode_type AS ENUM (
  'DIAGNOSTIC',
  'TREATMENT',
  'REFERRAL',
  'MONITORING',
  'CARE_COORDINATION'
);

CREATE TYPE public.episode_status AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE public.episode_urgency AS ENUM ('ROUTINE', 'ELEVATED', 'URGENT');

CREATE TYPE public.visit_type AS ENUM (
  'ANNUAL_CHECKUP',
  'ACUTE_CONSULTATION',
  'LAB_VISIT',
  'FOLLOWUP_CONSULTATION',
  'NURSE_CONSULTATION',
  'RESULTS_REVIEW_CALL'
);

-- 2. Episodes table
CREATE TABLE public.episodes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL,
  episode_type  public.episode_type NOT NULL,
  title         text NOT NULL,
  status        public.episode_status NOT NULL DEFAULT 'ACTIVE',
  urgency       public.episode_urgency NOT NULL DEFAULT 'ROUTINE',
  triggered_by  text,
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz
);

CREATE INDEX idx_episodes_patient ON public.episodes(patient_id);
CREATE INDEX idx_episodes_status  ON public.episodes(status);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read episodes"
  ON public.episodes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated can insert episodes"
  ON public.episodes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or doctor can update episodes"
  ON public.episodes FOR UPDATE TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Creator or doctor can delete episodes"
  ON public.episodes FOR DELETE TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE TRIGGER trg_episodes_updated_at
  BEFORE UPDATE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tasks: link to episode + parent (for chained/dependent tasks)
ALTER TABLE public.tasks
  ADD COLUMN episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN sequence_order integer;

CREATE INDEX idx_tasks_episode ON public.tasks(episode_id);
CREATE INDEX idx_tasks_parent  ON public.tasks(parent_task_id);

-- 4. Appointments: visit type + auto-generated patient invite text
ALTER TABLE public.appointments
  ADD COLUMN visit_type public.visit_type,
  ADD COLUMN patient_invite_text text;
