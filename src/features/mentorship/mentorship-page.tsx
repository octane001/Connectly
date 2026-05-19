import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, Search, Send, Sparkles, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/page-header";
import { getRecommendedMentors, submitMentorshipRequest, listMentorshipRequests, updateMentorshipRequest, startConversation, createNotification } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { MENTORSHIP_CATEGORIES } from "@/lib/constants";
import { queryClient } from "@/lib/query-client";
import { mentorshipRequestSchema, type MentorshipRequestInput } from "./schemas";
import { getProfileDisplayOrganization, getProfileDisplayTitle } from "@/types/domain";

export function MentorshipPage() {
  const profile = useAuthStore((s) => s.profile)!;
  const navigate = useNavigate();
  const isAdmin = profile.role === "ADMIN" || profile.role === "SUPER_ADMIN";
  const isAlumniOrFaculty = profile.role === "ALUMNI" || profile.role === "FACULTY";

  const mentors = useQuery({ queryKey: ["mentor-recommendations", profile.id], queryFn: () => getRecommendedMentors(profile), enabled: !isAdmin });
  const requests = useQuery({ queryKey: ["mentorship-requests", profile.id], queryFn: () => listMentorshipRequests(profile.id) });
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const { push } = useToast();



  const form = useForm<MentorshipRequestInput>({
    resolver: zodResolver(mentorshipRequestSchema),
    defaultValues: { category: "Career Guidance", message: "" },
  });

  const requestMutation = useMutation({
    mutationFn: (input: MentorshipRequestInput) => submitMentorshipRequest({ requesterId: profile.id, mentorId: selectedMentorId!, ...input }),
    onSuccess: () => { push({ kind: "success", title: "Request sent", description: "The mentor will be notified." }); setSelectedMentorId(null); form.reset(); },
    onError: () => push({ kind: "error", title: "Request failed" }),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status, requesterName, requesterId }: { id: string; status: "ACCEPTED" | "DECLINED"; requesterName?: string; requesterId?: string }) => {
      await updateMentorshipRequest(id, status);
      // Auto-create a message thread when accepting a mentorship request
      if (status === "ACCEPTED" && requesterId) {
        try {
          await startConversation(requesterId, profile.id, profile.fullName, requesterName ?? "Student");
        } catch { /* thread may already exist */ }
        // Notify the student that their request was accepted
        try {
          await createNotification(requesterId, `${profile.fullName} accepted your mentorship request`, `${profile.fullName} is now your mentor! Head to Messages to start your conversation.`);
        } catch { /* best effort */ }
      }
      if (status === "DECLINED" && requesterId) {
        try {
          await createNotification(requesterId, `Mentorship request update`, `Your mentorship request was declined. Browse the directory to find other mentors who can help.`);
        } catch { /* best effort */ }
      }
    },
    onSuccess: (_, { status }) => {
      push({
        kind: "success",
        title: status === "ACCEPTED" ? "Request accepted" : "Request declined",
        description: status === "ACCEPTED" ? "A message thread has been created. You can now chat with the mentee." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      if (status === "ACCEPTED") navigate("/app/messages");
    },
  });

  const incomingRequests = (requests.data ?? []).filter((r: any) => r.mentorId === profile.id && r.status === "PENDING");
  const myRequests = (requests.data ?? []).filter((r: any) => r.requesterId === profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mentorship"
        title={isAdmin ? "Mentorship overview" : isAlumniOrFaculty ? "Mentorship dashboard" : "Find your ideal mentor"}
        description={isAdmin
          ? "Overview of mentorship activity on the platform. All mentorship requests are managed by mentors directly."
          : isAlumniOrFaculty
          ? "Review incoming mentorship requests and connect with students seeking your guidance."
          : "Get matched with experienced alumni and faculty mentors based on your skills, department, and career interests."
        }
      />

      {/* Incoming requests — shown for ALL alumni/faculty, not just isMentor */}
      {isAlumniOrFaculty && incomingRequests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Incoming mentorship requests</CardTitle>
            <CardDescription>{incomingRequests.length} pending request{incomingRequests.length > 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingRequests.map((req: any) => (
              <div key={req.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{req.requesterName ?? "Student"}</p>
                    <p className="text-sm text-muted-foreground">{req.category} · {new Date(req.createdAt).toLocaleDateString()}</p>
                    {req.message ? <p className="mt-2 text-sm text-muted-foreground">{req.message}</p> : null}
                  </div>
                  <Badge variant="warning">PENDING</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => updateRequest.mutate({ id: req.id, status: "ACCEPTED", requesterName: req.requesterName, requesterId: req.requesterId })} disabled={updateRequest.isPending}>
                    <CheckCircle className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateRequest.mutate({ id: req.id, status: "DECLINED", requesterId: req.requesterId })} disabled={updateRequest.isPending}>
                    <X className="h-4 w-4" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : isAlumniOrFaculty && incomingRequests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No pending mentorship requests right now</p>
          </CardContent>
        </Card>
      ) : null}

      {/* My sent requests — shown for students/anyone who sent requests */}
      {myRequests.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Your mentorship requests</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myRequests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{req.mentorName ?? "Mentor"}</p>
                  <p className="text-sm text-muted-foreground">{req.category}</p>
                </div>
                <Badge variant={req.status === "ACCEPTED" ? "outline" : req.status === "DECLINED" ? "destructive" : "secondary"}>{req.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Mentor recommendations — shown for students only */}
      {!isAlumniOrFaculty && !isAdmin ? (
        <>
          {mentors.isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Finding the best mentors for you...</p>
              </CardContent>
            </Card>
          ) : (mentors.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No mentors available yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  There are no mentors matching your profile right now. Complete your profile with skills, interests, and career goals to improve future matches.
                </p>
                <Button className="mt-6" variant="outline" onClick={() => navigate("/app/directory")}>
                  <Search className="h-4 w-4" /> Browse the alumni directory
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(mentors.data ?? []).map((match) => (
                <Card key={match.profile.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={match.profile.fullName} src={match.profile.avatarUrl} className="h-12 w-12" />
                        <div>
                          <p className="font-medium">{match.profile.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            {[getProfileDisplayTitle(match.profile), getProfileDisplayOrganization(match.profile)].filter(Boolean).join(" at ")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">{match.score}%</Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{match.label}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.reasons.map((reason) => (<Badge key={reason} variant="outline">{reason}</Badge>))}
                    </div>
                    <div className="mt-auto pt-4">
                      <Button className="w-full" variant="outline" onClick={() => setSelectedMentorId(match.profile.id)}>
                        <Sparkles className="h-4 w-4" /> Request mentorship
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Request dialog */}
      {selectedMentorId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedMentorId(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Send mentorship request</CardTitle>
              <CardDescription>To: {mentors.data?.find((m) => m.profile.id === selectedMentorId)?.profile.fullName}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={form.handleSubmit((d) => requestMutation.mutate(d))}>
                <div className="space-y-2"><Label>Category</Label>
                  <Select {...form.register("category")}>
                    {MENTORSHIP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="space-y-2"><Label>Message</Label>
                  <Textarea placeholder="Introduce yourself and what you'd like guidance on..." {...form.register("message")} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={requestMutation.isPending}>
                    {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSelectedMentorId(null)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
