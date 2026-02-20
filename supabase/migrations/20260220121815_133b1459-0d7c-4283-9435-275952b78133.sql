
-- Table for health report drafts
CREATE TABLE public.health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Health Report',
  status TEXT NOT NULL DEFAULT 'draft',
  overview_summary TEXT,
  overview_recommendations TEXT,
  dimension_texts JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can read health reports"
  ON public.health_reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert health reports"
  ON public.health_reports FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or doctor can update health reports"
  ON public.health_reports FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Creator or doctor can delete health reports"
  ON public.health_reports FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'doctor'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_health_reports_updated_at
  BEFORE UPDATE ON public.health_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
