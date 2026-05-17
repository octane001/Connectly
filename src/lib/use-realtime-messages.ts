import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";

/**
 * Hook that subscribes to Supabase Realtime for the `messages` table.
 * When any INSERT happens on the thread the user is viewing, the local
 * React-Query cache is invalidated so the new message appears instantly
 * without a manual refresh.
 *
 * It also listens for changes to `message_threads` so the sidebar thread
 * list (last_message preview, ordering) stays up-to-date.
 */
export function useRealtimeMessages(activeThreadId: string | null | undefined) {
  useEffect(() => {
    if (!supabase || !activeThreadId) return;

    // Channel for new messages in the active thread
    const channel = supabase
      .channel(`messages:thread:${activeThreadId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${activeThreadId}`,
        },
        () => {
          // A new message was inserted into this thread — refetch
          queryClient.invalidateQueries({ queryKey: ["messages", activeThreadId] });
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        },
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "message_threads",
          filter: `id=eq.${activeThreadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThreadId]);
}
