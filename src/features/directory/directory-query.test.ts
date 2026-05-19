import { describe, expect, it } from "vitest";
import { normalizeDirectoryFilters, paginationRange, profileMatchesFilters } from "@/features/directory/directory-query";
import { demoProfiles } from "@/lib/demo-data";

describe("directory query helpers", () => {
  it("normalizes filters and caps page size for free-tier friendly queries", () => {
    const normalized = normalizeDirectoryFilters({
      search: "  react  ",
      role: "ALL",
      mentorship: "OPEN",
      page: -1,
      pageSize: 200,
    });

    expect(normalized.search).toBe("react");
    expect(normalized.role).toBeUndefined();
    expect(normalized.mentorship).toBe("OPEN");
    expect(normalized.page).toBe(1);
    expect(normalized.pageSize).toBe(30);
  });

  it("computes Supabase range boundaries", () => {
    expect(paginationRange(2, 12)).toEqual({ from: 12, to: 23 });
  });

  it("filters demo profiles with the same semantics as server filters", () => {
    const nisha = demoProfiles.find((profile) => profile.id === "alumni-1")!;

    expect(profileMatchesFilters(nisha, { department: "Computer Science", mentorship: "OPEN", skill: "React" })).toBe(true);
    expect(profileMatchesFilters(nisha, { department: "Mechanical" })).toBe(false);
  });
});
