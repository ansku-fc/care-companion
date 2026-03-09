
-- Add prescription tracking columns to patient_medications
ALTER TABLE public.patient_medications 
  ADD COLUMN quantity_prescribed integer DEFAULT NULL,
  ADD COLUMN quantity_remaining integer DEFAULT NULL,
  ADD COLUMN days_supply integer DEFAULT NULL,
  ADD COLUMN refills_total integer DEFAULT 0,
  ADD COLUMN refills_remaining integer DEFAULT 0,
  ADD COLUMN prescription_start_date date DEFAULT NULL,
  ADD COLUMN prescription_end_date date DEFAULT NULL;

-- Create prescription renewal history table
CREATE TABLE public.patient_medication_renewals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id uuid NOT NULL REFERENCES public.patient_medications(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  renewed_by uuid NOT NULL,
  renewal_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_prescribed integer DEFAULT NULL,
  days_supply integer DEFAULT NULL,
  refills_granted integer DEFAULT 0,
  notes text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_medication_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read renewals" ON public.patient_medication_renewals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert renewals" ON public.patient_medication_renewals FOR INSERT TO authenticated WITH CHECK (auth.uid() = renewed_by);
CREATE POLICY "Creator or doctor can update renewals" ON public.patient_medication_renewals FOR UPDATE TO authenticated USING ((auth.uid() = renewed_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete renewals" ON public.patient_medication_renewals FOR DELETE TO authenticated USING ((auth.uid() = renewed_by) OR has_role(auth.uid(), 'doctor'::app_role));
