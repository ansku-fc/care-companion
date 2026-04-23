-- Add billing columns to patients
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS payer_same_as_patient boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS billing_email text;

-- Patient relationships (e.g., spouse, parent, child)
CREATE TABLE IF NOT EXISTS public.patient_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  related_patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, related_patient_id, relationship_type)
);

ALTER TABLE public.patient_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read patient relationships"
  ON public.patient_relationships FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert patient relationships"
  ON public.patient_relationships FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or doctor can update patient relationships"
  ON public.patient_relationships FOR UPDATE
  TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Creator or doctor can delete patient relationships"
  ON public.patient_relationships FOR DELETE
  TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE TRIGGER trg_patient_relationships_updated_at
  BEFORE UPDATE ON public.patient_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_patient_relationships_patient ON public.patient_relationships(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_relationships_related ON public.patient_relationships(related_patient_id);