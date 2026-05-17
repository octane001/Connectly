-- Remove all seed/demo data from the database.
-- This ONLY deletes the dummy records inserted by seed.sql.
-- Your real Google-authenticated accounts are SAFE (they have real auth_user_id values).

-- 1. Delete seeded feed posts
delete from public.feed_posts where id in (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000402'
);

-- 2. Delete seeded events
delete from public.events where id in (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000302'
);

-- 3. Delete seeded jobs
delete from public.jobs where id in (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000202'
);

-- 4. Delete seeded alumni imports
delete from public.alumni_imports where email in (
  'invited.alumni@example.com',
  'vikram.joshi@example.com'
);

-- 5. Delete seeded demo profiles (cascades to user_skills, privacy_settings, mentorship_preferences)
delete from public.profiles where id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000105'
);

-- 6. Verify: only your real accounts should remain
select id, full_name, email, role, status from public.profiles order by created_at;
