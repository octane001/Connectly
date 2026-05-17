-- Fix avatar storage: allow authenticated users to upload/read their own avatars
-- Run this in Supabase SQL Editor

-- Make the avatars bucket public so images are accessible without signed URLs
update storage.buckets set public = true where id = 'avatars';

-- Allow authenticated users to upload to their own folder
insert into storage.policies (name, bucket_id, definition, check_expression)
select 
  'Users upload own avatar',
  'avatars',
  '(auth.role() = ''authenticated'')',
  '(auth.role() = ''authenticated'')'
where not exists (
  select 1 from storage.policies where name = 'Users upload own avatar' and bucket_id = 'avatars'
);
