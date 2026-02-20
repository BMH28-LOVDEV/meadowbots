
ALTER TABLE public.scouting_entries
  ADD COLUMN IF NOT EXISTS penalty_points_given integer NULL,
  ADD COLUMN IF NOT EXISTS match_score integer NULL,
  ADD COLUMN IF NOT EXISTS alliance_won text NULL;
