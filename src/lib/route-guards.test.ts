import { describe, expect, it } from "vitest";
import { demoProfiles } from "@/lib/demo-data";
import { canAccessAdmin, canAccessApp, canManageContent, canPostJobs, onboardingTarget } from "@/lib/route-guards";
import type { Profile } from "@/types/domain";

describe("route guards", () => {
  const student = demoProfiles.find((profile) => profile.role === "STUDENT")!;
  const alumni = demoProfiles.find((profile) => profile.role === "ALUMNI")!;
  const faculty = demoProfiles.find((profile) => profile.role === "FACULTY")!;
  const admin = demoProfiles.find((profile) => profile.role === "ADMIN")!;

  it("allows only active users into the app", () => {
    expect(canAccessApp(student)).toBe(true);
    expect(canAccessApp({ ...student, status: "PENDING" })).toBe(false);
  });

  it("restricts admin routes to admin roles", () => {
    expect(canAccessAdmin(admin)).toBe(true);
    expect(canAccessAdmin({ ...admin, status: "PENDING" })).toBe(false);
    expect(canAccessAdmin(student)).toBe(false);
  });

  it("models role-specific content and job permissions", () => {
    expect(canManageContent(faculty)).toBe(true);
    expect(canManageContent(alumni)).toBe(false);
    expect(canPostJobs(alumni)).toBe(true);
    expect(canPostJobs(student)).toBe(false);
  });

  it("routes pending accounts to onboarding", () => {
    const pending: Profile = { ...student, status: "PENDING" };
    expect(onboardingTarget(null)).toBe("/auth");
    expect(onboardingTarget(pending)).toBe("/onboarding");
    expect(onboardingTarget(student)).toBe("/app");
  });
});
