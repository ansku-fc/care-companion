ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_category TEXT NOT NULL DEFAULT 'administrative';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS clinical_source TEXT;

-- Backfill existing tasks via keyword classification on title.
UPDATE public.tasks SET task_category = 'lab_review'
WHERE lower(title) SIMILAR TO '%(lab|laboratory|result|results|enzyme|marker|hba1c|cholesterol|glucose|alat|asat|creatinine|hemoglobin|tsh|ferritin|vitamin|blood test|urine)%';

UPDATE public.tasks SET task_category = 'medication'
WHERE lower(title) SIMILAR TO '%(prescription|medication|drug|renewal|renew|supply|interaction|warfarin|metformin|statin|dose|dosage)%';

UPDATE public.tasks SET task_category = 'dimension_review'
WHERE lower(title) SIMILAR TO '%(cardiovascular|metabolic|cancer|mental health|sleep|respiratory|digestion|dimension|risk factor|risk index|thyroid function|blood pressure medication)%';

UPDATE public.tasks SET task_category = 'followup'
WHERE lower(title) SIMILAR TO '%(follow.up|followup|post.visit|check.in|recall|review after)%';

UPDATE public.tasks SET task_category = 'referral'
WHERE lower(title) SIMILAR TO '%(referral|refer|specialist|consult|colonoscopy|appointment|scheduling)%';