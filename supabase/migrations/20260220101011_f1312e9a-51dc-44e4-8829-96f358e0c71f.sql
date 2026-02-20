
ALTER TABLE public.appointments
ADD COLUMN lab_package text DEFAULT NULL,
ADD COLUMN lab_tests_selected jsonb DEFAULT NULL;
