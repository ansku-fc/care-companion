
-- Lab orders linked to a visit (and a patient)
CREATE TABLE public.lab_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  visit_id UUID,
  appointment_id UUID,
  packages TEXT[] NOT NULL DEFAULT '{}',
  markers TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | results_received
  destination TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID,
  requisition_file_path TEXT,
  results_file_path TEXT,
  results_received_at TIMESTAMP WITH TIME ZONE,
  internal_note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read lab orders" ON public.lab_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert lab orders" ON public.lab_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update lab orders" ON public.lab_orders
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Creator or doctor can delete lab orders" ON public.lab_orders
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

CREATE TRIGGER update_lab_orders_updated_at
  BEFORE UPDATE ON public.lab_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add structured fields to visit_notes
ALTER TABLE public.visit_notes
  ADD COLUMN IF NOT EXISTS visit_type TEXT,           -- onboarding | annual_checkup | acute | laboratory
  ADD COLUMN IF NOT EXISTS visit_mode TEXT,           -- in_person | remote | home
  ADD COLUMN IF NOT EXISTS visit_time TIME,
  ADD COLUMN IF NOT EXISTS attending_doctor TEXT,
  ADD COLUMN IF NOT EXISTS attending_nurse TEXT,
  ADD COLUMN IF NOT EXISTS internal_note_to_nurse TEXT,
  ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
  ADD COLUMN IF NOT EXISTS outcomes TEXT,
  ADD COLUMN IF NOT EXISTS lab_order_id UUID;

-- Link lab results to a visit/order (optional)
ALTER TABLE public.patient_lab_results
  ADD COLUMN IF NOT EXISTS visit_id UUID,
  ADD COLUMN IF NOT EXISTS lab_order_id UUID;

-- Notifications table for in-app bell
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,           -- lab_results_ready | lab_review_required | etc
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                    -- e.g. /patients/<id>
  patient_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.user_notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update their notifications" ON public.user_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete their notifications" ON public.user_notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_notifications_user_unread ON public.user_notifications(user_id, read_at);

-- Storage policies for patient-health-files bucket so authenticated users can upload/read lab order files
DO $$ BEGIN
  CREATE POLICY "Authenticated can read patient health files"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'patient-health-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can upload patient health files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'patient-health-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update patient health files"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'patient-health-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can delete patient health files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'patient-health-files');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
