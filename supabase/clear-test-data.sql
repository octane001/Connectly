-- Run this in Supabase SQL Editor to clear test data for fresh testing
-- ⚠️ WARNING: This permanently deletes data. Use only in development.

-- Clear all mentorship requests
DELETE FROM mentorship_requests;

-- Clear all notifications
DELETE FROM notifications;

-- Verify cleanup
SELECT 'mentorship_requests' AS table_name, COUNT(*) AS remaining FROM mentorship_requests
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;
