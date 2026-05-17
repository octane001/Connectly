import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarDays,
  GraduationCap,
  Handshake,
  Lock,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currencyFreeLabel } from "@/lib/utils";

const benefits = [
  { icon: Search, title: "Alumni discovery", text: "Search verified alumni by batch, department, skills, company, industry, and mentorship availability." },
  { icon: Sparkles, title: "Smart matching", text: "Custom weighted matching recommends mentors without paid AI APIs or third-party scoring services." },
  { icon: Briefcase, title: "Placement support", text: "Alumni referrals, internships, research roles, and skill-based opportunity discovery in one clean workspace." },
  { icon: Lock, title: "Privacy-first contact", text: "Emails stay private. Requests, notifications, and accepted message threads handle communication." },
];

const stats = [
  ["1,248", "Verified members"],
  ["186", "Active mentors"],
  ["38", "Open opportunities"],
  ["512", "Event registrations"],
];

export function LandingPage() {
  return (
    <main>
      <section className="border-b">
        <div className="page-shell grid min-h-[calc(100vh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <Badge variant="outline" className="mb-5">
              {currencyFreeLabel()} university networking platform
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              Connectly
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              A professional alumni management and networking platform for mentorship, placement support, student guidance,
              university engagement, jobs, events, and verified alumni relationships.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/auth">
                  Join the network
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#mentorship">Explore features</a>
              </Button>
            </div>
          </motion.div>

          <div className="rounded-lg border bg-card p-4 shadow-subtle">
            <div className="rounded-md border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Best Mentor Match</p>
                  <p className="text-xs text-muted-foreground">For Aarav Mehta, Computer Science</p>
                </div>
                <Badge variant="success">94% Match</Badge>
              </div>
              <div className="mt-5 rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Nisha Rao</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Senior Software Engineer, Atlassian</p>
                  </div>
                  <Badge>Open mentor</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Same Department", "React", "System Design", "Resume Review"].map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {stats.map(([value, label]) => (
                  <div key={label} className="rounded-md border bg-background p-4">
                    <p className="text-xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mentorship" className="page-shell py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why Connectly</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">Built for real university alumni engagement</h2>
          <p className="mt-3 text-muted-foreground">
            Clean workflows for students, alumni, faculty, and administrators without the weight of a generic social network.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <Card key={benefit.title}>
              <CardContent className="p-5">
                <benefit.icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-4 font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="jobs" className="border-y bg-muted/35">
        <div className="page-shell grid gap-8 py-16 lg:grid-cols-3">
          {[
            { icon: Handshake, title: "Mentorship requests", text: "Students request guidance by category and mentors accept before conversations begin." },
            { icon: Briefcase, title: "Jobs and referrals", text: "Alumni and faculty post curated opportunities with deadlines and skill requirements." },
            { icon: CalendarDays, title: "Events and RSVP", text: "Admins coordinate reunions, webinars, workshops, and networking sessions." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="engagement" className="page-shell py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge variant="outline">Professional admin control</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal">Approval workflows, analytics, and moderation</h2>
            <p className="mt-3 text-muted-foreground">
              Admins can review fallback onboarding requests, manage roles and statuses, moderate jobs, create events, and
              track mentorship and engagement health with free charting tools.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: BadgeCheck, text: "Verified alumni imports" },
              { icon: Users, text: "Role-based dashboards" },
              { icon: BarChart3, text: "Engagement analytics" },
              { icon: GraduationCap, text: "Student guidance workflows" },
            ].map((item) => (
              <div key={item.text} className="rounded-lg border bg-card p-4 text-sm font-medium shadow-sm">
                <item.icon className="mb-3 h-5 w-5 text-muted-foreground" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
