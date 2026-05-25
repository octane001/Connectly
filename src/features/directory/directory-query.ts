import {
  getProfileCareerGoals,
  getProfileDisplayOrganization,
  getProfileDisplayTitle,
  getProfileGraduationYear,
  getProfileIndustry,
  getProfileInterests,
  getProfileResearchInterests,
  isAlumniProfile,
  isFacultyProfile,
  type DirectoryFilters,
  type Profile,
} from "@/types/domain";

export const DEFAULT_PAGE_SIZE = 12;

export function normalizeDirectoryFilters(filters: DirectoryFilters) {
  return {
    search: filters.search?.trim() || undefined,
    department: filters.department && filters.department !== "ALL" ? filters.department : undefined,
    graduationYear: filters.graduationYear?.trim() || undefined,
    company: filters.company?.trim() || undefined,
    industry: filters.industry && filters.industry !== "ALL" ? filters.industry : undefined,
    city: filters.city?.trim() || undefined,
    role: filters.role && filters.role !== "ALL" ? filters.role : undefined,
    mentorship: filters.mentorship === "OPEN" ? "OPEN" : undefined,
    skill: filters.skill?.trim() || undefined,
    research: filters.research?.trim() || undefined,
    page: Math.max(1, filters.page ?? 1),
    pageSize: Math.min(30, Math.max(6, filters.pageSize ?? DEFAULT_PAGE_SIZE)),
  };
}

export function paginationRange(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(30, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  return { from, to: from + safePageSize - 1 };
}

export function profileMatchesFilters(profile: Profile, filters: DirectoryFilters) {
  const normalized = normalizeDirectoryFilters(filters);
  const searchText = [
    profile.fullName,
    profile.department,
    getProfileDisplayOrganization(profile),
    getProfileDisplayTitle(profile),
    getProfileIndustry(profile),
    profile.city,
    profile.skills.join(" "),
    getProfileInterests(profile).join(" "),
    getProfileCareerGoals(profile),
    getProfileResearchInterests(profile).join(" "),
    profile.mentorCategories.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (normalized.search && !searchText.includes(normalized.search.toLowerCase())) return false;
  if (normalized.department && profile.department !== normalized.department) return false;
  if (normalized.graduationYear && String(getProfileGraduationYear(profile) ?? "") !== normalized.graduationYear) return false;
  if (normalized.company && !(getProfileDisplayOrganization(profile) ?? "").toLowerCase().includes(normalized.company.toLowerCase())) return false;
  if (normalized.industry && getProfileIndustry(profile) !== normalized.industry) return false;
  if (normalized.city && !(profile.city ?? "").toLowerCase().includes(normalized.city.toLowerCase())) return false;
  if (normalized.role && profile.role !== normalized.role) return false;
  if (normalized.mentorship && !profile.mentorshipAvailable) return false;
  if (normalized.skill && !profile.skills.some((skill) => skill.toLowerCase().includes(normalized.skill!.toLowerCase()))) {
    return false;
  }
  if (normalized.research) {
    if (!isFacultyProfile(profile)) return false;
    if (!profile.faculty.researchInterests.some((item) => item.toLowerCase().includes(normalized.research!.toLowerCase()))) return false;
  }
  if (normalized.company && !isAlumniProfile(profile) && profile.role !== "ADMIN") return false;

  return profile.status === "ACTIVE";
}
