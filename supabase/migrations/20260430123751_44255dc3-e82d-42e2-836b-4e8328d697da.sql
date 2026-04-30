-- Keep only: Benjamin Hale (BMH28), Test Student (test_student), Mbotmaster
-- Delete all other user accounts and their profiles

DO $$
DECLARE
  v_keep uuid[] := ARRAY[
    '366069ec-4ea4-42ac-a3bd-21274e759c6a'::uuid, -- BMH28 / Benjamin Hale
    'a9d541ae-e0b1-4f46-b022-a2a645904079'::uuid, -- test_student / Test Student
    '8a4ec731-b927-4fdb-a4e4-afc23e70925b'::uuid  -- mbotmaster
  ];
BEGIN
  DELETE FROM public.profiles WHERE user_id <> ALL(v_keep);
  DELETE FROM auth.users WHERE id <> ALL(v_keep);
END $$;