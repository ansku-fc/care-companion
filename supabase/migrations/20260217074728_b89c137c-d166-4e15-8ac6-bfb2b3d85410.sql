
-- Tighten health categories: only authenticated users with valid auth can write
DROP POLICY "Authenticated can insert health categories" ON public.patient_health_categories;
CREATE POLICY "Authenticated can insert health categories" ON public.patient_health_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = updated_by);

DROP POLICY "Authenticated can update health categories" ON public.patient_health_categories;
CREATE POLICY "Authenticated can update health categories" ON public.patient_health_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() = updated_by);

-- Tighten patients update: doctors only
DROP POLICY "Doctors can update patients" ON public.patients;
CREATE POLICY "Doctors can update patients" ON public.patients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

-- Tighten appointments update
DROP POLICY "Authenticated can update appointments" ON public.appointments;
CREATE POLICY "Provider or doctor can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = provider_id OR public.has_role(auth.uid(), 'doctor'));

-- Tighten tasks update
DROP POLICY "Authenticated can update tasks" ON public.tasks;
CREATE POLICY "Creator or assignee can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = created_by OR auth.uid() = assigned_to OR public.has_role(auth.uid(), 'doctor'));
