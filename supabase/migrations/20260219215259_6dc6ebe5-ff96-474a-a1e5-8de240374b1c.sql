
CREATE TABLE public.team_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_name text NOT NULL UNIQUE,
  team_number text NOT NULL,
  team_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team assignments"
  ON public.team_assignments FOR SELECT USING (true);

CREATE POLICY "Anyone can insert team assignments"
  ON public.team_assignments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update team assignments"
  ON public.team_assignments FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete team assignments"
  ON public.team_assignments FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_team_assignments_updated_at
  BEFORE UPDATE ON public.team_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
