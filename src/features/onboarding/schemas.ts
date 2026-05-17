import { z } from "zod";
import { DEPARTMENTS } from "@/lib/constants";

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.enum(["STUDENT", "ALUMNI", "FACULTY"], {
    invalid_type_error: "Choose student, alumni, or faculty",
    required_error: "Choose student, alumni, or faculty",
  }),
  department: z.enum(DEPARTMENTS as [string, ...string[]]),
  studentId: z.string().min(3, "Student ID is required for verification").optional().or(z.literal("")),
  graduationYear: z.coerce.number().min(1970).max(2035),
  skills: z.string().min(2, "Add at least one skill"),
  interests: z.string().min(2, "Add at least one interest"),
  careerGoals: z.string().min(20, "Write a short career goal"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSchema = z.object({
  fullName: z.string().min(2),
  bio: z.string().max(800).optional(),
  company: z.string().max(120).optional(),
  designation: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  department: z.string().optional(),
  industry: z.string().optional(),
  skills: z.string().min(2),
  interests: z.string().min(2),
  phoneVisible: z.boolean().default(false),
});

export type ProfileInput = z.infer<typeof profileSchema>;
