ALTER TABLE public.pit_scouting_entries
  ADD COLUMN team_name TEXT,
  ADD COLUMN strengths TEXT,
  ADD COLUMN weaknesses TEXT,
  ADD COLUMN teleop_focus TEXT,
  ADD COLUMN teleop_scoring_zone TEXT,
  ADD COLUMN endgame_strategy TEXT,
  ADD COLUMN endgame_parking TEXT,
  ADD COLUMN endgame_park_features TEXT,
  ADD COLUMN endgame_park_features_other TEXT;