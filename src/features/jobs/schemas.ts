import { z } from "zod";

export const jobSchema = z.object({
  title: z.string().min(4, "Job title is required"),
  organization: z.string().min(2, "Organization is required"),
  location: z.string().min(2, "Location is required"),
  type: z.enum(["INTERNSHIP", "REFERRAL", "RESEARCH", "FREELANCE", "STARTUP", "FULL_TIME"]),
  deadline: z.string().min(8, "Deadline is required"),
  skills: z.string().min(2, "Add at least one required skill"),
  description: z.string().min(30, "Add a clear opportunity description"),
});

export type JobInput = z.infer<typeof jobSchema>;
