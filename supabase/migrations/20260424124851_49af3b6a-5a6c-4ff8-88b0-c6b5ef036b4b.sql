DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
CREATE POLICY "authenticated users can insert patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read patients" ON public.patients;
CREATE POLICY "authenticated users can read patients"
ON public.patients
FOR SELECT
TO authenticated
USING (true);