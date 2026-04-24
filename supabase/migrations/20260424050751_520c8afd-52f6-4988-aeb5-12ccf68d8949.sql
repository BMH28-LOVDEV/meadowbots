DROP POLICY IF EXISTS "Authenticated users can insert scouting entries" ON public.scouting_entries;
CREATE POLICY "Logged-in users can insert scouting entries"
  ON public.scouting_entries
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);