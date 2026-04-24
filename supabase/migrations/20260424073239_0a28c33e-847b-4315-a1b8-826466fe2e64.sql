DROP POLICY IF EXISTS "Authenticated can insert appointments" ON public.appointments;

CREATE POLICY "Authenticated can insert appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);