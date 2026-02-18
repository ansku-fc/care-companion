
-- Create patient_lab_results table
CREATE TABLE public.patient_lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  result_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'file_upload'
  source_filename TEXT,
  -- Cardiovascular & Metabolic Health
  ldl_mmol_l NUMERIC,
  hba1c_mmol_mol NUMERIC,
  blood_pressure_systolic NUMERIC,
  blood_pressure_diastolic NUMERIC,
  -- Liver Function
  alat_u_l NUMERIC,
  afos_alp_u_l NUMERIC,
  gt_u_l NUMERIC,
  alat_asat_ratio NUMERIC,
  -- Kidney Function
  egfr NUMERIC,
  cystatin_c NUMERIC,
  u_alb_krea_abnormal BOOLEAN,
  -- Endocrine & Hormonal Health
  tsh_mu_l NUMERIC,
  testosterone_estrogen_abnormal BOOLEAN,
  -- Genetics & Risk Markers
  apoe_e4 BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_lab_results ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can insert lab results"
ON public.patient_lab_results FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated can read lab results"
ON public.patient_lab_results FOR SELECT
USING (true);

CREATE POLICY "Creator or doctor can update lab results"
ON public.patient_lab_results FOR UPDATE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Creator or doctor can delete lab results"
ON public.patient_lab_results FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_patient_lab_results_updated_at
BEFORE UPDATE ON public.patient_lab_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
