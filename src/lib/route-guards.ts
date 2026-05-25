import type { AccountStatus, Profile, UserRole } from "@/types/domain";

const adminRoles: UserRole[] = ["ADMIN"];
const activeStatuses: AccountStatus[] = ["ACTIVE"];

export function canAccessApp(profile: Profile | null) {
  return Boolean(profile && activeStatuses.includes(profile.status));
}

export function canAccessAdmin(profile: Profile | null) {
  return Boolean(profile && activeStatuses.includes(profile.status) && adminRoles.includes(profile.role));
}

export function canManageContent(profile: Profile | null) {
  return Boolean(profile && activeStatuses.includes(profile.status) && ["FACULTY", "ADMIN"].includes(profile.role));
}

export function canPostJobs(profile: Profile | null) {
  return Boolean(profile && activeStatuses.includes(profile.status) && ["ALUMNI", "FACULTY", "ADMIN"].includes(profile.role));
}

export function onboardingTarget(profile: Profile | null) {
  if (!profile) return "/auth";
  if (profile.status === "PENDING") return "/onboarding";
  if (profile.status === "SUSPENDED" || profile.status === "BANNED") return "/auth";
  return "/app";
}
