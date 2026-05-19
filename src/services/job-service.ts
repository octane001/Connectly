import { demoJobs } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { delay } from "@/lib/utils";
import { broadcastNotification } from "./notification-service";
import type { Database } from "@/types/database";
import type { Job } from "@/types/domain";

type JobCardRow = Database["public"]["Views"]["job_cards"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function mapJobRow(row: JobCardRow | any): Job {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    location: row.location,
    type: row.type as Job["type"],
    deadline: row.deadline,
    skills: (row.skills as string[]) ?? [],
    description: row.description,
    postedBy: row.posted_by_name ?? "Alumni",
    status: row.status as Job["status"],
    createdAt: row.created_at,
  };
}

export async function listJobs(search = ""): Promise<Job[]> {
  if (!supabase) {
    await delay();
    return demoJobs.filter((job) => [job.title, job.organization, job.skills.join(" ")].join(" ").toLowerCase().includes(search.toLowerCase()));
  }
  let query = supabase.from("job_cards").select("*").eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(40);
  if (search) query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapJobRow);
}

export async function createJob(input: { title: string; organization: string; location: string; type: string; deadline: string; skills: string; description: string; postedBy: string; posterRole?: string }) {
  if (!supabase) {
    await delay();
    return { id: crypto.randomUUID(), title: input.title, organization: input.organization, location: input.location, type: input.type as any, deadline: input.deadline, skills: parseList(input.skills), description: input.description, postedBy: input.postedBy, status: "PUBLISHED", createdAt: new Date().toISOString() } as Job;
  }
  const autoPublish = input.posterRole === "ADMIN" || input.posterRole === "SUPER_ADMIN";
  const { error } = await (supabase as any).from("jobs").insert({
    posted_by: input.postedBy, title: input.title, organization: input.organization, location: input.location,
    type: input.type as any, deadline: input.deadline, skills: parseList(input.skills), description: input.description,
    status: autoPublish ? "PUBLISHED" : "PENDING",
  });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["jobs"] });
  queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });

  if (autoPublish) {
    await broadcastNotification(
      `New job: ${input.title}`,
      `${input.title} at ${input.organization} (${input.type.replace("_", " ")})`,
      input.postedBy
    );
  }
  }

  export async function applyToJob(jobId: string, profileId: string, note = "") {
  if (!supabase) { await delay(); return; }
  const { error } = await (supabase as any).from("job_applications").insert({ job_id: jobId, applicant_id: profileId, note });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["my-applications"] });
  }

  export async function listMyApplications(profileId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("job_applications").select("job_id").eq("applicant_id", profileId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.job_id);
  }


export async function listPendingJobs(): Promise<Job[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("jobs").select("*, profiles(full_name)").eq("status", "PENDING").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, title: row.title, organization: row.organization, location: row.location,
    type: row.type, deadline: row.deadline, skills: row.skills ?? [], description: row.description,
    postedBy: row.profiles?.full_name ?? "Alumni", status: row.status, createdAt: row.created_at,
  }));
}

export async function moderateJob(jobId: string, status: "PUBLISHED" | "ARCHIVED") {
  if (!supabase) return;
  const { error } = await (supabase as any).from("jobs").update({ status }).eq("id", jobId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["jobs"] });
  queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });
}
