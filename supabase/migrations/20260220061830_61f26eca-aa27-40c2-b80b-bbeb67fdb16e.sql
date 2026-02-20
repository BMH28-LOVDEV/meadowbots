-- Create a trigger function that auto-creates a profile when a new user signs up
-- This runs with elevated privileges so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_email_local text;
  v_role text;
  v_display_name text;
  v_username text;
BEGIN
  -- Extract the local part of the email (before @)
  v_email_local := split_part(NEW.email, '@', 1);
  
  -- Determine role based on prefix
  IF lower(v_email_local) IN ('benjamin_hale', 'maxwell_tran') THEN
    v_role := 'master';
  ELSIF lower(v_email_local) IN ('zoe_khansevahn', 'chantelle_wong') THEN
    v_role := 'bluedriver';
  ELSIF lower(v_email_local) IN ('devin_allen') THEN
    v_role := 'coach';
  -- Staff emails: format like JSmith (single capital letter + last name, no underscore)
  ELSIF v_email_local ~ '^[A-Z][a-z]+$' THEN
    v_role := 'coach';
  ELSE
    v_role := 'scout';
  END IF;
  
  -- Build display name
  IF v_email_local ~ '_' THEN
    -- student format: first_last -> First Last
    v_display_name := initcap(replace(v_email_local, '_', ' '));
  ELSE
    -- teacher format: JSmith -> J Smith (expand caps)
    v_display_name := regexp_replace(v_email_local, '([A-Z])', ' \1', 'g');
    v_display_name := trim(v_display_name);
    v_display_name := initcap(v_display_name);
  END IF;
  
  -- Username: lowercase alphanumeric only
  v_username := lower(regexp_replace(v_email_local, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Insert profile (skip if already exists)
  INSERT INTO public.profiles (user_id, username, display_name, role)
  VALUES (NEW.id, v_username, v_display_name, v_role)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();