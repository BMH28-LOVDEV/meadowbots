
-- Table to store drive team qual match schedules (manageable by master)
CREATE TABLE IF NOT EXISTS public.drive_team_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_number text NOT NULL,        -- '14841' or '19792'
  match_label text NOT NULL,        -- e.g. 'Q5'
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_team_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drive team matches"
  ON public.drive_team_matches FOR SELECT
  USING (true);

CREATE POLICY "Master role can manage drive team matches"
  ON public.drive_team_matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'master'
  ));

CREATE POLICY "Master role can delete drive team matches"
  ON public.drive_team_matches FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'master'
  ));
