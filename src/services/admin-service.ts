import { demoAnalytics, demoProfiles } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { delay } from "@/lib/utils";
import type { AnalyticsSnapshot, Profile, UserRole } from "@/types/domain";
import { queryClient } from "@/lib/query-client";
import { mapProfileRow } from "./profile-service";

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  if (!supabase) {
    await delay();
    return demoAnalytics;
  }

  const [{ count: users }, { count: mentors }, { count: approvals }, { count: jobs }, { count: registrations }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("profile_directory").select("*", { count: "exact", head: true }).eq("status", "ACTIVE").eq("mentorship_available", true).in("role", ["ALUMNI", "FACULTY"]),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
    supabase.from("event_registrations").select("*", { count: "exact", head: true }),
  ]);

  const monthlyEngagement = await getMonthlyEngagement();

  return {
    totalUsers: users ?? 0,
    activeMentors: mentors ?? 0,
    pendingApprovals: approvals ?? 0,
    openJobs: jobs ?? 0,
    eventRegistrations: registrations ?? 0,
    monthlyEngagement,
  };
}

async function getMonthlyEngagement(): Promise<AnalyticsSnapshot["monthlyEngagement"]> {
  if (!supabase) return demoAnalytics.monthlyEngagement;

  const [users, requests, jobs] = await Promise.all([
    (supabase as any).from("profiles").select("created_at").eq("status", "ACTIVE"),
    (supabase as any).from("mentorship_requests").select("created_at"),
    (supabase as any).from("jobs").select("created_at").eq("status", "PUBLISHED"),
  ]);

  const userDates = (users.data ?? []).map((r: any) => new Date(r.created_at));
  const requestDates = (requests.data ?? []).map((r: any) => new Date(r.created_at));
  const jobDates = (jobs.data ?? []).map((r: any) => new Date(r.created_at));

  const months = [];
  const now = new Date();

  // Last 5 months
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short" });
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    months.push({
      month: label,
      users: userDates.filter((date: Date) => date <= endOfMonth).length,
      mentorship: requestDates.filter((date: Date) => date <= endOfMonth).length,
      jobs: jobDates.filter((date: Date) => date <= endOfMonth).length,
    });
  }

  return months;
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  if (!supabase) {
    await delay();
    return demoProfiles.filter(p => 
      p.fullName.toLowerCase().includes(query.toLowerCase()) || 
      p.email?.toLowerCase().includes(query.toLowerCase())
    );
  }

  const { data, error } = await supabase
    .from("profile_directory")
    .select("*")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return (data ?? []).map(mapProfileRow);
}

export async function updateUserRole(profileId: string, role: UserRole): Promise<void> {
  if (!supabase) {
    await delay();
    return;
  }

  const { error } = await (supabase as any).rpc("admin_change_user_role", {
    target_profile_id: profileId,
    new_role: role
  });

  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["profiles"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  queryClient.invalidateQueries({ queryKey: ["user-search"] });
}

export async function transitionGraduatedStudents(): Promise<number> {
  if (!supabase) {
    await delay();
    return 0;
  }

  const { data, error } = await (supabase as any).rpc("admin_transition_graduated_students");

  if (error) throw error;
  
  const count = data?.[0]?.affected_count ?? 0;
  
  if (count > 0) {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  }
  
  return count;
}
