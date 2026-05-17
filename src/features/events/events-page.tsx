import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { BarChart3, CalendarDays, CheckCircle, Loader2, MapPin, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/page-header";
import { createEvent, listEvents, registerForEvent, unregisterFromEvent, listMyEventRegistrations } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { canManageContent } from "@/lib/route-guards";
import { formatDate } from "@/lib/utils";
import { eventSchema, type EventInput } from "./schemas";

export function EventsPage() {
  const profile = useAuthStore((s) => s.profile)!;
  const events = useQuery({ queryKey: ["events"], queryFn: listEvents });
  const myRegs = useQuery({ queryKey: ["my-event-registrations"], queryFn: () => listMyEventRegistrations(profile.id) });
  const [showForm, setShowForm] = useState(false);
  const { push } = useToast();

  const regSet = new Set(myRegs.data ?? []);
  const isManager = canManageContent(profile);

  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", type: "WORKSHOP", startsAt: "", location: "", description: "", capacity: 100 },
  });

  const create = useMutation({
    mutationFn: (input: EventInput) => createEvent({ ...input, createdBy: profile.id }),
    onSuccess: () => { push({ kind: "success", title: "Event created" }); setShowForm(false); form.reset(); events.refetch(); },
    onError: () => push({ kind: "error", title: "Failed to create event" }),
  });

  const rsvp = useMutation({
    mutationFn: (eventId: string) => registerForEvent(eventId, profile.id),
    onSuccess: () => {
      push({ kind: "success", title: "Registration confirmed", description: "You are registered for this event." });
      myRegs.refetch();
      events.refetch();
    },
  });

  const unrsvp = useMutation({
    mutationFn: (eventId: string) => unregisterFromEvent(eventId, profile.id),
    onSuccess: () => {
      push({ kind: "info", title: "Registration cancelled" });
      myRegs.refetch();
      events.refetch();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Events"
        title="Campus events, workshops, and networking"
        description="Events with registration tracking, capacity limits, and alumni participation data."
        action={isManager ? (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Create event
          </Button>
        ) : undefined}
      />

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>New event</CardTitle></CardHeader>
          <CardContent className="p-6">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((d) => create.mutate(d))}>
              <div className="space-y-2"><Label>Title</Label><Input {...form.register("title")} /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select {...form.register("type")}>
                  <option value="REUNION">Reunion</option><option value="WEBINAR">Webinar</option>
                  <option value="MENTORSHIP_SESSION">Mentorship Session</option><option value="WORKSHOP">Workshop</option>
                  <option value="NETWORKING">Networking</option>
                </Select>
              </div>
              <div className="space-y-2"><Label>Starts at</Label><Input type="datetime-local" {...form.register("startsAt")} /></div>
              <div className="space-y-2"><Label>Location</Label><Input {...form.register("location")} /></div>
              <div className="space-y-2"><Label>Capacity</Label><Input type="number" {...form.register("capacity", { valueAsNumber: true })} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea {...form.register("description")} /></div>
              <Button className="md:col-span-2" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publish event
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(events.data ?? []).map((event) => {
          const isRegistered = regSet.has(event.id);
          const isFull = event.capacity != null && event.registrations >= event.capacity;
          const fillPercent = event.capacity ? Math.round((event.registrations / event.capacity) * 100) : 0;
          return (
            <Card key={event.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="outline">{event.type.replace("_", " ")}</Badge>
                  {isRegistered ? <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Registered</Badge> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{event.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{event.description.slice(0, 120)}{event.description.length > 120 ? "..." : ""}</p>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(event.startsAt)}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</p>
                  <p className="flex items-center gap-2"><Users className="h-4 w-4" />{event.registrations}{event.capacity ? ` / ${event.capacity}` : ""} registered</p>
                </div>

                <div className="mt-4">
                  {isManager ? (
                    /* Admin/Faculty see event statistics instead of register button */
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <BarChart3 className="h-4 w-4" />
                        Event Statistics
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>{event.registrations} registrations</p>
                        {event.capacity ? (
                          <>
                            <div className="mt-1 h-2 w-full rounded-full bg-muted">
                              <div className="h-2 rounded-full bg-foreground transition-all" style={{ width: `${Math.min(fillPercent, 100)}%` }} />
                            </div>
                            <p className="text-xs">{fillPercent}% capacity filled · {Math.max(0, event.capacity - event.registrations)} spots left</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : isRegistered ? (
                    <Button variant="outline" className="w-full" onClick={() => unrsvp.mutate(event.id)} disabled={unrsvp.isPending}>
                      {unrsvp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Cancel Registration
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={() => rsvp.mutate(event.id)} disabled={rsvp.isPending || isFull}>
                      {rsvp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isFull ? "Event Full" : "Register"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
