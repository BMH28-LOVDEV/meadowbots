
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_local text;
  v_role text;
  v_display_name text;
  v_username text;
  v_approval text;
BEGIN
  v_email_local := split_part(NEW.email, '@', 1);

  IF lower(v_email_local) IN ('benjamin_hale', 'maxwell_tran', 'jude_trujillo') THEN
    v_role := 'master';
  ELSIF lower(v_email_local) IN ('devin_allen') THEN
    v_role := 'coach';
  ELSIF v_email_local ~ '^[A-Z][a-z]+$' THEN
    v_role := 'coach';
  ELSE
    v_role := 'scout';
  END IF;

  -- Auto-approve masters and coaches, pending for everyone else
  IF v_role IN ('master', 'coach') THEN
    v_approval := 'approved';
  ELSE
    v_approval := 'pending';
  END IF;

  IF v_email_local ~ '_' THEN
    v_display_name := initcap(replace(v_email_local, '_', ' '));
  ELSE
    v_display_name := regexp_replace(v_email_local, '([A-Z])', ' \1', 'g');
    v_display_name := trim(v_display_name);
    v_display_name := initcap(v_display_name);
  END IF;

  v_username := lower(regexp_replace(v_email_local, '[^a-zA-Z0-9_]', '', 'g'));

  INSERT INTO public.profiles (user_id, username, display_name, role, approval_status)
  VALUES (NEW.id, v_username, v_display_name, v_role, v_approval)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
