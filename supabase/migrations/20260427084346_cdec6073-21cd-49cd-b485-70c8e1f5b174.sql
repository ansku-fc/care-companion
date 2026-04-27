-- Reset Linda Johansson back to pending and clear her draft onboarding row
DELETE FROM public.patient_onboarding WHERE patient_id = 'f3fc3dd0-7151-45c5-9534-8c2b9d417a19';
UPDATE public.patients SET onboarding_status = 'pending', updated_at = now() WHERE id = 'f3fc3dd0-7151-45c5-9534-8c2b9d417a19';