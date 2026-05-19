import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, CalendarDays, MessageSquare, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { getAnalytics, getRecommendedMentors, listEvents, listFeedPosts, listJobs } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/utils";
import { getProfileDisplayOrganization, getProfileDisplayTitle } from "@/types/domain";

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });
  const mentors = useQuery({ queryKey: ["mentor-recommendations", profile.id], queryFn: () => getRecommendedMentors(profile) });
  const jobs = useQuery({ queryKey: ["jobs", "dashboard"], queryFn: () => listJobs("") });
  const events = useQuery({ queryKey: ["events", "dashboard"], queryFn: () => listEvents() });
  const feed = useQuery({ queryKey: ["feed", "dashboard"], queryFn: () => listFeedPosts() });

  const cards = [
    { label: "Network members", value: analytics.data?.totalUsers ?? 0, icon: Users },
    { label: "Active mentors", value: analytics.data?.activeMentors ?? 0, icon: Sparkles },
    { label: "Open jobs", value: analytics.data?.openJobs ?? 0, icon: Briefcase },
    { label: "Event RSVPs", value: analytics.data?.eventRegistrations ?? 0, icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${profile.role.replace("_", " ")} dashboard`}
        title={`Welcome back, ${profile.fullName.split(" ")[0]}`}
        description="Your personalized alumni network workspace for mentorship, opportunities, events, and university updates."
        action={
          <Button asChild>
            <Link to="/app/directory">
              Explore directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{card.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recommended next steps</CardTitle>
            <CardDescription>Actions are tailored to your role and profile status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Profile completeness</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Complete profiles rank higher in matching and directory search.</p>
                </div>
                <Badge variant={profile.profileCompleteness >= 80 ? "success" : "warning"}>{profile.profileCompleteness}%</Badge>
              </div>
              <Progress value={profile.profileCompleteness} className="mt-4" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { to: "/app/mentorship", title: "Find mentors", text: "Review smart recommendations." },
                { to: "/app/jobs", title: "Explore jobs", text: "Filter internships and referrals." },
                { to: "/app/events", title: "RSVP events", text: "Join upcoming sessions." },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best mentor matches</CardTitle>
            <CardDescription>Mentors matched to your skills and career interests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(mentors.data ?? []).slice(0, 3).map((match) => (
              <Link key={match.profile.id} to="/app/mentorship" className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{match.profile.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[getProfileDisplayTitle(match.profile), getProfileDisplayOrganization(match.profile)].filter(Boolean).join(" at ")}
                    </p>
                  </div>
                  <Badge variant="success">{match.score}%</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {match.reasons.slice(0, 3).map((reason) => (
                    <Badge key={reason} variant="outline">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Latest opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(jobs.data ?? []).slice(0, 3).map((job) => (
              <div key={job.id} className="rounded-md border p-3">
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-muted-foreground">{job.organization}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(events.data ?? []).slice(0, 3).map((event) => (
              <div key={event.id} className="rounded-md border p-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">{formatDate(event.startsAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>University feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(feed.data ?? []).slice(0, 3).map((post) => (
              <div key={post.id} className="rounded-md border p-3">
                <p className="font-medium">{post.title}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {post.comments} comments
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
