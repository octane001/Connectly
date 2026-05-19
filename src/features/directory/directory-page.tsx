import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, Loader2, MapPin, MessageSquare, Search, Send, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { DEPARTMENTS, INDUSTRIES, MENTORSHIP_CATEGORIES } from "@/lib/constants";
import { listProfiles, startConversation, submitMentorshipRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/components/ui/use-toast";
import {
  getProfileDisplayOrganization,
  getProfileDisplayTitle,
  isFacultyProfile,
  type DirectoryFilters,
  type Profile,
} from "@/types/domain";

export function DirectoryPage() {
  const [filters, setFilters] = useState<DirectoryFilters>({ page: 1, pageSize: 12, role: "ALL", mentorship: "ALL" });
  const profiles = useQuery({
    queryKey: ["profiles", filters],
    queryFn: () => listProfiles(filters),
  });

  const pageCount = useMemo(() => {
    const pageSize = filters.pageSize ?? 12;
    return Math.max(1, Math.ceil((profiles.data?.count ?? 0) / pageSize));
  }, [filters.pageSize, profiles.data?.count]);

  const updateFilter = (key: keyof DirectoryFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alumni directory"
        title="Search the verified network"
        description="Browse and connect with verified alumni, students, and faculty across departments, industries, and graduation years."
      />

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                className="pl-9"
                placeholder="Name, company, skill, role"
                value={filters.search ?? ""}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={filters.department ?? "ALL"} onChange={(event) => updateFilter("department", event.target.value)}>
              <option value="ALL">All departments</option>
              {DEPARTMENTS.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={filters.role ?? "ALL"} onChange={(event) => updateFilter("role", event.target.value)}>
              <option value="ALL">All roles</option>
              <option value="ALUMNI">Alumni</option>
              <option value="STUDENT">Students</option>
              <option value="FACULTY">Faculty</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={filters.industry ?? "ALL"} onChange={(event) => updateFilter("industry", event.target.value)}>
              <option value="ALL">All industries</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry}>{industry}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Batch year</Label>
            <Input
              placeholder="2018"
              value={filters.graduationYear ?? ""}
              onChange={(event) => updateFilter("graduationYear", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Skill</Label>
            <Input placeholder="React" value={filters.skill ?? ""} onChange={(event) => updateFilter("skill", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Research</Label>
            <Input placeholder="AI, EdTech" value={filters.research ?? ""} onChange={(event) => updateFilter("research", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mentorship</Label>
            <Select value={filters.mentorship ?? "ALL"} onChange={(event) => updateFilter("mentorship", event.target.value)}>
              <option value="ALL">All members</option>
              <option value="OPEN">Open mentors</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {profiles.data?.count ?? 0} verified profiles found
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Badge variant="outline">
            Page {filters.page ?? 1} of {pageCount}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={(filters.page ?? 1) >= pageCount}
            onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {profiles.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(profiles.data?.data ?? []).map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const me = useAuthStore((s) => s.profile)!;
  const navigate = useNavigate();
  const { push } = useToast();
  const isMe = me.id === profile.id;
  const isAlumniOrFaculty = profile.role === "ALUMNI" || profile.role === "FACULTY";
  const canRequestMentorship = !isMe && isAlumniOrFaculty && profile.mentorshipAvailable && me.role === "STUDENT";

  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorCategory, setMentorCategory] = useState("Career Guidance");
  const [mentorMessage, setMentorMessage] = useState("");

  const messageMutation = useMutation({
    mutationFn: () => startConversation(me.id, profile.id, profile.fullName, me.fullName),
    onSuccess: () => {
      push({ kind: "success", title: "Thread ready", description: `You can now chat with ${profile.fullName}.` });
      navigate("/app/messages");
    },
    onError: () => push({ kind: "error", title: "Failed", description: "Could not start conversation." }),
  });

  const mentorMutation = useMutation({
    mutationFn: () => submitMentorshipRequest({ requesterId: me.id, mentorId: profile.id, category: mentorCategory, message: mentorMessage }),
    onSuccess: () => {
      push({ kind: "success", title: "Mentorship request sent", description: `${profile.fullName} will be notified.` });
      setShowMentorModal(false);
      setMentorMessage("");
    },
    onError: () => push({ kind: "error", title: "Request failed", description: "Could not send mentorship request." }),
  });

  return (
    <>
      <Card className="flex flex-col transition-shadow hover:shadow-subtle">
        <CardContent className="flex flex-1 flex-col p-5">
          <div className="flex items-start gap-4">
            <Avatar name={profile.fullName} src={profile.avatarUrl} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{profile.fullName}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{getProfileDisplayTitle(profile)}</p>
                </div>
                {profile.mentorshipAvailable ? (
                  <Badge variant="success">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Mentor
                  </Badge>
                ) : isAlumniOrFaculty ? (
                  <Badge variant="outline">{profile.role}</Badge>
                ) : null}
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {getProfileDisplayOrganization(profile) ? (
                  <p className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {getProfileDisplayOrganization(profile)}
                  </p>
                ) : null}
                {profile.city ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {profile.city}
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
                {isFacultyProfile(profile) ? profile.faculty.researchInterests.slice(0, 2).map((item) => (
                  <Badge key={item} variant="outline">{item}</Badge>
                )) : null}
              </div>
            </div>
          </div>
          {!isMe ? (
            <div className="mt-auto flex gap-2 pt-4">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={messageMutation.isPending}
                onClick={() => messageMutation.mutate()}
              >
                {messageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Message
              </Button>
              {canRequestMentorship ? (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={mentorMutation.isPending}
                  onClick={() => setShowMentorModal(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Mentor me
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Mentorship Request Modal */}
      {showMentorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMentorModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Request mentorship</CardTitle>
              <CardDescription>Send a mentorship request to {profile.fullName}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (mentorMessage.trim().length >= 20) mentorMutation.mutate(); }}>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={mentorCategory} onChange={(e: any) => setMentorCategory(e.target.value)}>
                    {MENTORSHIP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Your message</Label>
                  <Textarea
                    placeholder="Introduce yourself and explain what guidance you're looking for (min 20 chars)..."
                    value={mentorMessage}
                    onChange={(e) => setMentorMessage(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" type="submit" disabled={mentorMutation.isPending || mentorMessage.trim().length < 20}>
                    {mentorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send request
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowMentorModal(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
