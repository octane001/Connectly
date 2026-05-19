import { demoThreads } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { delay } from "@/lib/utils";
import type { MessageThread } from "@/types/domain";

export async function listMessageThreads(profileId?: string): Promise<MessageThread[]> {
  if (!supabase) { await delay(); return demoThreads; }
  const pid = profileId ?? "";
  const { data, error } = await (supabase as any).from("message_threads")
    .select("*, requester:profiles!message_threads_requester_id_fkey(full_name), recipient:profiles!message_threads_recipient_id_fkey(full_name)")
    .or(`requester_id.eq.${pid},recipient_id.eq.${pid}`)
    .order("updated_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, title: row.title,
    participantNames: [row.requester?.full_name, row.recipient?.full_name].filter(Boolean),
    lastMessage: row.last_message ?? "No messages yet", updatedAt: row.updated_at,
  }));
}

export async function listMessages(threadId: string): Promise<{ id: string; senderId: string; senderName: string; body: string; createdAt: string }[]> {
  if (!supabase) return [{ id: "m1", senderId: "alumni-1", senderName: "Nisha Rao", body: "Please share your resume and the roles you are targeting.", createdAt: new Date().toISOString() }];
  const { data, error } = await (supabase as any).from("messages").select("*, profiles(full_name)").eq("thread_id", threadId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, senderId: r.sender_id, senderName: r.profiles?.full_name ?? "User", body: r.body, createdAt: r.created_at }));
}

export async function sendMessage(threadId: string, senderId: string, body: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("messages").insert({ thread_id: threadId, sender_id: senderId, body });
  if (error) throw error;
  await (supabase as any).from("message_threads").update({ last_message: body }).eq("id", threadId);
  queryClient.invalidateQueries({ queryKey: ["threads"] });
  queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
}

export async function startConversation(requesterId: string, recipientId: string, recipientName: string, requesterName: string): Promise<string> {
  if (!supabase) return "demo-thread";
  const { data: existing } = await (supabase as any).from("message_threads")
    .select("id")
    .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await (supabase as any).from("message_threads").insert({
    requester_id: requesterId,
    recipient_id: recipientId,
    title: `${requesterName} ↔ ${recipientName}`,
    last_message: "Thread started",
  }).select("id").single();
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["threads"] });
  return data.id;
}
