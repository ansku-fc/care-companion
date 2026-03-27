ALTER TABLE public.tasks
  ADD COLUMN assignee_name text,
  ADD COLUMN assignee_type text DEFAULT 'internal';