-- ============================================================
-- Run this in Supabase SQL Editor to add the notifications table
-- and fix profile saving issues.
-- ============================================================

-- 1. Create notifications table (it was missing from the original schema)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies: users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- 5. RLS policy: allow inserts (for the notification system to create entries)
CREATE POLICY "Allow notification inserts"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 6. RLS policy: users can update their own notifications (to mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- 7. Verify
SELECT 'notifications table created' AS status, COUNT(*) AS rows FROM public.notifications;
