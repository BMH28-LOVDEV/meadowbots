-- Drop the overly restrictive role check constraint and replace with one that includes all roles
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY[
    'scout'::text,
    'master'::text,
    'viewer'::text,
    'lockdown'::text,
    'letsgo'::text,
    'bluedriver'::text,
    'silverdriver'::text,
    'driveteam'::text,
    'coach'::text
  ]));
