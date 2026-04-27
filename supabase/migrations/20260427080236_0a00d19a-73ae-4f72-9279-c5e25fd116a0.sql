-- Bug 1 & 3: allow authenticated users to update patients and to insert/update onboarding
-- (auth is currently mocked; without these, has_role-based policies block updates).

CREATE POLICY "authenticated users can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- patient_onboarding already has insert+update policies for authenticated, but they
-- are restricted to created_by = auth.uid(). Add permissive ones to unblock the mock-auth flow.
CREATE POLICY "authenticated users can insert onboarding (any)"
ON public.patient_onboarding
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated users can update onboarding (any)"
ON public.patient_onboarding
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
