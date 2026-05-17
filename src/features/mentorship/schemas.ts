import { z } from "zod";
import { MENTORSHIP_CATEGORIES } from "@/lib/constants";

export const mentorshipRequestSchema = z.object({
  category: z.enum(MENTORSHIP_CATEGORIES as [string, ...string[]]),
  message: z.string().min(20, "Share enough context for the mentor"),
});

export type MentorshipRequestInput = z.infer<typeof mentorshipRequestSchema>;
