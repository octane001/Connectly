import { demoEvents } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { delay } from "@/lib/utils";
import { broadcastNotification } from "./notification-service";
import type { Event } from "@/types/domain";

export function mapEventRow(row: any): Event {
  return {
    id: row.id, title: row.title, type: row.type, startsAt: row.starts_at, endsAt: row.ends_at,
    location: row.location, description: row.description, bannerUrl: row.banner_url,
    capacity: row.capacity, registrations: row.registrations_count ?? 0,
    createdBy: row.created_by_name ?? "Admin",
  };
}

export async function listEvents(): Promise<Event[]> {
  if (!supabase) { await delay(); return demoEvents; }
  const { data, error } = await (supabase as any).from("event_cards").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(40);
  if (error) throw error;
  return (data ?? []).map(mapEventRow);
}

export async function createEvent(input: { title: string; type: string; startsAt: string; location: string; description: string; capacity?: number; createdBy: string }) {
  if (!supabase) {
    await delay();
    return { id: crypto.randomUUID(), title: input.title, type: input.type, startsAt: input.startsAt, endsAt: null, location: input.location, description: input.description, capacity: input.capacity ?? null, registrations: 0, createdBy: input.createdBy } as Event;
  }
  const { error } = await (supabase as any).from("events").insert({
    created_by: input.createdBy, title: input.title, type: input.type, starts_at: input.startsAt, location: input.location, description: input.description, capacity: input.capacity,
  });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["events"] });

  await broadcastNotification(
    `New event: ${input.title}`,
    `${input.title} on ${new Date(input.startsAt).toLocaleDateString()} at ${input.location}`,
    input.createdBy
  );
}

export async function registerForEvent(eventId: string, profileId: string) {
  if (!supabase) { await delay(); return; }
  const { error } = await (supabase as any).from("event_registrations").insert({ event_id: eventId, profile_id: profileId });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
}

export async function unregisterFromEvent(eventId: string, profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("event_registrations").delete().eq("event_id", eventId).eq("profile_id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
}

export async function listMyEventRegistrations(profileId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("event_registrations").select("event_id").eq("profile_id", profileId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.event_id);
}
