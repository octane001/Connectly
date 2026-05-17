-- Allow admins/faculty and post authors to delete feed posts
-- Run this in Supabase SQL Editor

create policy "Authors and admins delete feed"
on public.feed_posts for delete
using (author_id = public.current_profile_id() or public.is_admin());
