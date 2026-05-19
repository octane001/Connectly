import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { createNotification } from "./notification-service";
import type { MentorshipRequest } from "@/types/domain";

export async function submitMentorshipRequest(input: { requesterId: string; mentorId: string; category: string; message: string }): Promise<MentorshipRequest> {
  if (!supabase) {
    return { id: crypto.randomUUID(), requesterId: input.requesterId, mentorId: input.mentorId, category: input.category, message: input.message, status: "PENDING", createdAt: new Date().toISOString() };
  }
  const { data, error } = await (supabase as any).from("mentorship_requests").insert({
    requester_id: input.requesterId, mentor_id: input.mentorId, category: input.category, message: input.message,
  }).select("*").single();
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });

  try {
    const requesterProfile = await (supabase as any).from("profiles").select("full_name").eq("id", input.requesterId).single();
    const requesterName = requesterProfile.data?.full_name ?? "Someone";
    await createNotification(input.mentorId, `Mentorship request from ${requesterName}`, `${requesterName} wants your guidance in ${input.category}. Review the request in your Mentorship page.`);
  } catch { /* best-effort */ }

  return { id: data.id, requesterId: data.requester_id, mentorId: data.mentor_id, category: data.category, message: data.message, status: data.status, createdAt: data.created_at };
}

export async function listMentorshipRequests(profileId: string): Promise<MentorshipRequest[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("mentorship_requests")
    .select("*, requester:profiles!mentorship_requests_requester_id_fkey(full_name), mentor:profiles!mentorship_requests_mentor_id_fkey(full_name)")
    .or(`requester_id.eq.${profileId},mentor_id.eq.${profileId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, requesterId: r.requester_id, mentorId: r.mentor_id, category: r.category,
    message: r.message, status: r.status, createdAt: r.created_at,
    requesterName: r.requester?.full_name, mentorName: r.mentor?.full_name,
  }));
}

export async function updateMentorshipRequest(id: string, status: "ACCEPTED" | "DECLINED") {
  if (!supabase) return;
  const { error } = await (supabase as any).from("mentorship_requests").update({ status }).eq("id", id);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
}

export async function sendContactRequest(requesterId: string, recipientId: string, reason: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("contact_requests").insert({ requester_id: requesterId, recipient_id: recipientId, reason });
  if (error) throw error;
}
