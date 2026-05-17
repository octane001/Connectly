import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(4, "Event title is required"),
  type: z.enum(["REUNION", "WEBINAR", "MENTORSHIP_SESSION", "WORKSHOP", "NETWORKING"]),
  startsAt: z.string().min(8, "Start date is required"),
  location: z.string().min(2, "Location is required"),
  description: z.string().min(30, "Description should explain the event"),
  capacity: z.coerce.number().min(1).max(10000).optional(),
});

export type EventInput = z.infer<typeof eventSchema>;
