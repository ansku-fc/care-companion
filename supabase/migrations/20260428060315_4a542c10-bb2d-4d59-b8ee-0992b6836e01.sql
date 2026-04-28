-- Persisted activity feed
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  title text NOT NULL,
  patient_id uuid,
  patient_name text,
  actor_name text NOT NULL DEFAULT 'System',
  actor_type text NOT NULL DEFAULT 'system',
  section text NOT NULL DEFAULT 'overview',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read activity log" ON public.activity_log;
CREATE POLICY "Authenticated can read activity log"
ON public.activity_log
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert activity log" ON public.activity_log;
CREATE POLICY "Authenticated can insert activity log"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator or doctor can update activity log" ON public.activity_log;
CREATE POLICY "Creator or doctor can update activity log"
ON public.activity_log
FOR UPDATE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role))
WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Creator or doctor can delete activity log" ON public.activity_log;
CREATE POLICY "Creator or doctor can delete activity log"
ON public.activity_log
FOR DELETE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_patient_id ON public.activity_log (patient_id);

DROP TRIGGER IF EXISTS update_activity_log_updated_at ON public.activity_log;
CREATE TRIGGER update_activity_log_updated_at
BEFORE UPDATE ON public.activity_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Structured family history persisted from onboarding
CREATE TABLE IF NOT EXISTS public.patient_family_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  relative text NOT NULL,
  illness_name text NOT NULL,
  icd_code text,
  age_at_diagnosis integer,
  deceased boolean NOT NULL DEFAULT false,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_family_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read family history" ON public.patient_family_history;
CREATE POLICY "Authenticated can read family history"
ON public.patient_family_history
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert family history" ON public.patient_family_history;
CREATE POLICY "Authenticated can insert family history"
ON public.patient_family_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator or doctor can update family history" ON public.patient_family_history;
CREATE POLICY "Creator or doctor can update family history"
ON public.patient_family_history
FOR UPDATE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role))
WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Creator or doctor can delete family history" ON public.patient_family_history;
CREATE POLICY "Creator or doctor can delete family history"
ON public.patient_family_history
FOR DELETE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE INDEX IF NOT EXISTS idx_patient_family_history_patient_id ON public.patient_family_history (patient_id);
DROP TRIGGER IF EXISTS update_patient_family_history_updated_at ON public.patient_family_history;
CREATE TRIGGER update_patient_family_history_updated_at
BEFORE UPDATE ON public.patient_family_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Structured supplements persisted from onboarding
CREATE TABLE IF NOT EXISTS public.patient_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  supplement_name text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_supplements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read supplements" ON public.patient_supplements;
CREATE POLICY "Authenticated can read supplements"
ON public.patient_supplements
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert supplements" ON public.patient_supplements;
CREATE POLICY "Authenticated can insert supplements"
ON public.patient_supplements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator or doctor can update supplements" ON public.patient_supplements;
CREATE POLICY "Creator or doctor can update supplements"
ON public.patient_supplements
FOR UPDATE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role))
WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Creator or doctor can delete supplements" ON public.patient_supplements;
CREATE POLICY "Creator or doctor can delete supplements"
ON public.patient_supplements
FOR DELETE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE INDEX IF NOT EXISTS idx_patient_supplements_patient_id ON public.patient_supplements (patient_id);
DROP TRIGGER IF EXISTS update_patient_supplements_updated_at ON public.patient_supplements;
CREATE TRIGGER update_patient_supplements_updated_at
BEFORE UPDATE ON public.patient_supplements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Structured mole assessments persisted from onboarding
CREATE TABLE IF NOT EXISTS public.patient_moles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  mole_key text NOT NULL,
  label text NOT NULL,
  side text NOT NULL DEFAULT 'front',
  pin_x numeric,
  pin_y numeric,
  location text,
  asymmetry text,
  borders text,
  color text,
  size text,
  change text,
  symptoms text,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (patient_id, mole_key)
);

ALTER TABLE public.patient_moles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read moles" ON public.patient_moles;
CREATE POLICY "Authenticated can read moles"
ON public.patient_moles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert moles" ON public.patient_moles;
CREATE POLICY "Authenticated can insert moles"
ON public.patient_moles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator or doctor can update moles" ON public.patient_moles;
CREATE POLICY "Creator or doctor can update moles"
ON public.patient_moles
FOR UPDATE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role))
WITH CHECK ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Creator or doctor can delete moles" ON public.patient_moles;
CREATE POLICY "Creator or doctor can delete moles"
ON public.patient_moles
FOR DELETE
TO authenticated
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE INDEX IF NOT EXISTS idx_patient_moles_patient_id ON public.patient_moles (patient_id);
DROP TRIGGER IF EXISTS update_patient_moles_updated_at ON public.patient_moles;
CREATE TRIGGER update_patient_moles_updated_at
BEFORE UPDATE ON public.patient_moles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Required for reliable upserts used by onboarding and health category editors
CREATE UNIQUE INDEX IF NOT EXISTS patient_onboarding_patient_id_key ON public.patient_onboarding (patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS patient_health_categories_patient_category_key ON public.patient_health_categories (patient_id, category);