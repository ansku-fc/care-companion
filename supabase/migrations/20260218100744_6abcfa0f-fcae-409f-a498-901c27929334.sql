
ALTER TABLE public.patient_lab_results
ADD COLUMN pef_percent numeric NULL,
ADD COLUMN fev1_percent numeric NULL,
ADD COLUMN fvc_percent numeric NULL;
