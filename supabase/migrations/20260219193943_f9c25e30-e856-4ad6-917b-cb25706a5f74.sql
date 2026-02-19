
CREATE TABLE public.scouting_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scouter_name TEXT NOT NULL,
  team_number TEXT NOT NULL,
  match_number TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_artifacts_scored TEXT,
  auto_pattern_alignment TEXT,
  auto_launch_line TEXT,
  auto_leave TEXT,
  auto_consistency TEXT,
  teleop_intake_method TEXT,
  teleop_ball_capacity TEXT,
  teleop_shooting_accuracy TEXT,
  teleop_gate_interaction TEXT,
  teleop_overflow_management TEXT,
  teleop_cycle_speed TEXT,
  teleop_artifact_classification TEXT,
  endgame_parking TEXT,
  endgame_alliance_assist TEXT,
  penalties TEXT[],
  special_features TEXT,
  good_match TEXT
);

-- Enable RLS
ALTER TABLE public.scouting_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read all scouting entries (needed for Master Dashboard)
CREATE POLICY "Anyone can view scouting entries"
  ON public.scouting_entries
  FOR SELECT
  USING (true);

-- Anyone (scouts) can insert entries
CREATE POLICY "Anyone can insert scouting entries"
  ON public.scouting_entries
  FOR INSERT
  WITH CHECK (true);

-- Anyone can delete entries (password protection is handled in the app)
CREATE POLICY "Anyone can delete scouting entries"
  ON public.scouting_entries
  FOR DELETE
  USING (true);
