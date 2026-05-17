import { describe, expect, it } from "vitest";
import { mapEventRow, mapFeedRow, mapJobRow } from "@/lib/api";

describe("Supabase API mappers", () => {
  it("maps job card rows with joined author and application state", () => {
    const job = mapJobRow(
      {
        id: "job-1",
        title: "Frontend Internship",
        organization: "Connectly Labs",
        location: "Remote",
        type: "INTERNSHIP",
        deadline: "2026-07-01",
        skills: ["React", "TypeScript"],
        description: "Build useful UI.",
        posted_by: "profile-1",
        posted_by_name: "Nisha Rao",
        status: "PUBLISHED",
        applications_count: 3,
        created_at: "2026-05-16T00:00:00.000Z",
      },
      true,
    );

    expect(job.postedBy).toBe("Nisha Rao");
    expect(job.postedById).toBe("profile-1");
    expect(job.applicationsCount).toBe(3);
    expect(job.hasApplied).toBe(true);
  });

  it("maps event card rows with real registration counts", () => {
    const event = mapEventRow(
      {
        id: "event-1",
        title: "Mentorship Evening",
        type: "MENTORSHIP_SESSION",
        starts_at: "2026-06-01T10:00:00.000Z",
        ends_at: null,
        location: "Seminar Hall A",
        description: "Small group mentoring.",
        banner_url: null,
        capacity: 120,
        registrations_count: 27,
        created_by: "profile-2",
        created_by_name: "Priya Menon",
      },
      true,
    );

    expect(event.createdBy).toBe("Priya Menon");
    expect(event.registrations).toBe(27);
    expect(event.hasRsvped).toBe(true);
  });

  it("maps feed rows with joined author and viewer like state", () => {
    const post = mapFeedRow(
      {
        id: "post-1",
        profiles: { full_name: "Dr. Meera Sharma", role: "FACULTY" },
        type: "RESEARCH",
        title: "Research applications open",
        content: "Apply this week.",
        likes_count: 12,
        comments_count: 4,
        created_at: "2026-05-16T00:00:00.000Z",
      },
      true,
    );

    expect(post.authorName).toBe("Dr. Meera Sharma");
    expect(post.authorRole).toBe("FACULTY");
    expect(post.likedByViewer).toBe(true);
  });
});
