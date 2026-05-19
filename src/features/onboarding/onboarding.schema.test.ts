import { describe, expect, it } from "vitest";
import { onboardingSchema } from "@/features/onboarding/schemas";

describe("onboarding schema", () => {
  it("accepts complete fallback verification details", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Aarav Mehta",
      role: "STUDENT",
      department: "Computer Science",
      studentId: "CS2027-041",
      currentYear: 4,
      degree: "B.Tech",
      specialization: "Computer Science",
      cgpa: 8.6,
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
      skills: "Operations",
    };

    const adminResult = onboardingSchema.safeParse({ ...base, role: "ADMIN" });
    const superAdminResult = onboardingSchema.safeParse({ ...base, role: "SUPER_ADMIN" });

    expect(adminResult.success).toBe(false);
    expect(superAdminResult.success).toBe(false);
  });
});
