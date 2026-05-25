import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Briefcase, CheckCircle, Clock, Loader2, MapPin, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/page-header";
import { createJob, listJobs, applyToJob, listMyApplications } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { canPostJobs } from "@/lib/route-guards";
import { formatDate } from "@/lib/utils";
import { jobSchema, type JobInput } from "./schemas";

export function JobsPage() {
  const profile = useAuthStore((s) => s.profile)!;
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const jobs = useQuery({ queryKey: ["jobs", search], queryFn: () => listJobs(search) });
  const myApps = useQuery({ queryKey: ["my-applications"], queryFn: () => listMyApplications(profile.id) });
  const { push } = useToast();

  const appliedSet = new Set(myApps.data ?? []);

  const form = useForm<JobInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: { title: "", organization: "", location: "", type: "INTERNSHIP", deadline: "", skills: "", description: "" },
  });

  const isAdmin = profile.role === "ADMIN";

  const create = useMutation({
    mutationFn: (input: JobInput) => createJob({ ...input, postedBy: profile.id, posterRole: profile.role }),
    onSuccess: () => { push({ kind: "success", title: isAdmin ? "Job published" : "Job submitted", description: isAdmin ? "It is now visible in the job board." : "It will appear after admin approval." }); setShowForm(false); form.reset(); },
    onError: () => push({ kind: "error", title: "Failed to create job" }),
  });

  const apply = useMutation({
    mutationFn: (jobId: string) => applyToJob(jobId, profile.id),
    onSuccess: () => push({ kind: "success", title: "Application submitted", description: "The poster will be notified." }),
    onError: () => push({ kind: "error", title: "Already applied or error" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jobs & opportunities"
        title="Internships, referrals, and research positions"
        description="Alumni-powered job board with skill matching, deadline tracking, and role-based posting."
        action={canPostJobs(profile) ? (
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Post opportunity</Button>
        ) : undefined}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search by title, organization, or skill" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm ? (
        <Card>
          <CardHeader><CardTitle>New opportunity</CardTitle><CardDescription>{isAdmin ? "Admin jobs are published immediately." : "Jobs start as pending and require admin approval."}</CardDescription></CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((d) => create.mutate(d))}>
              <div className="space-y-2"><Label>Title</Label><Input {...form.register("title")} /></div>
              <div className="space-y-2"><Label>Organization</Label><Input {...form.register("organization")} /></div>
              <div className="space-y-2"><Label>Location</Label><Input {...form.register("location")} /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select {...form.register("type")}>
                  <option value="INTERNSHIP">Internship</option><option value="REFERRAL">Referral</option>
                  <option value="RESEARCH">Research</option><option value="FREELANCE">Freelance</option>
                  <option value="STARTUP">Startup</option><option value="FULL_TIME">Full Time</option>
                </Select>
              </div>
              <div className="space-y-2"><Label>Deadline</Label><Input type="date" {...form.register("deadline")} /></div>
              <div className="space-y-2"><Label>Skills (comma-separated)</Label><Input placeholder="React, Python, SQL" {...form.register("skills")} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea {...form.register("description")} /></div>
              <Button className="md:col-span-2" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Submit
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(jobs.data ?? []).map((job) => {
          const applied = appliedSet.has(job.id);
          return (
            <Card key={job.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="outline">{job.type.replace("_", " ")}</Badge>
                  {applied ? <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Applied</Badge> : null}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{job.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{job.organization}</p>
                <p className="mt-2 text-sm text-muted-foreground">{job.description.slice(0, 100)}{job.description.length > 100 ? "..." : ""}</p>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{job.location}</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4" />Deadline: {formatDate(job.deadline)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.slice(0, 4).map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Posted by {job.postedBy}</p>
                {!isAdmin ? (
                  <div className="mt-auto pt-4">
                    {applied ? (
                      <Button variant="outline" className="w-full" disabled>Already Applied</Button>
                    ) : (
                      <Button className="w-full" onClick={() => apply.mutate(job.id)} disabled={apply.isPending}>
                        {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />} Apply
                      </Button>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
