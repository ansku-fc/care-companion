
-- Add attachment_url column for storing uploaded file URL
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create storage bucket for appointment attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('appointment-attachments', 'appointment-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for the bucket
CREATE POLICY "Authenticated can read appointment attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'appointment-attachments');

CREATE POLICY "Authenticated can upload appointment attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'appointment-attachments');

CREATE POLICY "Authenticated can update own appointment attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'appointment-attachments' AND auth.uid() = owner);

CREATE POLICY "Authenticated can delete own appointment attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'appointment-attachments' AND auth.uid() = owner);
