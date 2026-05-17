-- Enable Supabase Realtime on messages and message_threads tables.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
--
-- This is required so that when one user sends a message, the other
-- user's browser receives the INSERT event via WebSocket in real-time.

-- Add tables to the supabase_realtime publication
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_threads;

-- Set REPLICA IDENTITY to FULL so UPDATE payloads include old + new row
-- (needed for message_threads.last_message updates to propagate)
alter table public.messages replica identity full;
alter table public.message_threads replica identity full;
