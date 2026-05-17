-- Promote the Google account you tested locally to a real Connectly admin.
-- Replace the email value below, then run this in the Supabase SQL editor
-- after both migrations and seed.sql have completed.

-- 1. Find recent Google users if you need to confirm the exact email.
select
  id as auth_user_id,
  email,
  raw_user_meta_data->>'name' as google_name,
  created_at
from auth.users
order by created_at desc
limit 10;

-- 2. Confirm the matching public profile exists and is linked to auth.users.
select
  id as profile_id,
  auth_user_id,
  email,
  full_name,
  role,
  status,
  profile_completeness
from public.profiles
where lower(email::text) = lower('devpiyushkumar8702@gmail.com');

-- 3. Promote that linked profile to the local/project admin.
update public.profiles
set
  role = 'ADMIN',
  status = 'ACTIVE',
  profile_completeness = greatest(profile_completeness, 88),
  updated_at = now()
where lower(email::text) = lower('devpiyushkumar8702@gmail.com')
  and auth_user_id is not null
returning id, auth_user_id, email, full_name, role, status;

-- If step 3 returns zero rows, the Google account either has not signed in yet
-- or the email placeholder does not match public.profiles.email.
