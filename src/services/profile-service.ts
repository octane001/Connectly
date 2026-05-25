import { demoProfiles } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { calculateMentorMatches } from "@/features/matching/matching";
import { normalizeDirectoryFilters, paginationRange, profileMatchesFilters } from "@/features/directory/directory-query";
import { delay } from "@/lib/utils";
import type { Database } from "@/types/database";
import type {
  DirectoryFilters,
  MatchResult,
  Profile,
  AlumniImportRow,
} from "@/types/domain";
import {
  isAlumniProfile,
  isFacultyProfile,
  isStudentProfile,
} from "@/types/domain";

type ProfileDirectoryRow = Database["public"]["Views"]["profile_directory"]["Row"];

export function mapProfileRow(row: ProfileDirectoryRow | any): Profile {
  const skills = arrayValue(row.skills);
  const mentorshipAvailable = Boolean(row.mentorship_available ?? row.is_mentor ?? false);
  const mentorCategories = arrayValue(row.preference_categories ?? row.mentor_categories);
  const mentorshipCapacity = Number(row.mentorship_capacity ?? 0);
  const base = {
    id: row.id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role as Profile["role"],
    status: row.status as Profile["status"],
    department: row.department ?? "Unassigned",
    bio: row.bio,
    city: row.city,
    country: row.country,
    skills,
    technologyStack: arrayValue(row.technology_stack),
    achievements: arrayValue(row.achievements),
    projects: arrayValue(row.projects),
    socialLinks: (row.social_links as Record<string, string>) ?? {},
    displayTitle: row.designation ?? row.academic_title ?? null,
    displayOrganization: row.company ?? null,
    displayIndustry: row.industry ?? null,
    mentorshipAvailable,
    mentorCategories,
    mentorshipCapacity,
    profileCompleteness: row.profile_completeness ?? 0,
    phoneVisible: row.phone_visible ?? false,
    phone: row.phone ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (base.role === "ALUMNI") {
    return {
      ...base,
      role: "ALUMNI",
      alumni: {
        graduationYear: row.graduation_year ?? null,
        company: row.company ?? null,
        designation: row.designation ?? null,
        industry: row.industry ?? null,
        experienceYears: row.experience_years ?? null,
        mentorshipAvailable,
        interests: arrayValue(row.interests),
        degree: row.degree ?? null,
        specialization: row.specialization ?? null,
      },
    };
  }


  if (base.role === "FACULTY") {
    return {
      ...base,
      role: "FACULTY",
      faculty: {
        facultyId: row.faculty_id ?? null,
        academicTitle: row.academic_title ?? null,
        designation: row.designation ?? null,
        researchInterests: arrayValue(row.research_interests),
        publications: arrayValue(row.publications),
        interests: arrayValue(row.interests),
        officeHours: row.office_hours ?? null,
        officeLocation: row.office_location ?? null,
        mentorshipCapacity,
      },
    };
  }

  if (base.role === "ADMIN" || base.role === "SUPER_ADMIN") {
    return {
      ...base,
      role: base.role,
      admin: {
        adminLevel: row.admin_level ?? (base.role === "SUPER_ADMIN" ? "SUPER" : "STAFF"),
        permissions: arrayValue(row.permissions),
        internalRole: row.internal_role ?? row.designation ?? null,
        institutionName: row.company ?? null,
      },
    };
  }

  return {
    ...base,
    role: "STUDENT",
    student: {
      studentId: row.student_id ?? null,
      currentYear: row.current_year ?? null,
      degree: row.degree ?? null,
      specialization: row.specialization ?? null,
      cgpa: row.cgpa ?? null,
      interests: arrayValue(row.interests),
      careerGoals: row.career_goals ?? null,
    },
  };
}

function arrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function listProfiles(filters: DirectoryFilters = {}): Promise<{ data: Profile[]; count: number }> {
  const normalized = normalizeDirectoryFilters(filters);
  const { from, to } = paginationRange(normalized.page, normalized.pageSize);

  if (!supabase) {
    await delay();
    const filtered = demoProfiles.filter((profile) => profileMatchesFilters(profile, filters));
    return { data: filtered.slice(from, to + 1), count: filtered.length };
  }

  let query = supabase
    .from("profile_directory")
    .select("*", { count: "exact" })
    .eq("status", "ACTIVE")
    .range(from, to)
    .order("profile_completeness", { ascending: false });

  if (normalized.search) query = query.textSearch("search_document", normalized.search, { type: "websearch" });
  if (normalized.department) query = query.eq("department", normalized.department);
  if (normalized.graduationYear) query = query.eq("graduation_year", Number(normalized.graduationYear));
  if (normalized.company) query = query.ilike("company", `%${normalized.company}%`);
  if (normalized.industry) query = query.eq("industry", normalized.industry);
  if (normalized.city) query = query.ilike("city", `%${normalized.city}%`);
  if (normalized.role && (normalized.role as string) !== "ALL") query = query.eq("role", normalized.role);
  if (normalized.mentorship) query = query.eq("mentorship_available", true);
  if (normalized.skill) query = query.contains("skills", [normalized.skill]);
  if (normalized.research) query = query.textSearch("search_document", normalized.research, { type: "websearch" });

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(mapProfileRow), count: count ?? 0 };
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!supabase) {
    await delay();
    return demoProfiles.find((profile) => profile.id === id) ?? null;
  }
  const { data, error } = await supabase.from("profile_directory").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function getMyFullProfile(authUserId: string): Promise<Profile | null> {
  if (!supabase) return demoProfiles[0];
  const { data, error } = await supabase.from("profile_directory").select("*").eq("auth_user_id", authUserId).maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function getCollegeName(): Promise<string> {
  if (!supabase) return "Demo University";
  const { data } = await (supabase as any)
    .from("profile_directory")
    .select("company")
    .in("role", ["ADMIN", "SUPER_ADMIN"])
    .not("company", "is", null)
    .limit(1)
    .maybeSingle();
  return data?.company ?? "Alumni Network";
}

export async function getRecommendedMentors(student: Profile): Promise<MatchResult[]> {
  if (!supabase) {
    await delay();
    return calculateMentorMatches(student, demoProfiles);
  }
  const { data, error } = await supabase
    .from("profile_directory").select("*").eq("status", "ACTIVE").eq("mentorship_available", true).in("role", ["ALUMNI", "FACULTY"]).limit(80);
  if (error) throw error;
  return calculateMentorMatches(student, (data ?? []).map(mapProfileRow));
}

export async function listPendingUsers(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("profile_directory").select("*").in("status", ["PENDING", "INVITED"]).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => mapProfileRow(r));
}

export async function approveUser(profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("profiles").update({ status: "ACTIVE" }).eq("id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
}

export async function rejectUser(profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("profiles").update({ status: "SUSPENDED" }).eq("id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
}

export async function bulkImportAlumni(rows: AlumniImportRow[]): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  if (!supabase) return { inserted: rows.length, skipped: 0, errors: [] };
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.full_name || !row.email || !row.department || !row.graduation_year) {
      errors.push(`Skipped: missing required field for ${row.email || row.full_name || "unknown"}`);
      skipped++;
      continue;
    }
    const { error } = await (supabase as any).from("alumni_imports").insert({
      full_name: row.full_name.trim(),
      email: row.email.trim().toLowerCase(),
      department: row.department.trim(),
      graduation_year: Number(row.graduation_year),
      company: row.company?.trim() || null,
      designation: row.designation?.trim() || null,
      status: "INVITED",
    });
    if (error) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        errors.push(`Skipped duplicate: ${row.email}`);
        skipped++;
      } else {
        errors.push(`Error for ${row.email}: ${error.message}`);
        skipped++;
      }
    } else {
      inserted++;
    }
  }
  queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  return { inserted, skipped, errors };
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  if (!supabase) { await delay(); return profile; }
  const now = new Date().toISOString();
  const { error } = await (supabase as any).from("profiles").update({
    full_name: profile.fullName,
    role: profile.role,
    status: profile.status,
    bio: profile.bio,
    city: profile.city,
    country: profile.country,
    department: profile.department,
    technology_stack: profile.technologyStack,
    achievements: profile.achievements,
    projects: profile.projects,
    social_links: profile.socialLinks ?? {},
    profile_completeness: profile.profileCompleteness,
    updated_at: now,
  }).eq("id", profile.id);
  if (error) throw error;

  await saveRoleProfile(profile, now);

  await (supabase as any).from("privacy_settings").upsert({
    profile_id: profile.id,
    show_phone: profile.phoneVisible,
    updated_at: now,
  }, { onConflict: "profile_id" });

  try {
    await (supabase as any).rpc("replace_profile_skills", { target_profile_id: profile.id, skill_names: profile.skills });
  } catch { /* ignore */ }

  queryClient.invalidateQueries({ queryKey: ["profiles"] });
  return profile;
}

export async function completeOnboarding(profile: Profile): Promise<Profile> {
  return saveProfile(profile);
}

async function saveRoleProfile(profile: Profile, updatedAt: string) {
  if (!supabase) return;

  if (isStudentProfile(profile)) {
    const { error } = await (supabase as any).from("student_profiles").upsert({
      profile_id: profile.id,
      student_id: profile.student.studentId || null,
      current_year: profile.student.currentYear ?? null,
      degree: profile.student.degree || null,
      specialization: profile.student.specialization || null,
      cgpa: profile.student.cgpa ?? null,
      interests: profile.student.interests,
      career_goals: profile.student.careerGoals || null,
      updated_at: updatedAt,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    await saveMentorshipPreferences(profile, updatedAt);
    return;
  }

  if (isAlumniProfile(profile)) {
    const { error } = await (supabase as any).from("alumni_profiles").upsert({
      profile_id: profile.id,
      graduation_year: profile.alumni.graduationYear ?? null,
      company: profile.alumni.company || null,
      designation: profile.alumni.designation || null,
      industry: profile.alumni.industry || null,
      experience_years: profile.alumni.experienceYears ?? null,
      mentorship_available: profile.alumni.mentorshipAvailable,
      interests: profile.alumni.interests || [],
      degree: profile.alumni.degree || null,
      specialization: profile.alumni.specialization || null,
      updated_at: updatedAt,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    await saveMentorshipPreferences(profile, updatedAt);
    return;
  }

  if (isFacultyProfile(profile)) {
    const { error } = await (supabase as any).from("faculty_profiles").upsert({
      profile_id: profile.id,
      faculty_id: profile.faculty.facultyId || null,
      academic_title: profile.faculty.academicTitle || null,
      designation: profile.faculty.designation || null,
      research_interests: profile.faculty.researchInterests,
      publications: profile.faculty.publications,
      interests: profile.faculty.interests || [],
      office_hours: profile.faculty.officeHours || null,
      office_location: profile.faculty.officeLocation || null,
      mentorship_capacity: profile.faculty.mentorshipCapacity,
      updated_at: updatedAt,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    await saveMentorshipPreferences(profile, updatedAt);
    return;
  }

  const { error } = await (supabase as any).from("admin_profiles").upsert({
    profile_id: profile.id,
    admin_level: profile.admin.adminLevel,
    permissions: profile.admin.permissions,
    internal_role: profile.admin.internalRole || null,
    institution_name: profile.admin.institutionName || null,
    updated_at: updatedAt,
  }, { onConflict: "profile_id" });
  if (error) throw error;
  await saveMentorshipPreferences(profile, updatedAt);
}

async function saveMentorshipPreferences(profile: Profile, updatedAt: string) {
  if (!supabase) return;

  if (isAlumniProfile(profile)) {
    const { error } = await (supabase as any).from("mentorship_preferences").upsert({
      profile_id: profile.id,
      is_available: profile.alumni.mentorshipAvailable,
      categories: profile.mentorCategories,
      industries: profile.alumni.industry ? [profile.alumni.industry] : [],
      max_requests_per_month: profile.alumni.mentorshipAvailable ? Math.max(1, profile.mentorshipCapacity || 4) : 0,
      updated_at: updatedAt,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    return;
  }

  if (isFacultyProfile(profile)) {
    const { error } = await (supabase as any).from("mentorship_preferences").upsert({
      profile_id: profile.id,
      is_available: profile.faculty.mentorshipCapacity > 0,
      categories: profile.mentorCategories,
      industries: [],
      max_requests_per_month: profile.faculty.mentorshipCapacity,
      updated_at: updatedAt,
    }, { onConflict: "profile_id" });
    if (error) throw error;
    return;
  }

  const { error } = await (supabase as any).from("mentorship_preferences").upsert({
    profile_id: profile.id,
    is_available: false,
    categories: [],
    industries: [],
    max_requests_per_month: 0,
    updated_at: updatedAt,
  }, { onConflict: "profile_id" });
  if (error) throw error;
}

export async function uploadAvatar(authUserId: string, profileId: string, file: File): Promise<string> {
  if (!supabase) return "";
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${authUserId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  await (supabase as any).from("profiles").update({ avatar_url: avatarUrl }).eq("id", profileId);
  queryClient.invalidateQueries({ queryKey: ["profiles"] });
  return avatarUrl;
}
