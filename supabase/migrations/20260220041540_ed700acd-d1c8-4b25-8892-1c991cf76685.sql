
-- Create profiles table to store username, display name, and role
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'scout' CHECK (role IN ('scout', 'master', 'viewer', 'lockdown', 'letsgo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read profiles (needed to show scout names, etc.)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update scouting_entries RLS: restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can view scouting entries" ON public.scouting_entries;
DROP POLICY IF EXISTS "Anyone can insert scouting entries" ON public.scouting_entries;
DROP POLICY IF EXISTS "Anyone can delete scouting entries" ON public.scouting_entries;

CREATE POLICY "Authenticated users can view scouting entries"
ON public.scouting_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert scouting entries"
ON public.scouting_entries FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Master role can delete scouting entries"
ON public.scouting_entries FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('master')
  )
);

-- Update team_assignments RLS: restrict to authenticated only
DROP POLICY IF EXISTS "Anyone can view team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Anyone can insert team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Anyone can update team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Anyone can delete team assignments" ON public.team_assignments;

CREATE POLICY "Authenticated users can view team assignments"
ON public.team_assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master role can manage team assignments"
ON public.team_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'master'
  )
);

CREATE POLICY "Master role can update team assignments"
ON public.team_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'master'
  )
);

CREATE POLICY "Master role can delete team assignments"
ON public.team_assignments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'master'
  )
);

-- Trigger to keep updated_at fresh on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
