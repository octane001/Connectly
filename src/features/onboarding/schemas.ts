import { z } from "zod";
import { DEPARTMENTS, INDUSTRIES } from "@/lib/constants";

const csvText = z.string().min(2, "Add at least one item");
const optionalCsvText = z.string().optional().or(z.literal(""));
const optionalCgpa = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : value,
  z.coerce.number().min(0).max(10).optional()
);

const baseOnboardingFields = {
  fullName: z.string().min(2, "Full name is required"),
  department: z.enum(DEPARTMENTS as [string, ...string[]]),
  bio: z.string().max(800).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  skills: csvText,
  phoneVisible: z.boolean().default(false),
};

export const studentOnboardingSchema = z.object({
  ...baseOnboardingFields,
  role: z.literal("STUDENT"),
  studentId: z.string().min(3, "Student ID is required"),
  currentYear: z.coerce.number().min(1).max(8),
  degree: z.string().min(2, "Degree is required"),
  specialization: z.string().min(2, "Specialization is required"),
  cgpa: optionalCgpa,
  interests: csvText,
  careerGoals: z.string().min(20, "Write a short career goal"),
});

export const alumniOnboardingSchema = z.object({
  ...baseOnboardingFields,
  role: z.literal("ALUMNI"),
  graduationYear: z.coerce.number().min(1970).max(2035),
  company: z.string().min(2, "Company is required"),
  designation: z.string().min(2, "Designation is required"),
  industry: z.enum(INDUSTRIES as [string, ...string[]]),
  experienceYears: z.coerce.number().min(0).max(80),
  mentorshipAvailable: z.boolean().default(false),
  mentorCategories: optionalCsvText,
  interests: csvText,
  degree: z.string().min(2, "Degree is required"),
  specialization: z.string().min(2, "Specialization is required"),
});

export const facultyOnboardingSchema = z.object({
  ...baseOnboardingFields,
  role: z.literal("FACULTY"),
  facultyId: z.string().min(3, "Faculty ID is required"),
  academicTitle: z.string().min(2, "Academic title is required"),
  designation: z.string().min(2, "Designation is required"),
  researchInterests: csvText,
  publications: optionalCsvText,
  interests: csvText,
  officeLocation: z.string().max(120).optional().or(z.literal("")),
  officeHours: z.string().max(120).optional().or(z.literal("")),
  mentorshipCapacity: z.coerce.number().min(0).max(50),
});

export const adminProfileSchema = z.object({
  fullName: z.string().min(2),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
  department: z.string().min(2),
  bio: z.string().max(800).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  skills: optionalCsvText,
  phoneVisible: z.boolean().default(false),
  institutionName: z.string().max(160).optional().or(z.literal("")),
  adminLevel: z.string().min(2),
  permissions: optionalCsvText,
  internalRole: z.string().max(120).optional().or(z.literal("")),
});

export const onboardingSchema = z.discriminatedUnion("role", [
  studentOnboardingSchema,
  alumniOnboardingSchema,
  facultyOnboardingSchema,
]);

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSchema = z.discriminatedUnion("role", [
  studentOnboardingSchema,
  alumniOnboardingSchema,
  facultyOnboardingSchema,
  adminProfileSchema,
]);

export type ProfileInput = z.infer<typeof profileSchema>;
