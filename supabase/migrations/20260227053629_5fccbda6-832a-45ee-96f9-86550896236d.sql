
-- Active diagnoses for patients
CREATE TABLE public.patient_diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  diagnosis TEXT NOT NULL,
  icd_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  diagnosed_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read diagnoses" ON public.patient_diagnoses FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert diagnoses" ON public.patient_diagnoses FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or doctor can update diagnoses" ON public.patient_diagnoses FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete diagnoses" ON public.patient_diagnoses FOR DELETE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

-- Active medications for patients
CREATE TABLE public.patient_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  indication TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read medications" ON public.patient_medications FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert medications" ON public.patient_medications FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or doctor can update medications" ON public.patient_medications FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete medications" ON public.patient_medications FOR DELETE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

-- Care team members for patients
CREATE TABLE public.patient_care_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'personal_doctor', 'nurse', 'external_specialist'
  member_name TEXT NOT NULL,
  specialty TEXT,
  user_id UUID, -- optional link to app user
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_care_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read care team" ON public.patient_care_team FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert care team" ON public.patient_care_team FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or doctor can update care team" ON public.patient_care_team FOR UPDATE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete care team" ON public.patient_care_team FOR DELETE USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_patient_diagnoses_updated_at BEFORE UPDATE ON public.patient_diagnoses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_medications_updated_at BEFORE UPDATE ON public.patient_medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_care_team_updated_at BEFORE UPDATE ON public.patient_care_team FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
