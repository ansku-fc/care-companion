
-- Drop the renewals table
DROP TABLE IF EXISTS public.patient_medication_renewals;

-- Remove prescription columns from patient_medications
ALTER TABLE public.patient_medications
  DROP COLUMN IF EXISTS quantity_prescribed,
  DROP COLUMN IF EXISTS quantity_remaining,
  DROP COLUMN IF EXISTS days_supply,
  DROP COLUMN IF EXISTS refills_total,
  DROP COLUMN IF EXISTS refills_remaining,
  DROP COLUMN IF EXISTS prescription_start_date,
  DROP COLUMN IF EXISTS prescription_end_date;

-- Create medication change log table
CREATE TABLE public.patient_medication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id uuid NOT NULL REFERENCES public.patient_medications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  change_date date NOT NULL DEFAULT CURRENT_DATE,
  change_type text NOT NULL DEFAULT 'dose_adjustment',
  previous_dose text DEFAULT NULL,
  new_dose text DEFAULT NULL,
  previous_frequency text DEFAULT NULL,
  new_frequency text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read medication logs" ON public.patient_medication_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert medication logs" ON public.patient_medication_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);
CREATE POLICY "Creator or doctor can update medication logs" ON public.patient_medication_logs FOR UPDATE TO authenticated USING ((auth.uid() = changed_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete medication logs" ON public.patient_medication_logs FOR DELETE TO authenticated USING ((auth.uid() = changed_by) OR has_role(auth.uid(), 'doctor'::app_role));
