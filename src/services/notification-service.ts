import { demoNotifications } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { delay } from "@/lib/utils";
import type { NotificationItem } from "@/types/domain";

export async function listNotifications(profileId?: string): Promise<NotificationItem[]> {
  if (!supabase) { await delay(); return demoNotifications; }
  let query = (supabase as any).from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
  if (profileId) query = query.eq("profile_id", profileId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.id, title: row.title, body: row.body, read: row.read_at !== null, createdAt: row.created_at }));
}

export async function markNotificationRead(notificationId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export async function markAllNotificationsRead(profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", profileId).is("read_at", null);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export async function createNotification(profileId: string, title: string, body: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("notifications").insert({ profile_id: profileId, title, body });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export async function broadcastNotification(title: string, body: string, excludeProfileId?: string) {
  if (!supabase) return;
  try {
    const { data: allProfiles } = await (supabase as any).from("profiles").select("id").eq("status", "ACTIVE");
    if (allProfiles && allProfiles.length > 0) {
      const notifications = allProfiles
        .filter((p: any) => p.id !== excludeProfileId)
        .map((p: any) => ({ profile_id: p.id, title, body }));
      
      if (notifications.length > 0) {
        await (supabase as any).from("notifications").insert(notifications);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    }
  } catch (error) {
    console.error("Failed to broadcast notification:", error);
  }
}
