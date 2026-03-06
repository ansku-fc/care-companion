
-- Create patient_health_files table
CREATE TABLE public.patient_health_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  file_category TEXT NOT NULL, -- 'mole_image', 'radiology', 'ekg', 'oura', 'apple_health'
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_health_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read health files" ON public.patient_health_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert health files" ON public.patient_health_files FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or doctor can update health files" ON public.patient_health_files FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));
CREATE POLICY "Creator or doctor can delete health files" ON public.patient_health_files FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-health-files', 'patient-health-files', false);

-- Storage RLS policies
CREATE POLICY "Authenticated can upload health files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-health-files');
CREATE POLICY "Authenticated can read health files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-health-files');
CREATE POLICY "Creator or doctor can delete health files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-health-files');
