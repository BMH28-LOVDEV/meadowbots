CREATE TABLE public.pit_scouting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scouter_name TEXT NOT NULL,
  team_number TEXT NOT NULL,
  strengths_weaknesses TEXT,
  auto_artifacts_scored TEXT,
  scoring_zone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pit_scouting_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pit scouting entries"
ON public.pit_scouting_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert pit scouting entries"
ON public.pit_scouting_entries FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Master role can delete pit scouting entries"
ON public.pit_scouting_entries FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'master'
));