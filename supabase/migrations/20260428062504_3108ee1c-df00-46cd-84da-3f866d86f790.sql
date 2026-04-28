-- Allow Preview (unauthenticated visitors using the public anon key) to read
-- demo patients, tasks, and the activity feed. Writes remain restricted to
-- authenticated users via the existing INSERT/UPDATE/DELETE policies.
-- This matches the behaviour of the calendar (which already shows data to
-- anon visitors via a dummy appointments fallback).

-- patients
DROP POLICY IF EXISTS "authenticated users can read patients" ON public.patients;
CREATE POLICY "Anyone can read patients"
ON public.patients FOR SELECT
TO anon, authenticated
USING (true);

-- tasks
DROP POLICY IF EXISTS "Authenticated can read tasks" ON public.tasks;
CREATE POLICY "Anyone can read tasks"
ON public.tasks FOR SELECT
TO anon, authenticated
USING (true);

-- activity_log
DROP POLICY IF EXISTS "Authenticated can read activity log" ON public.activity_log;
CREATE POLICY "Anyone can read activity log"
ON public.activity_log FOR SELECT
TO anon, authenticated
USING (true);

-- appointments (so the calendar shows real entries in Preview too)
DROP POLICY IF EXISTS "Authenticated can read appointments" ON public.appointments;
CREATE POLICY "Anyone can read appointments"
ON public.appointments FOR SELECT
TO anon, authenticated
USING (true);