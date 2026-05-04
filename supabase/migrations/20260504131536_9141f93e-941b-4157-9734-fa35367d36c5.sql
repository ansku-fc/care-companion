-- Rename demo tasks to the new active-verb naming pattern.
UPDATE public.tasks
SET title = regexp_replace(title, '^Lab order\s*—', 'Review lab results —')
WHERE task_type = 'LAB_DIAGNOSTICS' AND title LIKE 'Lab order —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Referral\s*—', 'Send referral —')
WHERE task_type = 'REFERRAL' AND title LIKE 'Referral —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Prescription renewal\s*—', 'Renew prescription —')
WHERE task_type = 'PRESCRIPTION' AND title LIKE 'Prescription renewal —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Drug interaction review\s*—', 'Review interaction —')
WHERE task_type = 'PRESCRIPTION' AND title LIKE 'Drug interaction review —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Clinic appointment\s*—', 'Book appointment —')
WHERE task_type = 'APPOINTMENT_CLINIC' AND title LIKE 'Clinic appointment —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^External appointment\s*—', 'Book external appointment —')
WHERE task_type = 'APPOINTMENT_EXTERNAL' AND title LIKE 'External appointment —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Results communication\s*—', 'Send results —')
WHERE task_type = 'PATIENT_COMMUNICATION' AND title LIKE 'Results communication —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Pre-visit instructions\s*—', 'Send pre-visit instructions —')
WHERE task_type = 'PATIENT_COMMUNICATION' AND title LIKE 'Pre-visit instructions —%';

UPDATE public.tasks
SET title = regexp_replace(title, '^Onboarding review\s*—', 'Complete onboarding —')
WHERE task_type = 'ONBOARDING_ADMIN' AND title LIKE 'Onboarding review —%';