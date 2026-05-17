import { describe, expect, it } from "vitest";
import { onboardingSchema } from "@/features/onboarding/schemas";

describe("onboarding schema", () => {
  it("accepts complete fallback verification details", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Aarav Mehta",
      role: "STUDENT",
      department: "Computer Science",
      studentId: "CS2027-041",
      graduationYear: 2027,
      skills: "React, Python",
      interests: "Machine Learning, Product Engineering",
      careerGoals: "I want to become a product-minded software engineer.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects direct admin role onboarding", () => {
    const base = {
      fullName: "Root User",
      department: "Computer Science",
      studentId: "ROOT",
      graduationYear: 2027,
      skills: "Operations",
      interests: "Administration",
      careerGoals: "I want to manage the platform with full system privileges.",
    };

    const adminResult = onboardingSchema.safeParse({ ...base, role: "ADMIN" });
    const superAdminResult = onboardingSchema.safeParse({ ...base, role: "SUPER_ADMIN" });

    expect(adminResult.success).toBe(false);
    expect(superAdminResult.success).toBe(false);
  });
});
