import { describe, it, expect } from "vitest";
import { toProblem, type ProblemRow } from "../types.js";

describe("toProblem", () => {
  it("maps snake_case row to camelCase type", () => {
    const row: ProblemRow = {
      id: "abc",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["2 <= nums.length"],
      solution: "Use a hash map",
      time_limit_ms: 5000,
      source: "curated",
      source_url: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const result = toProblem(row);
    expect(result.timeLimitMs).toBe(5000);
    expect(result.sourceUrl).toBeNull();
    expect(result.slug).toBe("two-sum");
  });
});
