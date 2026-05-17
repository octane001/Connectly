import { describe, expect, it } from "vitest";
import { adminInvalidationKeys } from "@/features/admin/admin-queries";

describe("admin page query invalidation", () => {
  it("refreshes queue, analytics, and jobs after admin mutations", () => {
    expect(adminInvalidationKeys).toEqual(["admin-queue", "admin-analytics", "jobs"]);
  });
});
