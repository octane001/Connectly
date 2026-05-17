-- ============================================================
-- Run this in Supabase SQL Editor to fix mentorship request
-- Accept/Decline permissions
-- ============================================================

-- Allow users to update mentorship requests where they are the mentor
DO $$
BEGIN
  -- Drop existing policy if it exists to avoid conflicts
  DROP POLICY IF EXISTS "Mentors can update their requests" ON public.mentorship_requests;
  
  CREATE POLICY "Mentors can update their requests"
    ON public.mentorship_requests FOR UPDATE
    USING (
      mentor_id IN (
        SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy creation skipped: %', SQLERRM;
END $$;

-- Also ensure users can view mentorship requests involving them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own mentorship requests" ON public.mentorship_requests;
  
  CREATE POLICY "Users can view own mentorship requests"
    ON public.mentorship_requests FOR SELECT
    USING (
      requester_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
      OR
      mentor_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy creation skipped: %', SQLERRM;
END $$;

-- Ensure users can insert mentorship requests
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can create mentorship requests" ON public.mentorship_requests;
  
  CREATE POLICY "Users can create mentorship requests"
    ON public.mentorship_requests FOR INSERT
    WITH CHECK (
      requester_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy creation skipped: %', SQLERRM;
END $$;

SELECT 'Mentorship RLS policies configured' AS status;
