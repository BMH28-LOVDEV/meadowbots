
-- Create security definer function to check master role without recursion
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = 'master'
  )
$$;

-- Replace the recursive policy
DROP POLICY IF EXISTS "Master can update any profile" ON public.profiles;

CREATE POLICY "Master can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_master(auth.uid()));
