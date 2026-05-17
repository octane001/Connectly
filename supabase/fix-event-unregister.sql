-- Fix: Allow users to cancel (delete) their own event registrations
-- The original schema only had an UPDATE policy, but the app uses DELETE to unregister
-- Run this in Supabase SQL Editor

create policy "Users delete own registrations"
on public.event_registrations for delete
using (profile_id = public.current_profile_id());
