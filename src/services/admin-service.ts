import { demoAnalytics, demoProfiles } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { delay } from "@/lib/utils";
import type { AnalyticsSnapshot, Profile, UserRole } from "@/types/domain";
import { queryClient } from "@/lib/query-client";
import { mapProfileRow } from "./profile-service";

export interface UserListOptions {
  search?: string;
  role?: UserRole | "ALL";
  page?: number;
  pageSize?: number;
}

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

export async function listAllUsers(options: UserListOptions = {}): Promise<{ data: Profile[]; count: number }> {
  const { search = "", role = "ALL", page = 1, pageSize = 12 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!supabase) {
    await delay();
    let filtered = [...demoProfiles];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.fullName.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
      );
    }
    if (role && role !== "ALL") {
      filtered = filtered.filter(p => p.role === role);
    }
    return { data: filtered.slice(from, to + 1), count: filtered.length };
  }

  let query = supabase
    .from("profile_directory")
    .select("*", { count: "exact" })
    .range(from, to)
    .order("full_name", { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role && role !== "ALL") {
    query = query.eq("role", role);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(mapProfileRow), count: count ?? 0 };
}

export async function updateUserRole(profileId: string, role: UserRole): Promise<void> {
  if (!supabase) {
    await delay();
    // In demo mode: mutate the in-memory profile so the UI reflects the change
    const idx = demoProfiles.findIndex(p => p.id === profileId);
    if (idx !== -1) {
      const existing = demoProfiles[idx];
      // Build a minimal valid profile shape for the new role
      const base = {
        ...existing,
        role,
        updatedAt: new Date().toISOString(),
      };
      let updated: Profile;
      if (role === "ALUMNI") {
        updated = { ...base, role: "ALUMNI", alumni: { graduationYear: null, company: null, designation: null, industry: null, experienceYears: null, mentorshipAvailable: false, interests: [], degree: null, specialization: null } };
      } else if (role === "FACULTY") {
        updated = { ...base, role: "FACULTY", faculty: { facultyId: null, academicTitle: null, designation: null, researchInterests: [], publications: [], interests: [], officeHours: null, officeLocation: null, mentorshipCapacity: 0 } };
      } else if (role === "ADMIN") {
        updated = { ...base, role: "ADMIN", admin: { adminLevel: "STAFF", permissions: [], internalRole: null, institutionName: null } };
      } else {
        updated = { ...base, role: "STUDENT", student: { studentId: null, currentYear: null, degree: null, specialization: null, cgpa: null, interests: [], careerGoals: null } };
      }
      demoProfiles[idx] = updated as Profile;
    }
    queryClient.invalidateQueries({ queryKey: ["user-list"] });
    queryClient.invalidateQueries({ queryKey: ["user-search"] });
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
  queryClient.invalidateQueries({ queryKey: ["user-list"] });
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
