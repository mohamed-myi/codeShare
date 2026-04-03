import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("../pool.js", () => ({
  pool: {
    query: mockQuery,
  },
}));

import { problemRepository } from "../repositories/problemRepository.js";

describe("problemRepository", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("findAll applies category and difficulty filters and maps list rows", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "problem-1",
          slug: "two-sum",
          title: "Two Sum",
          difficulty: "easy",
          category: "Arrays",
        },
      ],
    });

    const result = await problemRepository.findAll({
      category: "Arrays",
      difficulty: "easy",
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("deleted_at IS NULL"), [
      "Arrays",
      "easy",
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("category = $1"), [
      "Arrays",
      "easy",
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("difficulty = $2"), [
      "Arrays",
      "easy",
    ]);
    expect(result).toEqual([
      {
        id: "problem-1",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        category: "Arrays",
      },
    ]);
  });

  it("findById returns a mapped problem when a row exists", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "problem-1",
          slug: "two-sum",
          title: "Two Sum",
          difficulty: "easy",
          category: "Arrays",
          description: "Given an array...",
          constraints: ["1 <= n <= 10"],
          solution: null,
          time_limit_ms: 5000,
          source: "curated",
          source_url: "https://leetcode.com/problems/two-sum/",
          deleted_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
        },
      ],
    });

    const result = await problemRepository.findById("problem-1");

    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT * FROM problems WHERE id = $1 AND deleted_at IS NULL",
      ["problem-1"],
    );
    expect(result).toEqual({
      id: "problem-1",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      category: "Arrays",
      description: "Given an array...",
      constraints: ["1 <= n <= 10"],
      solution: null,
      timeLimitMs: 5000,
      source: "curated",
      sourceUrl: "https://leetcode.com/problems/two-sum/",
      deletedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("findBySlugIncludingDeleted returns deleted problems", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "problem-1",
          slug: "two-sum",
          title: "Two Sum",
          difficulty: "easy",
          category: "Arrays",
          description: "Given an array...",
          constraints: ["1 <= n <= 10"],
          solution: null,
          time_limit_ms: 5000,
          source: "user_submitted",
          source_url: "https://leetcode.com/problems/two-sum/",
          deleted_at: "2026-01-03T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-03T00:00:00.000Z",
        },
      ],
    });

    const result = await problemRepository.findBySlugIncludingDeleted("two-sum");

    expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM problems WHERE slug = $1", ["two-sum"]);
    expect(result?.deletedAt).toBe("2026-01-03T00:00:00.000Z");
    expect(result?.source).toBe("user_submitted");
  });

  it("softDeleteById updates deleted_at instead of deleting the row", async () => {
    await problemRepository.softDeleteById("problem-1");

    expect(mockQuery).toHaveBeenCalledWith("UPDATE problems SET deleted_at = NOW() WHERE id = $1", [
      "problem-1",
    ]);
  });

  it("deleteById still hard deletes rollback rows", async () => {
    await problemRepository.deleteById("problem-1");

    expect(mockQuery).toHaveBeenCalledWith("DELETE FROM problems WHERE id = $1", ["problem-1"]);
  });

  it("restoreById clears deleted_at", async () => {
    await problemRepository.restoreById("problem-1");

    expect(mockQuery).toHaveBeenCalledWith("UPDATE problems SET deleted_at = NULL WHERE id = $1", [
      "problem-1",
    ]);
  });

  it("summarizeE2eImportedProblems reports only matching imported test rows", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          total_matching_problems: 4,
          active_matching_problems: 3,
          matching_test_cases: 6,
          matching_boilerplates: 3,
          matching_hints: 0,
        },
      ],
    });

    const result = await problemRepository.summarizeE2eImportedProblems();

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("title LIKE 'Imported %'"), [
      ["Imported", "E2E Imported"],
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("category = ANY($1::text[])"), [
      ["Imported", "E2E Imported"],
    ]);
    expect(result).toEqual({
      totalMatchingProblems: 4,
      activeMatchingProblems: 3,
      matchingTestCases: 6,
      matchingBoilerplates: 3,
      matchingHints: 0,
    });
  });

  it("softDeleteE2eImportedProblems only updates active matching rows", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ soft_deleted_problem_count: 5 }],
    });

    const result = await problemRepository.softDeleteE2eImportedProblems();

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE problems"), [
      ["Imported", "E2E Imported"],
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("deleted_at IS NULL"), [
      ["Imported", "E2E Imported"],
    ]);
    expect(result).toEqual({ softDeletedProblemCount: 5 });
  });
});
