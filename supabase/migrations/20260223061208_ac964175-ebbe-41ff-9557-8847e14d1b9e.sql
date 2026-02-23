
-- Whitelist of allowed emails for signup
CREATE TABLE public.allowed_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  added_by text DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (needed for signup check via edge function)
CREATE POLICY "Anyone can view allowed emails"
  ON public.allowed_emails FOR SELECT
  USING (true);

-- Only masters can manage the whitelist
CREATE POLICY "Master role can insert allowed emails"
  ON public.allowed_emails FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'master'
  ));

CREATE POLICY "Master role can delete allowed emails"
  ON public.allowed_emails FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'master'
  ));

-- Populate with all current registered emails
INSERT INTO public.allowed_emails (email) 
SELECT u.email FROM auth.users u WHERE u.email IS NOT NULL;
