import { describe, expect, it } from "vitest";
import { demoProfiles } from "@/lib/demo-data";
import { calculateMentorMatches, scoreMentor } from "@/features/matching/matching";

describe("mentor matching", () => {
  it("prioritizes active mentors with shared department and skills", () => {
    const student = demoProfiles.find((profile) => profile.id === "student-1")!;
    const alumni = demoProfiles.find((profile) => profile.id === "alumni-1")!;

    const result = scoreMentor(student, alumni);

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toContain("Same Department");
    expect(result.reasons).toContain("Open to mentoring");
  });

  it("returns only mentor-capable alumni or faculty profiles", () => {
    const student = demoProfiles.find((profile) => profile.id === "student-1")!;
    const matches = calculateMentorMatches(student, demoProfiles);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((match) => match.profile.mentorshipAvailable)).toBe(true);
    expect(matches.every((match) => ["ALUMNI", "FACULTY"].includes(match.profile.role))).toBe(true);
  });
});
