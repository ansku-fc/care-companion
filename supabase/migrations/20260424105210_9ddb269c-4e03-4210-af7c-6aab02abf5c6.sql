
CREATE TABLE public.marker_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  marker_key TEXT NOT NULL,
  annotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Dr. Laine',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marker_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read marker annotations"
  ON public.marker_annotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert marker annotations"
  ON public.marker_annotations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or doctor can update marker annotations"
  ON public.marker_annotations FOR UPDATE
  TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Creator or doctor can delete marker annotations"
  ON public.marker_annotations FOR DELETE
  TO authenticated
  USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'doctor'::app_role));

CREATE TRIGGER update_marker_annotations_updated_at
  BEFORE UPDATE ON public.marker_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_marker_annotations_patient_marker
  ON public.marker_annotations (patient_id, marker_key, annotation_date DESC);
