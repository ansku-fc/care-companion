
-- Allergies table
CREATE TABLE public.patient_allergies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  reaction TEXT,
  severity TEXT NOT NULL DEFAULT 'moderate',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read allergies" ON public.patient_allergies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert allergies" ON public.patient_allergies FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or doctor can update allergies" ON public.patient_allergies FOR UPDATE TO authenticated USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete allergies" ON public.patient_allergies FOR DELETE TO authenticated USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

-- Clinical considerations table
CREATE TABLE public.patient_clinical_considerations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_clinical_considerations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read considerations" ON public.patient_clinical_considerations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert considerations" ON public.patient_clinical_considerations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or doctor can update considerations" ON public.patient_clinical_considerations FOR UPDATE TO authenticated USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete considerations" ON public.patient_clinical_considerations FOR DELETE TO authenticated USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));
