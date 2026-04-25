ALTER TABLE public.pit_scouting_entries
  ADD COLUMN IF NOT EXISTS robot_archetype text,
  ADD COLUMN IF NOT EXISTS teleop_defense_type text,
  ADD COLUMN IF NOT EXISTS cycle_or_park text,
  ADD COLUMN IF NOT EXISTS overall_consistency text,
  ADD COLUMN IF NOT EXISTS defense_capability text,
  ADD COLUMN IF NOT EXISTS photo_permission text,
  ADD COLUMN IF NOT EXISTS brochure_available text;